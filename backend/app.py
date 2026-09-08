import joblib
import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv
import os
import json
import requests
import google.generativeai as genai
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-3.6-flash")

app = FastAPI(title="Rentora AI - Rent Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://rentora-ai-seven.vercel.app"],  # your Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Download model.pkl from Hugging Face if it isn't present locally.
# This lets us deploy without committing a 1.2GB file to GitHub —
# locally, model.pkl already exists in backend/, so this block
# is skipped entirely and nothing changes about how you run it.
# ============================================================
MODEL_URL = "https://huggingface.co/anisha-1811/rentora-ai-model/resolve/main/model.pkl?download=true"
MODEL_PATH = "model.pkl"

if not os.path.exists(MODEL_PATH):
    print("model.pkl not found locally — downloading from Hugging Face...")
    response = requests.get(MODEL_URL, stream=True)
    response.raise_for_status()
    with open(MODEL_PATH, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print("Model downloaded successfully.")

# Load all saved artifacts once, at startup
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")
locality_avg_rent = joblib.load("locality_avg_rent.pkl")
overall_avg = joblib.load("overall_avg.pkl")
model_columns = joblib.load("model_columns.pkl")

# Load locality -> coordinates lookup for the map
# Assumes uvicorn is run from inside backend/, so ../data reaches the repo-root data folder
geo_df = pd.read_csv("../data/geocoded_localities.csv")
geo_lookup = {
    (row["city"], row["locality"]): (row["geo_lat"], row["geo_lon"])
    for _, row in geo_df.iterrows()
}


class RentRequest(BaseModel):
    city: str
    locality: str
    bhk: int
    size_sqft: float
    furnishing: str          # "Furnished", "Semi-Furnished", or "Unfurnished"
    bathrooms: int
    near_highway: int        # 0 or 1
    near_mall: int
    near_river: int
    near_mountain: int
    user_id: Optional[str] = None    # Firebase UID of the logged-in user, if any


class ChatRequest(BaseModel):
    message: str
    known_fields: Optional[dict] = None   # running state of fields gathered across turns
    user_id: Optional[str] = None         # Firebase UID of the logged-in user, if any


class FeedbackRequest(BaseModel):
    prediction_id: str
    rating: int              # 1-5
    comment: Optional[str] = None
    user_id: Optional[str] = None    # Firebase UID of the logged-in user, if any


def log_prediction(request: RentRequest, predicted_rent: float, lat, lon):
    """Inserts a prediction row and returns its id (or None if logging failed)."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO predictions
                (state, place, size_sqft, near_highway, near_mall, river_view, mountain_facing, latitude, longitude, predicted_rent, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                request.city,
                request.locality,
                request.size_sqft,
                bool(request.near_highway),
                bool(request.near_mall),
                bool(request.near_river),
                bool(request.near_mountain),
                lat,
                lon,
                predicted_rent,
                request.user_id
            )
        )
        prediction_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()
        return str(prediction_id)
    except Exception as e:
        print("Failed to log prediction:", e)
        return None


def save_feedback(prediction_id: str, rating: int, comment: Optional[str], user_id: Optional[str]):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO feedback (prediction_id, rating, comment, user_id)
            VALUES (%s, %s, %s, %s)
            """,
            (prediction_id, rating, comment, user_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print("Failed to save feedback:", e)
        return False


@app.post("/predict")
def predict_rent(request: RentRequest):
    # Step 1: target-encode locality using the saved training-time lookup
    locality_encoded = locality_avg_rent.get(request.locality, overall_avg)

    # Step 2: scale numeric columns — scaler expects 6 columns including lat/lon,
    # even though we drop lat/lon right after (matches the notebook's pipeline)
    numeric_input = pd.DataFrame([{
        "bhk": request.bhk,
        "size_sqft": request.size_sqft,
        "bathrooms": request.bathrooms,
        "latitude": 0,     # dummy value — dropped after scaling, never used by the model
        "longitude": 0,    # dummy value — dropped after scaling, never used by the model
        "locality_encoded": locality_encoded
    }])
    scaled = scaler.transform(numeric_input)
    scaled_df = pd.DataFrame(scaled, columns=numeric_input.columns)

    # Step 3: one-hot encode furnishing (city isn't used directly — locality_encoded already captures location)
    furnishing_semi = 1 if request.furnishing == "Semi-Furnished" else 0
    furnishing_unfurnished = 1 if request.furnishing == "Unfurnished" else 0

    # Step 4: assemble the final row, in the EXACT column order the model expects
    row = {
        "bhk": scaled_df["bhk"].iloc[0],
        "size_sqft": scaled_df["size_sqft"].iloc[0],
        "bathrooms": scaled_df["bathrooms"].iloc[0],
        "near_highway": request.near_highway,
        "near_mall": request.near_mall,
        "near_river": request.near_river,
        "near_mountain": request.near_mountain,
        "locality_encoded": scaled_df["locality_encoded"].iloc[0],
        "furnishing_Semi-Furnished": furnishing_semi,
        "furnishing_Unfurnished": furnishing_unfurnished,
    }

    X_input = pd.DataFrame([row])[model_columns]   # enforce exact training column order

    # Step 5: predict (model outputs log_rent), convert back to real rupees
    predicted_log_rent = model.predict(X_input)[0]
    predicted_rent = np.expm1(predicted_log_rent)

    # Step 6: look up coordinates for the map (falls back to None if locality isn't in the lookup)
    coords = geo_lookup.get((request.city, request.locality))
    lat, lon = coords if coords else (None, None)

    prediction_id = log_prediction(request, round(float(predicted_rent), 2), lat, lon)

    return {
        "prediction_id": prediction_id,
        "city": request.city,
        "locality": request.locality,
        "predicted_rent": round(float(predicted_rent), 2),
        "latitude": lat,
        "longitude": lon
    }


@app.post("/feedback")
def submit_feedback(request: FeedbackRequest):
    if not (1 <= request.rating <= 5):
        return {"success": False, "message": "Rating must be between 1 and 5."}

    saved = save_feedback(request.prediction_id, request.rating, request.comment, request.user_id)

    if saved:
        return {"success": True, "message": "Thanks for your feedback!"}
    else:
        return {"success": False, "message": "Could not save feedback right now."}


EXTRACTION_PROMPT = """You are a real estate assistant continuing an ongoing conversation. Extract rental search details from the user's LATEST message only and return ONLY a JSON object, no other text, no markdown formatting.

Required JSON shape:
{
  "city": string or null,
  "locality": string or null,
  "bhk": integer or null,
  "size_sqft": number or null,
  "furnishing": one of "Furnished", "Semi-Furnished", "Unfurnished", or null,
  "bathrooms": integer or null,
  "near_highway": true or false,
  "near_mall": true or false,
  "near_river": true or false,
  "near_mountain": true or false,
  "reply": a short, natural conversational reply.
}

Rules:
- Only extract fields mentioned in THIS message. Leave anything not mentioned as null (or false for the near_* flags) — do not guess or invent values.
- Only set near_highway/near_mall/near_river/near_mountain to true if the user explicitly mentions wanting/being near that feature in this message. Default false.
- bathrooms defaults to null if not mentioned - do not guess.
- Be strict about JSON validity: no trailing commas, no comments, no markdown code fences.

User message: """

# Fields the frontend is expected to track across turns and send back as known_fields
TRACKED_FIELDS = [
    "city", "locality", "bhk", "size_sqft", "furnishing", "bathrooms",
    "near_highway", "near_mall", "near_river", "near_mountain",
]
REQUIRED_FIELDS = ["city", "locality", "bhk", "size_sqft", "furnishing", "bathrooms"]


@app.post("/chat")
def chat(request: ChatRequest):
    known_fields = request.known_fields or {}

    try:
        response = gemini_model.generate_content(EXTRACTION_PROMPT + request.message)
        raw_text = response.text.strip()

        # Gemini sometimes wraps JSON in ```json fences despite instructions — strip them defensively
        if raw_text.startswith("```"):
            raw_text = raw_text.split("```")[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
        raw_text = raw_text.strip()

        extracted = json.loads(raw_text)

        # Merge this message's newly extracted values into what we already knew.
        # A new non-null/non-false value overrides; otherwise we keep the prior known value.
        merged = dict(known_fields)  # start from what we already had
        for field in TRACKED_FIELDS:
            new_value = extracted.get(field)
            if new_value not in (None, False):
                merged[field] = new_value
            elif field not in merged:
                merged[field] = new_value  # first time seeing it, keep None/False as-is

        missing = [f for f in REQUIRED_FIELDS if merged.get(f) is None]

        if missing:
            return {
                "reply": extracted.get("reply", "Could you share a bit more detail?"),
                "known_fields": merged,
                "prediction": None
            }

        # All required fields present — build a RentRequest and reuse the existing predict logic
        rent_request = RentRequest(
            city=merged["city"],
            locality=merged["locality"],
            bhk=merged["bhk"],
            size_sqft=merged["size_sqft"],
            furnishing=merged["furnishing"],
            bathrooms=merged["bathrooms"],
            near_highway=1 if merged.get("near_highway") else 0,
            near_mall=1 if merged.get("near_mall") else 0,
            near_river=1 if merged.get("near_river") else 0,
            near_mountain=1 if merged.get("near_mountain") else 0,
            user_id=request.user_id,
        )

        prediction = predict_rent(rent_request)

        return {
            "reply": extracted.get("reply", "Here's what I found:"),
            "known_fields": merged,
            "prediction": prediction
        }

    except json.JSONDecodeError:
        return {
            "reply": "Sorry, I had trouble understanding that. Could you rephrase?",
            "known_fields": known_fields,
            "prediction": None
        }
    except Exception as e:
        print("Chat error:", e)
        return {
            "reply": "Something went wrong on my end. Please try again.",
            "known_fields": known_fields,
            "prediction": None
        }