<div align="center">

# 🏠 Rentora AI

**AI-powered rent prediction for Indian metro cities — through a conversation, not a form.**

![Status](https://img.shields.io/badge/status-live-2ECC71)
![Python](https://img.shields.io/badge/python-3.13-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-3.6--flash-8E75B2?logo=googlegemini&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![Budget](https://img.shields.io/badge/budget-%E2%82%B90-lightgrey)

### 🔗 [**Try it live → rentora-ai-seven.vercel.app**](https://rentora-ai-seven.vercel.app)

</div>

---

## What it does

Finding a temporary home or rental in a new city is hard — rent varies wildly even between nearby localities, and the context that explains *why* (what's around a place, how it compares to its neighborhood) is rarely available in one spot.

Rentora AI brings together real rental market data, geographic context, and a conversational AI layer so you can just **describe what you're looking for** — like you would to a friend, across as many messages as it takes — and get a realistic, explainable rent estimate on a map.

> **You:** "2BHK in Andheri West, Mumbai, 1000 sqft"
> **Rentora:** "Could you also share your preferred furnishing and the number of bathrooms?"
> **You:** "Semi-Furnished, 2 bathrooms"
> **Rentora:** → ₹66,974.81/month, pinned on a live map, with sources kept from every earlier message in the conversation.

## Quick nav

- [Live demo](#-try-it-live--rentora-ai-sevenvercelapp)
- [Features](#features)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Model performance](#model-training)
- [Architecture & deployment](#architecture--deployment)
- [Project structure](#project-structure)
- [Current status](#current-status)
- [Getting started](#getting-started)
- [Roadmap](#roadmap)

---

## Features

- 💬 **Conversational rent prediction, with real memory** — describe what you want across multiple messages; Rentora holds onto every detail you've already given and only asks about what's still missing
- 📊 **Rent prediction** for any locality across 8 major Indian metro cities, based on real market data
- 🗺️ **Geo-aware features**: proximity to highways, malls, rivers, and mountains, derived from OpenStreetMap
- 🔐 **User authentication** via Firebase (Email/Password + Google sign-in)
- 🧭 **Interactive map** — Leaflet.js marker + popup showing exactly where your predicted rent applies
- ⭐ **Feedback loop** — rate any prediction 1–5 stars with an optional comment, saved straight to the database
- 🗃️ **Prediction history logging** — every prediction and every piece of feedback is stored in Supabase
- ☁️ **Fully deployed, zero paid infrastructure** — live backend, live frontend, live database, live model hosting, all on free tiers

## Tech Stack

| Layer | Tools |
|---|---|
| Data / ML | Python, Pandas, NumPy, Scikit-learn, XGBoost |
| Conversational AI | Google Gemini API (`gemini-3.6-flash`) |
| Geospatial | OpenStreetMap Overpass API, Leaflet.js |
| Backend | FastAPI, psycopg2 |
| Auth | Firebase Authentication |
| Database | Supabase (PostgreSQL) |
| Frontend | React (Vite), React Router |
| Hosting | Render (backend), Vercel (frontend), Hugging Face Hub (model weights) |
| Notebooks | Jupyter (VS Code, venv) |

No paid APIs or services are used anywhere in the stack, deployment included — Leaflet.js + OpenStreetMap over Google Maps, Gemini's free tier over paid LLM APIs, Render/Vercel/Hugging Face free tiers over paid hosting. This stays a zero-budget project end to end.

## How it works

```
  You type naturally, across as many messages as you need
        │
        ▼
 ┌─────────────────┐      extracts whatever's in THIS
 │   Gemini API     │ ───► message — city, locality, bhk,
 │  (/chat)         │      size, furnishing, bathrooms...
 └────────┬─────────┘
          │
          ▼
   merged with everything already known from earlier
   messages in the conversation
          │
          │ still missing a field?
          ▼                       all fields present
 asks a follow-up question  ───────────────┐
                                            ▼
                                  ┌──────────────────┐
                                  │  Random Forest    │
                                  │  model (/predict)  │
                                  └────────┬───────────┘
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
              predicted rent      lat/lon lookup         logged to Supabase
                     │                     │
                     └──────────┬──────────┘
                                ▼
                   shown to you on a Leaflet map,
                   with a star-rating feedback prompt
```

<details>
<summary><strong>See the model comparison behind the prediction</strong></summary>

<a id="model-training"></a>

Three models were compared on the cleaned, geo-tagged dataset:

| Model | RMSE | MAE | R² |
|---|---|---|---|
| Linear Regression | ₹1,26,162+ (14% predictions off 2x+) | — | negative |
| Random Forest (v1) | ₹38,862.74 | ₹12,603.33 | 0.8421 |
| XGBoost (tuned) | ₹39,089–39,253 | ₹12,462–12,819 | 0.8389–0.8402 |
| **Random Forest (deployed, tuned depth)** | **₹38,085.85** | **₹12,329.68** | **0.8483** |

**Random Forest was selected as the final model**, and later re-tuned (`max_depth=18`, `min_samples_leaf=3`, `n_estimators=100`) to shrink the serialized model from ~1.2GB to ~140MB for deployment — a change that *also* improved accuracy over the original, by reducing overfitting. Linear Regression underperformed due to multicollinearity between location features (latitude/longitude/city dummies) and a structural inability to capture multiplicative interactions (e.g. locality prestige × property size) — issues tree-based models handle natively. `locality_encoded` (target-encoded average rent per locality) and `size_sqft` together account for ~83% of the Random Forest's feature importance, closely matching real-world rent drivers.

</details>

<details>
<summary><strong>See the data behind the model</strong></summary>

- Real rental data scraped from Makaan.com and other public rental listings, covering 8 major Indian metro cities
- ~117,000+ cleaned, deduplicated, and geocoded listings
- Geo-features (highway/mall/river/mountain proximity) computed per locality via the Overpass API, then recalibrated from raw distance to threshold-based booleans
- Target variable modeled as `log_rent` for training, converted back to raw rent for predictions

</details>

## Backend

FastAPI serves three endpoints:

- **`/chat`** — takes a free-text message plus a running `known_fields` object (everything gathered so far in the conversation), sends the message to Gemini for structured field extraction, merges the newly extracted fields into what's already known, asks a follow-up question if anything's still missing, and otherwise calls `/predict` internally and returns a conversational reply alongside the prediction
- **`/predict`** — takes structured rental details, target-encodes the locality, scales numeric inputs, one-hot encodes furnishing, runs the Random Forest model, converts the log-scale prediction back to raw rent, looks up map coordinates, and logs everything to Supabase
- **`/feedback`** — takes a prediction ID, a 1–5 rating, and an optional comment, and saves it to Supabase linked back to the original prediction

The model file (`model.pkl`) is hosted on Hugging Face Hub and downloaded automatically on server startup, keeping the Git repo lightweight while still shipping the full trained model.

## Frontend

A React (Vite) single-page app with:
- Firebase Authentication (Email/Password + Google sign-in) via a shared `AuthContext`
- Protected routes — the app is only accessible when logged in
- A conversational chat interface that tracks the conversation's state client-side and sends it back with every message, so the bot never forgets what you've already told it
- A Leaflet map showing the predicted location on every result
- An inline star-rating feedback widget on every prediction card

## Database

Supabase (PostgreSQL) with Row Level Security enabled on all tables:
- `predictions` — every prediction request and result (including lat/lon), for history and future analysis
- `feedback` — every star rating and comment, linked to its originating prediction

## Architecture & Deployment

```
 Firebase Auth ──── React (Vite) frontend ──── Vercel
                            │
                            │  HTTPS
                            ▼
                    FastAPI backend ──── Render
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       Hugging Face    Gemini API     Supabase
      (model weights)   (chat NLU)   (Postgres)
```

- **Frontend** deploys to Vercel directly from the `frontend/` directory on every push to `main`
- **Backend** deploys to Render from `backend/`, downloading `model.pkl` from Hugging Face Hub on cold start
- **CORS** is scoped to the live Vercel domain (plus localhost for development)
- **Firebase Authorized Domains** includes the production Vercel URL so Google Sign-In works in production, not just locally

## Project Structure

```
Rentora-AI/
├── notebooks/
│   ├── 03_geo_features.ipynb        # Overpass-based geo-feature extraction
│   ├── 04_eda_preprocessing.ipynb   # cleaning, EDA, feature recalibration
│   └── 05_model_training.ipynb      # Linear Regression → Random Forest → XGBoost
├── data/
│   ├── rentora_final_week1.csv
│   ├── rentora_eda_final.csv
│   └── geocoded_localities.csv      # locality → lat/lon lookup for the map
├── backend/                         # FastAPI app + Supabase + Gemini integration
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
    │   ├── pages/Home.jsx            # chat UI, map, feedback widget
    │   └── firebaseConfig.js
    └── ...
```

**Note:** `backend/model.pkl` is not tracked in this repo — it's hosted on [Hugging Face Hub](https://huggingface.co/anisha-1811/rentora-ai-model) instead, and downloaded automatically the first time the backend starts. To regenerate it yourself, run `notebooks/05_model_training.ipynb` end-to-end.

## Current Status

- [x] Data collection & cleaning (117k+ rows, 8 metro cities)
- [x] Geo-feature extraction (highway/mall/river/mountain proximity)
- [x] EDA & preprocessing
- [x] Model training (Linear Regression → Random Forest → XGBoost) — Random Forest selected
- [x] Model re-tuned and shrunk for deployment (1.2GB → ~140MB, with improved R²)
- [x] FastAPI `/predict` endpoint
- [x] Supabase (Postgres) integration — schema + prediction logging
- [x] Firebase Authentication (Email/Password + Google)
- [x] React frontend with protected routes
- [x] Leaflet.js map view for predicted locations
- [x] Gemini-powered `/chat` endpoint — structured extraction from natural language
- [x] Multi-turn conversation memory — fields persist across messages instead of resetting each turn
- [x] Chat interface in the frontend
- [x] Feedback loop — star ratings + comments, saved to Supabase
- [x] Deployment — backend on Render, frontend on Vercel, model on Hugging Face Hub

**Rentora AI is live and fully functional end to end.** Ongoing polish and the items below are tracked in the roadmap.

## Getting Started

Want to run it locally instead of using the [live demo](https://rentora-ai-seven.vercel.app)?

```bash
git clone https://github.com/anisha-1811/Rentora-AI.git
cd Rentora-AI
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Notebooks can be run in order from the `notebooks/` folder to reproduce the data pipeline. Run `notebooks/05_model_training.ipynb` fully to generate `backend/model.pkl` before running the FastAPI app locally — or skip this and let the deployed backend download it from Hugging Face automatically.

<details>
<summary><strong>Backend environment variables</strong></summary>

Create `backend/.env` with:
```
DATABASE_URL=your_supabase_connection_string
GEMINI_API_KEY=your_gemini_api_key
```

</details>

For the frontend:
```bash
cd frontend
npm install
npm run dev
```

## Roadmap

- Link predictions and feedback to the authenticated user, for personal history and per-user insights
- Add multimodal image Q&A (Gemini) for property photos
- Expand beyond the initial 8 metro cities
- Custom domain for the live app

---

<div align="center">

## Author

**Anisha** — B.Tech CSE (AIML), C.V. Raman Global University
[GitHub](https://github.com/anisha-1811) · [Live demo](https://rentora-ai-seven.vercel.app)

</div>
