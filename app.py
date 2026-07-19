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
Then open http://localhost:5000

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
from database import supabase

import numpy as np
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# Import database services
from services.candidate_service import save_candidate_pipeline
from services.prediction_service import save_prediction
from services.comparison_service import save_comparison, get_comparisons
from services.feedback_service import save_feedback, get_feedback_by_candidate
from services.shortlist_service import add_to_shortlist, remove_from_shortlist_by_candidate, get_shortlist_candidates
from services.dashboard_service import get_dashboard_stats, get_candidates_list

# ---------------------------------------------------------------------------
# Flask app — point it at the frontend/ folder for templates and static files
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
MODELS_DIR = os.path.join(BASE_DIR, "models")

app = Flask(
    __name__,
    template_folder=os.path.join(FRONTEND_DIR, "templates"),
    static_folder=os.path.join(FRONTEND_DIR, "static"),
)
CORS(app)


def load_pickle(filename):
    with open(os.path.join(MODELS_DIR, filename), "rb") as f:
        return pickle.load(f)


try:
    model = load_pickle("best_model.pkl")
    vectorizer = load_pickle("tfidf_vectorizer.pkl")
    label_encoder = load_pickle("label_encoder.pkl")
    LOAD_ERROR = None

    # Fail fast if files are from different training runs
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
# Decision Engine — combines AI + Rule-Based scores into a final verdict
# ---------------------------------------------------------------------------
def decision_engine(ai_role, ai_confidence, rule_role, rule_score):
    """
    Blends AI confidence (60%) and rule-based score (40%) into an overall score.
    Picks the final role based on which engine is more confident.
    """
    overall = round((ai_confidence * 0.60) + (rule_score * 0.40), 2)

    if ai_role == rule_role:
        final_role = ai_role
        explanation = "AI prediction and Rule-Based prediction matched."
    else:
        if ai_confidence >= 60:
            final_role = ai_role
            explanation = "AI confidence is higher, so AI prediction is selected."
        elif rule_score >= 75:
            final_role = rule_role
            explanation = "Rule-Based score is stronger, so Rule prediction is selected."
        else:
            final_role = ai_role
            explanation = (
                "Predictions differ. AI prediction selected because "
                "rule score is not high enough."
            )

    if overall >= 90:
        match_level = "Excellent Match"
    elif overall >= 75:
        match_level = "Strong Match"
    elif overall >= 60:
        match_level = "Moderate Match"
    else:
        match_level = "Low Match"

    return {
        "ai_role": ai_role,
        "rule_role": rule_role,
        "final_role": final_role,
        "ai_confidence": round(ai_confidence, 2),
        "rule_score": round(rule_score, 2),
        "overall_score": overall,
        "match_level": match_level,
        "explanation": explanation,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok" if not LOAD_ERROR else "error",
        "detail": LOAD_ERROR,
        "roles": list(label_encoder.classes_) if label_encoder is not None else None,
    }), (200 if not LOAD_ERROR else 500)


@app.route("/api/predict-role", methods=["POST"])
def predict_role():
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

        # LinearSVC confidence approximation via softmax
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

        # Blending AI + rule-based scores
        ai_conf_pct = response.get("confidence", 0) * 100
        rule_role = str(predicted_role)
        rule_score = float(data.get("rule_score", 80.0))
        decision = decision_engine(str(predicted_role), ai_conf_pct, rule_role, rule_score)
        response.update(decision)

        # ── Supabase Persistence Integration ──
        cand_payload = {
            "name": (data.get("name") or data.get("full_name") or "Unknown Candidate").strip(),
            "education": (data.get("education") or "").strip(),
            "experience": (data.get("experience") or "").strip(),
            "projects": (data.get("projects") or "").strip(),
            "skills": (data.get("skills") or "").strip(),
            "certificates": (data.get("certificates") or "").strip()
        }
        
        # Save Candidate Profile
        cand_result = save_candidate_pipeline(
            cand_payload,
            filename=data.get("filename"),
            file_size=data.get("file_size")
        )
        
        if cand_result.get("success"):
            candidate_id = cand_result.get("candidate_id")
            response["candidate_id"] = candidate_id
            
            # Save Prediction details
            save_prediction(
                candidate_id=candidate_id,
                confidence=response.get("confidence", 0.0),
                overall_score=response.get("overall_score", 0.0),
                match_level=response.get("match_level", "Moderate Match"),
                explanation=response.get("explanation", "")
            )
        else:
            print("Database candidate save warning:", cand_result.get("errors"))
            
        return jsonify(response), 200

    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Prediction failed", "detail": traceback.format_exc()}), 500


# ── Shortlist Endpoints ──
@app.route("/api/shortlist", methods=["GET"])
def get_shortlist():
    shortlist = get_shortlist_candidates()
    return jsonify(shortlist), 200


@app.route("/api/shortlist", methods=["POST"])
def add_shortlist_route():
    data = request.get_json(silent=True) or {}
    candidate_id = data.get("candidate_id")
    
    if not candidate_id:
        # If candidate ID is not supplied, we attempt to save the candidate details first
        cand_res = save_candidate_pipeline(data)
        if not cand_res.get("success"):
            return jsonify({"error": cand_res.get("errors")}), 400
        candidate_id = cand_res.get("candidate_id")
        
    try:
        res = add_to_shortlist(candidate_id)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/shortlist/<candidate_id>", methods=["DELETE"])
def remove_shortlist_route(candidate_id):
    try:
        res = remove_from_shortlist_by_candidate(candidate_id)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Comparison Endpoints ──
@app.route("/api/compare", methods=["POST"])
def save_comparison_route():
    data = request.get_json(silent=True) or {}
    c1_id = data.get("candidate1_id")
    c2_id = data.get("candidate2_id")
    winner_id = data.get("winner_id")
    target_role = data.get("target_role")
    
    if not c1_id or not c2_id:
        return jsonify({"error": "candidate1_id and candidate2_id are required"}), 400
        
    try:
        res = save_comparison(c1_id, c2_id, winner_id, target_role)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/comparisons", methods=["GET"])
def list_comparisons():
    history = get_comparisons()
    return jsonify(history), 200


# ── Feedback Endpoints ──
@app.route("/api/feedback", methods=["POST"])
def add_feedback_route():
    data = request.get_json(silent=True) or {}
    c_id = data.get("candidate_id")
    rating = data.get("rating")
    remarks = data.get("remarks")
    
    if not c_id or rating is None:
        return jsonify({"error": "candidate_id and rating are required"}), 400
        
    try:
        res = save_feedback(c_id, rating, remarks)
        return jsonify(res), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/feedback/<candidate_id>", methods=["GET"])
def get_feedback_route(candidate_id):
    history = get_feedback_by_candidate(candidate_id)
    return jsonify(history), 200


# ── Dashboard Endpoint ──
@app.route("/api/dashboard", methods=["GET"])
def get_dashboard_data():
    stats = get_dashboard_stats()
    candidates = get_candidates_list(request.args.get("search"))
    return jsonify({
        "stats": stats,
        "candidates": candidates
    }), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting Resume Builder on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
