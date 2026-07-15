# Resume Builder — Role Prediction App

An AI-powered Resume Builder that predicts the most suitable job role based on resume fields using Machine Learning.

## 🚀 Features

- Predicts best-fit job role from resume fields (Education, Experience, Projects, Skills, Certificates)
- Uses **LinearSVC** model with **~69% test accuracy**
- TF-IDF vectorizer with bigrams for text feature extraction
- REST API backend with Flask
- Clean, modern frontend UI

## 🗂️ Project Structure

```
resume-builder/
├── app.py                        ← Flask backend (entry point)
├── models/
│   ├── best_model.pkl            ← Trained LinearSVC model
│   ├── tfidf_vectorizer.pkl      ← TF-IDF vectorizer
│   └── label_encoder.pkl         ← Label encoder (14 job roles)
├── frontend/
│   ├── templates/
│   │   └── index.html            ← Main UI page
│   └── static/
│       ├── css/style.css         ← Styles
│       └── js/script.js          ← Frontend logic
└── database/
    ├── app (7).py                ← Original app (reference)
    ├── Module3_Data_Preprocessing.ipynb
    ├── module4_EDA.ipynb
    ├── module5_feture engineering.ipynb
    ├── model6_model trainning.ipynb
    └── *.csv / *.xlsx            ← Dataset files
```

## ⚙️ Setup & Run

### 1. Install dependencies
```bash
pip install flask flask-cors scikit-learn numpy
```

### 2. Run the app
```bash
python app.py
```

### 3. Open in browser
```
http://localhost:5000
```

## 🔌 API Endpoints

### `GET /api/health`
Returns backend status and available roles.

### `POST /api/predict-role`
**Body:**
```json
{
  "education": "B.TECH",
  "experience": "Fresher",
  "projects": "Rice Recommendation (Random Forest), Car Sales Dashboard",
  "skills": "Python, SQL, Power BI",
  "certificates": "Data Science & AI (IT Vedant)"
}
```
**Response:**
```json
{
  "predicted_role": "Data Analyst",
  "confidence": 0.72,
  "top_roles": [
    {"role": "Data Analyst", "score": 0.72},
    {"role": "Back-end Developer", "score": 0.15},
    {"role": "ML Engineer", "score": 0.08}
  ]
}
```

## 🤖 ML Pipeline

- **Text preprocessing**: Lowercase → strip URLs → keep letters only → collapse whitespace
- **Feature engineering**: `Combined_Text = Resume_Text + Skills + Projects + Education + Experience + Certificates`
- **Vectorizer**: TfidfVectorizer (stop_words='english', ngram_range=(1,2), min_df=1, max_df=0.95, sublinear_tf=True)
- **Model**: LinearSVC — 69.09% test accuracy across 14 job role classes

## 📊 Supported Job Roles (14 Classes)

Predicted roles include roles like Back-end Developer, Data Analyst, ML Engineer, Frontend Developer, and more.

---

*Built with Flask · scikit-learn · Vanilla JS*
