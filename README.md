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
- Geo-features (highway/mall/river/mountain proximity) computed per locality via the Overpass API
- Target variable modeled as `log_rent` for training, converted back to raw rent for predictions

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
```

## Current Status

- [x] Data collection & cleaning (117k+ rows, 8 metro cities)
- [x] Geo-feature extraction (highway/mall/river/mountain proximity)
- [x] EDA & preprocessing
- [ ] Model training (Linear Regression → Random Forest → XGBoost)
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

Notebooks can be run in order from the `notebooks/` folder to reproduce the data pipeline.

## Roadmap

- Finish baseline model comparison and pick the best performer
- Stand up the FastAPI backend with a `/predict` endpoint
- Connect Supabase for persistent storage
- Build the chatbot front-end for interactive home search
- Expand beyond the initial 8 metro cities

## Author

**Anisha** — B.Tech CSE (AIML), C.V. Raman Global University
[GitHub](https://github.com/anisha-1811)
