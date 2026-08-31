# Rentora AI

Rentora AI predicts rent for specific localities in Indian metro cities using real market data and surrounding-area context (proximity to highways, malls, rivers, and hills), and aims to help users find a home that fits their needs and budget through a conversational interface.

## Problem

Finding a temporary home or rental in a new city is hard — rent varies wildly even between nearby localities, and that context (what's around a place, how it compares to its neighborhood) is rarely available in one spot. Rentora AI brings together real rental data and geographic context to give people a realistic, explainable rent estimate for a given area.

## Features

- **Rent prediction** for a given state/city/locality based on real rental market data
- **Geo-aware features**: proximity to highways, malls, rivers, and mountains, derived from OpenStreetMap data
- **User authentication** via Firebase (Email/Password + Google sign-in)
- **Prediction history logging** — every prediction request is stored in Supabase for future analysis and feedback
- **Conversational interface** (planned): a chatbot that asks about preferences and helps narrow down an ideal home/stay
- **Feedback loop** (planned): collects user feedback to keep improving predictions
- **Interactive map view** (planned): Leaflet.js visualization of predicted locations

## Tech Stack

| Layer | Tools |
|---|---|
| Data / ML | Python, Pandas, NumPy, Scikit-learn, XGBoost |
| Geospatial | OpenStreetMap Overpass API, Leaflet.js |
| Backend | FastAPI, psycopg2 |
| Auth | Firebase Authentication |
| Database | Supabase (PostgreSQL) |
| Frontend | React (Vite), React Router |
| Notebooks | Jupyter (VS Code, venv) |

No paid APIs or services are used — Leaflet.js + OpenStreetMap were chosen over Google Maps specifically to keep this a zero-budget project.

## Data

- Real rental data scraped from Makaan.com and other public rental listings, covering 8 major Indian metro cities
- ~117,000+ cleaned, deduplicated, and geocoded listings
- Geo-features (highway/mall/river/mountain proximity) computed per locality via the Overpass API, then recalibrated from raw distance to threshold-based booleans for use in both the model and the planned chatbot
- Target variable modeled as `log_rent` for training, converted back to raw rent for predictions

## Model Training

Three models were compared on the cleaned, geo-tagged dataset:

| Model | RMSE | MAE | R² |
|---|---|---|---|
| Linear Regression | ₹1,26,162+ (14% predictions off 2x+) | — | negative |
| **Random Forest** | **₹38,862.74** | **₹12,603.33** | **0.8421** |
| XGBoost (tuned) | ₹39,089–39,253 | ₹12,462–12,819 | 0.8389–0.8402 |

**Random Forest was selected as the final model.** Linear Regression underperformed due to multicollinearity between location features (latitude/longitude/city dummies) and a structural inability to capture multiplicative interactions (e.g. locality prestige × property size) — issues tree-based models handle natively. `locality_encoded` (target-encoded average rent per locality) and `size_sqft` together account for ~83% of the Random Forest's feature importance, closely matching real-world rent drivers.

## Backend

FastAPI serves a `/predict` endpoint that:
- Target-encodes the requested locality using a saved training-time lookup
- Scales numeric inputs with a saved `StandardScaler`
- One-hot encodes furnishing status
- Runs the Random Forest model and converts the log-scale prediction back to raw rent
- Logs every prediction (inputs + result) to a Supabase `predictions` table

CORS is enabled for the local Vite dev server during development.

## Frontend

A React (Vite) single-page app with:
- Firebase Authentication (Email/Password + Google sign-in) via a shared `AuthContext`
- Protected routes — the prediction form is only accessible when logged in
- A rent prediction form that calls the FastAPI `/predict` endpoint and displays the result

## Database

Supabase (PostgreSQL) with Row Level Security enabled on all tables:
- `predictions` — every prediction request and result, for history and future analysis
- `feedback` — structure in place for the planned user feedback loop

## Project Structure

```
Rentora-AI/
├── notebooks/
│   ├── 03_geo_features.ipynb        # Overpass-based geo-feature extraction
│   ├── 04_eda_preprocessing.ipynb   # cleaning, EDA, feature recalibration
│   └── 05_model_training.ipynb      # Linear Regression → Random Forest → XGBoost
├── data/
│   ├── rentora_final_week1.csv
│   └── rentora_eda_final.csv
├── backend/                         # FastAPI app + Supabase integration
│   ├── app.py
│   ├── locality_avg_rent.pkl
│   ├── model_columns.pkl
│   ├── overall_avg.pkl
│   └── scaler.pkl
└── frontend/                        # React (Vite) app
    ├── src/
    │   ├── context/AuthContext.jsx
    │   ├── pages/Login.jsx
    │   ├── pages/Signup.jsx
    │   ├── pages/Home.jsx
    │   └── firebaseConfig.js
    └── ...
```

**Note:** `backend/model.pkl` (the trained Random Forest) is not tracked in this repo due to its size (~1.2GB). Run `notebooks/05_model_training.ipynb` end-to-end to regenerate it locally before starting the FastAPI backend.

## Current Status

- [x] Data collection & cleaning (117k+ rows, 8 metro cities)
- [x] Geo-feature extraction (highway/mall/river/mountain proximity)
- [x] EDA & preprocessing
- [x] Model training (Linear Regression → Random Forest → XGBoost) — Random Forest selected
- [x] FastAPI `/predict` endpoint
- [x] Supabase (Postgres) integration — schema + prediction logging
- [x] Firebase Authentication (Email/Password + Google)
- [x] React frontend with protected routes and prediction form
- [ ] Leaflet.js map view for predicted locations
- [ ] Chatbot interface
- [ ] Deployment (backend + frontend)

This is an active work-in-progress, built as a solo major project.

## Getting Started

```bash
git clone https://github.com/anisha-1811/Rentora-AI.git
cd Rentora-AI
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Notebooks can be run in order from the `notebooks/` folder to reproduce the data pipeline. Run `notebooks/05_model_training.ipynb` fully to generate `backend/model.pkl` before running the FastAPI app.

For the frontend:
```bash
cd frontend
npm install
npm run dev
```

## Roadmap

- Add Leaflet.js map visualization for predicted locations
- Build the chatbot front-end for interactive home search
- Deploy backend (Render/Railway) and frontend (Vercel)
- Expand beyond the initial 8 metro cities

## Author

**Anisha** — B.Tech CSE (AIML), C.V. Raman Global University
[GitHub](https://github.com/anisha-1811)
