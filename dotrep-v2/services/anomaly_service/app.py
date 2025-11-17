"""
Anomaly Detection Service for DotRep
Uses IsolationForest to detect suspicious contribution patterns
"""
import os
import json
from typing import Optional, List, Dict, Any, Tuple
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pymysql
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    # Parse MySQL connection string
    DB_HOST = os.getenv("DB_HOST", "cloud-db")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("MYSQL_USER", "dotrep")
    DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    DB_NAME = os.getenv("MYSQL_DATABASE", "dotrep")
else:
    # Parse DATABASE_URL format: mysql://user:password@host:port/database
    from urllib.parse import urlparse
    parsed = urlparse(DATABASE_URL.replace("mysql://", "http://"))
    DB_HOST = parsed.hostname or "cloud-db"
    DB_PORT = parsed.port or 3306
    DB_USER = parsed.username or "dotrep"
    DB_PASSWORD = parsed.password or ""
    DB_NAME = parsed.path.lstrip("/") if parsed.path else "dotrep"

app = FastAPI(title="DotRep Anomaly Service", version="1.0.0")


class AnomalyRequest(BaseModel):
    weeks: int = 12
    contamination: float = 0.01  # expected fraction of anomalies
    min_samples: int = 3


class AnomalyResponse(BaseModel):
    ok: bool
    anomalies: List[Dict[str, Any]]
    count: int


def get_db_connection():
    """Get MySQL database connection"""
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        charset='utf8mb4'
    )


def build_actor_week_matrix(weeks: int = 12) -> Tuple[pd.DataFrame, List[str]]:
    """Query weekly counts per actor for last `weeks` weeks"""
    conn = get_db_connection()
    try:
        query = f"""
            SELECT 
                c.repoOwner as actor,
                DATE_FORMAT(COALESCE(p.anchoredAt, p.createdAt, c.createdAt), '%Y-%m-%d') as wk,
                COUNT(*) as cnt
            FROM proofs p
            LEFT JOIN contributions c ON c.proofCid = p.proofHash
            WHERE COALESCE(p.anchoredAt, p.createdAt, c.createdAt) >= DATE_SUB(NOW(), INTERVAL {weeks} WEEK)
                AND c.repoOwner IS NOT NULL
            GROUP BY c.repoOwner, wk
            ORDER BY c.repoOwner, wk;
        """
        df = pd.read_sql(query, conn)
        
        if df.empty:
            return pd.DataFrame(), []
        
        # Pivot to actor x week matrix, fill missing weeks with 0
        mat = df.pivot_table(index='actor', columns='wk', values='cnt', fill_value=0)
        # Ensure columns are ordered (most recent last)
        if len(mat.columns) > 0:
            mat = mat.reindex(sorted(mat.columns), axis=1)
        actors = mat.index.tolist()
        return mat, actors
    finally:
        conn.close()


@app.post("/anomaly/detect", response_model=AnomalyResponse)
def detect_anomalies(payload: AnomalyRequest):
    """Detect anomalies in contribution patterns using IsolationForest"""
    weeks = payload.weeks
    contamination = payload.contamination
    
    # Build matrix
    mat, actors = build_actor_week_matrix(weeks)
    if mat.empty:
        return AnomalyResponse(ok=True, anomalies=[], count=0)
    
    # Feature matrix: use raw weekly counts and also simple stats
    X = mat.values.astype(float)
    
    # Add per-actor summary features (mean, std)
    means = X.mean(axis=1).reshape(-1, 1)
    stds = X.std(axis=1).reshape(-1, 1)
    # Handle NaN values
    means = np.nan_to_num(means, nan=0.0)
    stds = np.nan_to_num(stds, nan=0.0)
    
    Xf = np.hstack([X, means, stds])
    
    # Fit IsolationForest
    iso = IsolationForest(contamination=contamination, random_state=42)
    iso.fit(Xf)
    scores = iso.decision_function(Xf)  # higher => less anomalous
    preds = iso.predict(Xf)  # -1 anomaly, 1 normal
    
    anomalies = []
    for i, actor in enumerate(actors):
        if preds[i] == -1:
            anomalies.append({
                "actor": actor,
                "score": float(scores[i]),
                "weeks_vector": mat.iloc[i].to_dict(),
                "mean": float(means[i][0]),
                "std": float(stds[i][0]) if stds[i][0] > 0 else 0.0
            })
    
    return AnomalyResponse(ok=True, anomalies=anomalies, count=len(anomalies))


@app.get("/anomaly/health")
def health():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {"ok": True, "status": "healthy", "database": "connected"}
    except Exception as e:
        return {"ok": False, "status": "unhealthy", "error": str(e)}


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "service": "DotRep Anomaly Detection",
        "version": "1.0.0",
        "endpoints": {
            "detect": "/anomaly/detect",
            "health": "/anomaly/health"
        }
    }

