import joblib
import numpy as np
import pandas as pd
import psycopg2
from dotenv import load_dotenv
import os
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Rentora AI - Rent Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load all saved artifacts once, at startup
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")
locality_avg_rent = joblib.load("locality_avg_rent.pkl")
overall_avg = joblib.load("overall_avg.pkl")
model_columns = joblib.load("model_columns.pkl")


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


def log_prediction(request: RentRequest, predicted_rent: float):
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO predictions
                (state, place, size_sqft, near_highway, near_mall, river_view, mountain_facing, predicted_rent)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                request.city,
                request.locality,
                request.size_sqft,
                bool(request.near_highway),
                bool(request.near_mall),
                bool(request.near_river),
                bool(request.near_mountain),
                predicted_rent
            )
        )
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print("Failed to log prediction:", e)


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

    log_prediction(request, round(float(predicted_rent), 2))

    return {
        "city": request.city,
        "locality": request.locality,
        "predicted_rent": round(float(predicted_rent), 2)
    }