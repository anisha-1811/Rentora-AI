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

### 🔗 [**Live demo → rentora-ai-seven.vercel.app**](https://rentora-ai-seven.vercel.app)

</div>

---

## At a glance

| | |
|---|---|
| **Dataset** | 117,000+ cleaned, geocoded rental listings across 8 Indian metro cities |
| **Model accuracy** | R² = 0.848 · MAE ₹12,330 · RMSE ₹38,086 (Random Forest) |
| **Model size** | Shrunk from 1.2GB → 140MB with a re-tuned Random Forest — *and* a higher R² than the original |
| **Conversation memory** | Fields persist across unlimited chat turns — no re-asking for what you already said |
| **Infra cost** | ₹0/month — Render, Vercel, Supabase, Hugging Face, and Gemini free tiers |
| **Stack depth** | ML pipeline → LLM-powered NLU → REST API → auth → live map → deployed full-stack app |

> **You:** "2BHK in Andheri West, Mumbai, 1000 sqft" → **Rentora:** asks for furnishing & bathrooms → **You:** "Semi-Furnished, 2 bathrooms" → **Rentora:** ₹66,975/month, pinned on a live map — in 2 messages, nothing repeated.

## Features

- 💬 **Conversational rent prediction with real memory** — natural language in, structured extraction via Gemini, fields merged across turns
- 📊 **Rent prediction** across 8 metro cities, powered by a Random Forest trained on 117k+ real listings
- 🗺️ **Geo-aware features** — highway/mall/river/mountain proximity, computed from OpenStreetMap
- 🔐 **Firebase Authentication** — Email/Password + Google sign-in
- 🧭 **Interactive Leaflet map** — every prediction is pinned to its exact locality
- ⭐ **Feedback loop** — 1–5 star ratings + comments, persisted to Postgres
- ☁️ **Deployed end-to-end** — live backend, frontend, database, and model hosting, zero paid infrastructure

## Tech Stack

| Layer | Tools |
|---|---|
| ML | Python, Pandas, NumPy, Scikit-learn, XGBoost |
| Conversational AI | Google Gemini API (`gemini-3.6-flash`) |
| Geospatial | OpenStreetMap Overpass API, Leaflet.js |
| Backend | FastAPI, psycopg2 |
| Auth | Firebase Authentication |
| Database | Supabase (PostgreSQL) |
| Frontend | React (Vite), React Router |
| Hosting | Render · Vercel · Hugging Face Hub |

## Architecture

```
Firebase Auth ── React (Vite) ── Vercel
                       │  HTTPS
                       ▼
                FastAPI ── Render
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  Hugging Face      Gemini API     Supabase
 (model weights)    (chat NLU)    (Postgres)
```

**Request flow:** message → Gemini extracts fields → merged with everything known so far in the conversation → missing fields trigger a follow-up question → complete fields hit the Random Forest → prediction + map coordinates → logged to Supabase → shown with a feedback prompt.

<details>
<summary><strong>Model comparison</strong></summary>

| Model | RMSE | MAE | R² |
|---|---|---|---|
| Linear Regression | ₹1,26,162+ | — | negative |
| Random Forest (v1) | ₹38,862.74 | ₹12,603.33 | 0.8421 |
| XGBoost (tuned) | ₹39,089–39,253 | ₹12,462–12,819 | 0.8389–0.8402 |
| **Random Forest (deployed)** | **₹38,085.85** | **₹12,329.68** | **0.8483** |

Random Forest won on both accuracy and interpretability — tree ensembles natively capture multiplicative interactions (locality prestige × size) that Linear Regression's multicollinear location features couldn't. `locality_encoded` + `size_sqft` account for ~83% of feature importance. The deployed model was re-tuned (`max_depth=18`, `min_samples_leaf=3`) to cut file size 8.5x for deployment — which also *reduced overfitting* and improved R² over the original.

</details>

## Project Structure

```
Rentora-AI/
├── notebooks/          # geo-features → EDA/preprocessing → model training
├── data/                # 117k+ cleaned, geocoded listings + locality→coords lookup
├── backend/             # FastAPI: /chat, /predict, /feedback
└── frontend/            # React (Vite): auth, chat UI, map, feedback widget
```

`backend/model.pkl` isn't tracked in Git — it's hosted on [Hugging Face Hub](https://huggingface.co/anisha-1811/rentora-ai-model) and downloaded automatically on backend startup.

## Run it locally

```bash
git clone https://github.com/anisha-1811/Rentora-AI.git
cd Rentora-AI
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Run `notebooks/05_model_training.ipynb` to generate `model.pkl`, or skip it — the deployed backend pulls it from Hugging Face automatically.

```bash
cd frontend && npm install && npm run dev
```

`backend/.env` needs `DATABASE_URL` and `GEMINI_API_KEY`.

## Roadmap

- Link predictions/feedback to authenticated users for personal history
- Multimodal image Q&A for property photos
- Expand beyond the initial 8 metro cities

---

<div align="center">

**Anisha** — B.Tech CSE (AIML), C.V. Raman Global University
[GitHub](https://github.com/anisha-1811) · [Live demo](https://rentora-ai-seven.vercel.app)

</div>
