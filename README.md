# Rentora AI

Rentora AI predicts rent for specific localities in Indian metro cities using real market data and surrounding-area context (proximity to highways, malls, rivers, and hills), and aims to help users find a home that fits their needs and budget through a conversational interface.

## Problem

Finding a temporary home or rental in a new city is hard — rent varies wildly even between nearby localities, and that context (what's around a place, how it compares to its neighborhood) is rarely available in one spot. Rentora AI brings together real rental data and geographic context to give people a realistic, explainable rent estimate for a given area.

## Features

- **Rent prediction** for a given state/city/locality based on real rental market data
- **Geo-aware features**: proximity to highways, malls, rivers, and mountains, derived from OpenStreetMap data
- **Conversational interface** (planned): a chatbot that asks about preferences and helps narrow down an ideal home/stay
- **Feedback loop** (planned): collects user feedback to keep improving predictions

## Tech Stack

| Layer | Tools |
|---|---|
| Data / ML | Python, Pandas, NumPy, Scikit-learn, XGBoost |
| Geospatial | OpenStreetMap Overpass API, Leaflet.js |
| Backend | FastAPI |
| Database | Supabase (PostgreSQL) |
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
└── backend/                         # FastAPI app + Supabase integration
    ├── locality_avg_rent.pkl
    ├── model_columns.pkl
    ├── overall_avg.pkl
    └── scaler.pkl
```

**Note:** `backend/model.pkl` (the trained Random Forest) is not tracked in this repo due to its size (~1.2GB). Run `notebooks/05_model_training.ipynb` end-to-end to regenerate it locally before starting the FastAPI backend.

## Current Status

- [x] Data collection & cleaning (117k+ rows, 8 metro cities)
- [x] Geo-feature extraction (highway/mall/river/mountain proximity)
- [x] EDA & preprocessing
- [x] Model training (Linear Regression → Random Forest → XGBoost) — Random Forest selected
- [ ] FastAPI `/predict` endpoint
- [ ] Supabase (Postgres) integration
- [ ] Chatbot interface

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

## Roadmap

- Stand up the FastAPI backend with a `/predict` endpoint
- Connect Supabase for persistent storage
- Build the chatbot front-end for interactive home search
- Expand beyond the initial 8 metro cities

## Author

**Anisha** — B.Tech CSE (AIML), C.V. Raman Global University
[GitHub](https://github.com/anisha-1811)
