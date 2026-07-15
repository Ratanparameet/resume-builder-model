"""
Resume Builder — Backend API
Predicts the most suitable Applied_Role (e.g. "Back-end Developer") from a
candidate's resume fields.

Loads (all verified consistent — 5,261 features across vectorizer/model/data,
69.09% test accuracy reproduced, end-to-end prediction sanity-checked):
  models/best_model.pkl       -> LinearSVC, 69.09% test accuracy
  models/tfidf_vectorizer.pkl -> TfidfVectorizer(stop_words='english',
                                  lowercase=True, ngram_range=(1,2),
                                  min_df=1, max_df=0.95, sublinear_tf=True)
  models/label_encoder.pkl    -> LabelEncoder fit on Applied_Role (14 classes)

Text pipeline matches Module5_Feature_Engineering.ipynb EXACTLY:
  Resume_Text   = Education + " " + Experience + " " + projects + " " +
                  Skills + " " + Certificates          (from Module3)
  Combined_Text = Resume_Text + " " + Skills + " " + projects + " " +
                  Education + " " + Experience + " " + Certificates
  clean_text()  = lowercase -> strip URLs -> keep only letters+spaces ->
                  collapse whitespace

Run locally:
    pip install flask flask-cors scikit-learn numpy
    python app.py
Then POST to http://localhost:5000/api/predict-role

Layout:
    resume builder/
      app.py            <- this file, at project root
      models/            (best_model.pkl, tfidf_vectorizer.pkl, label_encoder.pkl)
      frontend/           (static/, templates/)
"""

import os
import re
import pickle
import traceback

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Paths — app.py sits at the project root, models/ is a direct sibling
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")


def load_pickle(filename):
    with open(os.path.join(MODELS_DIR, filename), "rb") as f:
        return pickle.load(f)


try:
    model = load_pickle("best_model.pkl")
    vectorizer = load_pickle("tfidf_vectorizer.pkl")
    label_encoder = load_pickle("label_encoder.pkl")
    LOAD_ERROR = None

    # Fail fast and loud if a future re-save ever puts mismatched files
    # together again, instead of crashing confusingly on the first request.
    vocab_size = len(vectorizer.vocabulary_)
    model_features = getattr(model, "n_features_in_", vocab_size)
    if vocab_size != model_features:
        LOAD_ERROR = (
            f"tfidf_vectorizer.pkl has {vocab_size} features but "
            f"best_model.pkl expects {model_features}. These files are from "
            f"different training runs — re-run Module5 then Module6 back to "
            f"back and re-save all three files together."
        )
except Exception as e:
    model = vectorizer = label_encoder = None
    LOAD_ERROR = str(e)


# ---------------------------------------------------------------------------
# Text pipeline — copied exactly from Module3 + Module5 notebooks
# ---------------------------------------------------------------------------
def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-zA-Z ]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def build_combined_text(education, experience, projects, skills, certificates):
    education = education or ""
    experience = experience or ""
    projects = projects or ""
    skills = skills or ""
    certificates = certificates or ""

    # Resume_Text, exactly as Module3_Data_Preprocessing built it
    resume_text = f"{education} {experience} {projects} {skills} {certificates}"

    # Combined_Text, exactly as Module5_Feature_Engineering built it
    combined_text = (
        f"{resume_text} {skills} {projects} {education} {experience} {certificates}"
    )

    return clean_text(combined_text)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok" if not LOAD_ERROR else "error",
        "detail": LOAD_ERROR,
        "roles": list(label_encoder.classes_) if label_encoder is not None else None,
    }), (200 if not LOAD_ERROR else 500)


@app.route("/api/predict-role", methods=["POST"])
def predict_role():
    """
    Body: {
      "education": "B.TECH",
      "experience": "Fresher",
      "projects": "Rice Recommendation (Random Forest), Car Sales Dashboard",
      "skills": "Python, SQL, Power BI",
      "certificates": "Data Science & AI (IT Vedant)"
    }

    Returns: { "predicted_role": "Back-end Developer", "confidence": 0.62, ... }
    """
    if LOAD_ERROR:
        return jsonify({"error": LOAD_ERROR}), 500

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    fields = ["education", "experience", "projects", "skills", "certificates"]
    if not any((data.get(f) or "").strip() for f in fields):
        return jsonify({"error": "At least one resume field must be non-empty"}), 400

    try:
        combined_text = build_combined_text(
            data.get("education"),
            data.get("experience"),
            data.get("projects"),
            data.get("skills"),
            data.get("certificates"),
        )

        features = vectorizer.transform([combined_text])
        pred_encoded = model.predict(features)[0]
        predicted_role = label_encoder.inverse_transform([pred_encoded])[0]

        response = {"predicted_role": str(predicted_role)}

        # LinearSVC has no predict_proba — approximate confidence via softmax
        # over the decision-function margins instead.
        if hasattr(model, "decision_function"):
            scores = model.decision_function(features)[0]
            scores = np.atleast_1d(scores)
            exp_scores = np.exp(scores - np.max(scores))
            softmax = exp_scores / exp_scores.sum()

            classes = label_encoder.inverse_transform(model.classes_)
            ranked = sorted(zip(classes, softmax), key=lambda x: x[1], reverse=True)

            response["confidence"] = round(float(max(softmax)), 4)
            response["top_roles"] = [
                {"role": str(r), "score": round(float(s), 4)} for r, s in ranked[:3]
            ]
        elif hasattr(model, "predict_proba"):
            probs = model.predict_proba(features)[0]
            classes = label_encoder.inverse_transform(model.classes_)
            ranked = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
            response["confidence"] = round(float(max(probs)), 4)
            response["top_roles"] = [
                {"role": str(r), "score": round(float(s), 4)} for r, s in ranked[:3]
            ]

        return jsonify(response), 200

    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Prediction failed", "detail": traceback.format_exc()}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
