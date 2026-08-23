import psycopg2
from dotenv import load_dotenv
from urllib.parse import quote
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    db_version = cursor.fetchone()
    print("Connection successful!")
    print("Postgres version:", db_version)
    cursor.close()
    conn.close()
except Exception as e:
    print("Connection failed:")
    print(e)