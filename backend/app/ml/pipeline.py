"""
CustomerIQ ML Pipeline
======================
Full pipeline: CSV → Cleaning → RFM → K-Means → PCA → Segment Labels
"""
from __future__ import annotations

import logging
import warnings
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)

# ─── Required CSV columns (case-insensitive) ──────────────────────────────────
REQUIRED_COLUMNS = {
    "invoice": ["invoiceno", "invoice_no", "invoice", "order_id", "orderid"],
    "customer": ["customerid", "customer_id", "customer"],
    "date": ["invoicedate", "invoice_date", "order_date", "orderdate", "date"],
    "product": ["description", "product", "productname", "product_name", "item"],
    "quantity": ["quantity", "qty"],
    "price": ["unitprice", "unit_price", "price"],
    "country": ["country"],
}

SEGMENT_COLORS = {
    "VIP Customers": "#8B5CF6",
    "Loyal Customers": "#3B82F6",
    "Potential Customers": "#10B981",
    "At-Risk Customers": "#EF4444",
}


# ─── Column Detection ─────────────────────────────────────────────────────────

def _detect_column(df_cols: list[str], candidates: list[str]) -> str | None:
    df_lower = {c.lower().replace(" ", "_"): c for c in df_cols}
    for cand in candidates:
        if cand in df_lower:
            return df_lower[cand]
    return None


def detect_columns(df: pd.DataFrame) -> dict[str, str | None]:
    cols = list(df.columns)
    return {field: _detect_column(cols, candidates) for field, candidates in REQUIRED_COLUMNS.items()}


def validate_columns(df: pd.DataFrame) -> tuple[bool, list[str]]:
    detected = detect_columns(df)
    missing = [field for field, col in detected.items() if col is None and field != "country"]
    if missing:
        return False, [f"Missing required column: {m}" for m in missing]
    return True, []


# ─── Cleaning ─────────────────────────────────────────────────────────────────

def clean_data(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    original_len = len(df)
    stats = {"original_rows": original_len, "dropped_rows": 0, "issues": []}

    col_map = detect_columns(df)

    # Rename to standard names
    rename = {}
    for std_name, actual_col in col_map.items():
        if actual_col and actual_col != std_name:
            rename[actual_col] = std_name
    df = df.rename(columns=rename)

    # Drop rows with nulls in key columns
    key_cols = ["customer", "date", "quantity", "price"]
    key_cols_present = [c for c in key_cols if c in df.columns]
    before = len(df)
    df = df.dropna(subset=key_cols_present)
    dropped_null = before - len(df)
    if dropped_null:
        stats["issues"].append(f"Dropped {dropped_null} rows with missing values")

    # Parse date
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    bad_dates = df["date"].isna().sum()
    if bad_dates:
        stats["issues"].append(f"Dropped {bad_dates} rows with unparseable dates")
    df = df.dropna(subset=["date"])

    # Convert numerics
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0)

    # Drop negatives/cancellations
    before = len(df)
    df = df[(df["quantity"] > 0) & (df["price"] > 0)]
    dropped_neg = before - len(df)
    if dropped_neg:
        stats["issues"].append(f"Dropped {dropped_neg} rows with negative/zero quantity or price")

    # Compute total price
    df["total_price"] = df["quantity"] * df["price"]

    # Customer as string
    df["customer"] = df["customer"].astype(str).str.strip()
    df = df[df["customer"] != "nan"]

    if "country" not in df.columns:
        df["country"] = "Unknown"
    else:
        df["country"] = df["country"].fillna("Unknown").astype(str).str.strip()

    if "product" not in df.columns:
        df["product"] = "Unknown"
    else:
        df["product"] = df["product"].fillna("Unknown").astype(str).str.strip()

    if "invoice" not in df.columns:
        df["invoice"] = df.index.astype(str)
    else:
        df["invoice"] = df["invoice"].astype(str).str.strip()

    stats["dropped_rows"] = original_len - len(df)
    stats["clean_rows"] = len(df)
    logger.info(f"Data cleaning: {original_len} → {len(df)} rows")
    return df, stats


# ─── RFM Calculation ──────────────────────────────────────────────────────────

def compute_rfm(df: pd.DataFrame, reference_date: date | None = None) -> pd.DataFrame:
    """Compute Recency, Frequency, Monetary for each customer."""
    if reference_date is None:
        reference_date = df["date"].max().date() + pd.Timedelta(days=1)

    ref = pd.Timestamp(reference_date)

    rfm = df.groupby("customer").agg(
        last_purchase=("date", "max"),
        frequency=("invoice", "nunique"),
        monetary=("total_price", "sum"),
        country=("country", lambda x: x.mode().iloc[0] if not x.empty else "Unknown"),
    ).reset_index()

    rfm["recency_days"] = (ref - rfm["last_purchase"]).dt.days
    rfm = rfm.rename(columns={"customer": "customer_code"})

    # Score using quintiles (1=worst, 5=best)
    # Recency: lower days = better → invert
    rfm["r_score"] = pd.qcut(rfm["recency_days"], q=5, labels=[5, 4, 3, 2, 1], duplicates="drop").astype(int)
    rfm["f_score"] = pd.qcut(rfm["frequency"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5], duplicates="drop").astype(int)
    rfm["m_score"] = pd.qcut(rfm["monetary"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5], duplicates="drop").astype(int)

    rfm["rfm_score"] = rfm["r_score"] * 100 + rfm["f_score"] * 10 + rfm["m_score"]

    return rfm


# ─── Clustering ───────────────────────────────────────────────────────────────

def find_optimal_k(X_scaled: np.ndarray, k_range: range = range(2, 9)) -> tuple[int, list[float], list[float]]:
    """Elbow + Silhouette to find optimal k."""
    inertias = []
    silhouettes = []

    for k in k_range:
        if len(X_scaled) < k:
            break
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        inertias.append(km.inertia_)
        if len(set(labels)) > 1:
            silhouettes.append(silhouette_score(X_scaled, labels))
        else:
            silhouettes.append(0.0)

    # Find elbow using second derivative
    if len(inertias) < 3:
        return min(len(inertias), 4), inertias, silhouettes

    diffs = np.diff(inertias)
    second_diffs = np.diff(diffs)
    elbow_idx = int(np.argmax(second_diffs)) + 2  # +2 because k starts at 2

    # Balance elbow with best silhouette
    best_sil_idx = int(np.argmax(silhouettes))
    optimal_k = min(max(elbow_idx, best_sil_idx + 2), 6)
    optimal_k = max(optimal_k, 2)

    return optimal_k, inertias, silhouettes


def interpret_segments(rfm_with_clusters: pd.DataFrame) -> dict[int, str]:
    """Assign business-readable labels to clusters based on RFM behaviour."""
    cluster_stats = rfm_with_clusters.groupby("cluster").agg(
        avg_r=("r_score", "mean"),
        avg_f=("f_score", "mean"),
        avg_m=("m_score", "mean"),
        avg_recency=("recency_days", "mean"),
    ).reset_index()

    labels = {}
    assigned = set()

    # Sort clusters by combined value score (m + f - r)
    cluster_stats["value_score"] = cluster_stats["avg_m"] + cluster_stats["avg_f"] - (cluster_stats["avg_r"] / 5)
    cluster_stats = cluster_stats.sort_values("value_score", ascending=False)

    segment_priority = ["VIP Customers", "Loyal Customers", "Potential Customers", "At-Risk Customers"]

    for i, row in cluster_stats.iterrows():
        cluster_id = row["cluster"]
        # VIP: high monetary + high frequency + low recency days
        if row["avg_m"] >= 4.0 and row["avg_f"] >= 3.5 and cluster_id not in assigned:
            label = "VIP Customers"
        # Loyal: good frequency + decent monetary
        elif row["avg_f"] >= 3.0 and row["avg_m"] >= 3.0 and cluster_id not in assigned:
            label = "Loyal Customers"
        # At-Risk: high recency days (haven't bought recently) + some history
        elif row["avg_recency"] > cluster_stats["avg_recency"].median() * 1.3 and cluster_id not in assigned:
            label = "At-Risk Customers"
        else:
            label = "Potential Customers"

        # Avoid duplicate labels
        if label in assigned:
            remaining = [s for s in segment_priority if s not in assigned]
            label = remaining[0] if remaining else f"Segment {cluster_id}"

        labels[cluster_id] = label
        assigned.add(label)

    return labels


def run_clustering(rfm: pd.DataFrame, n_clusters: int | None = None) -> tuple[pd.DataFrame, dict]:
    """Run K-Means clustering on RFM features."""
    features = rfm[["recency_days", "frequency", "monetary"]].copy()

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(features)

    # Find optimal k
    if n_clusters is None:
        k_range = range(2, min(9, len(rfm)))
        optimal_k, inertias, silhouettes = find_optimal_k(X_scaled, k_range)
    else:
        optimal_k = n_clusters
        km_temp = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
        km_temp.fit(X_scaled)
        inertias = [km_temp.inertia_]
        silhouettes = []

    # Final clustering
    km = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
    rfm["cluster"] = km.fit_predict(X_scaled)

    # Silhouette score
    sil_score = None
    if len(set(rfm["cluster"])) > 1:
        sil_score = round(silhouette_score(X_scaled, rfm["cluster"]), 4)

    # PCA for 2D visualisation
    pca = PCA(n_components=2)
    pca_coords = pca.fit_transform(X_scaled)
    rfm["pca_x"] = pca_coords[:, 0]
    rfm["pca_y"] = pca_coords[:, 1]

    # Interpret segments
    segment_labels = interpret_segments(rfm)
    rfm["segment_label"] = rfm["cluster"].map(segment_labels)

    meta = {
        "n_clusters": optimal_k,
        "silhouette_score": sil_score,
        "inertias": inertias,
        "silhouettes": silhouettes,
        "segment_labels": segment_labels,
        "explained_variance": pca.explained_variance_ratio_.tolist(),
    }

    return rfm, meta


# ─── Full Pipeline ────────────────────────────────────────────────────────────

def run_pipeline(raw_df: pd.DataFrame) -> dict:
    """
    Execute the complete ML pipeline.
    Returns a dict with all computed data ready for DB persistence.
    """
    logger.info("Starting ML pipeline...")

    # 1. Validate columns
    valid, errors = validate_columns(raw_df)
    if not valid:
        return {"success": False, "errors": errors}

    # 2. Clean
    df, clean_stats = clean_data(raw_df)
    if len(df) == 0:
        return {"success": False, "errors": ["No valid rows after cleaning"]}

    # 3. RFM
    rfm = compute_rfm(df)

    # 4. Clustering (only if enough customers)
    meta = {"n_clusters": 0, "silhouette_score": None}
    if len(rfm) >= 10:
        rfm, meta = run_clustering(rfm)
    else:
        rfm["cluster"] = 0
        rfm["pca_x"] = 0.0
        rfm["pca_y"] = 0.0
        rfm["segment_label"] = "Potential Customers"

    # 5. Build orders DataFrame with customer mapping
    orders_df = df[["invoice", "customer", "date", "product", "quantity", "price", "total_price", "country"]].copy()
    orders_df = orders_df.rename(columns={"customer": "customer_code", "date": "order_date", "invoice": "invoice_id"})

    # Add per-customer country from rfm
    customer_country = rfm[["customer_code", "country"]].set_index("customer_code")["country"].to_dict()

    logger.info(f"Pipeline complete: {len(rfm)} customers, {len(orders_df)} orders, {meta['n_clusters']} clusters")

    return {
        "success": True,
        "rfm": rfm,
        "orders": orders_df,
        "meta": meta,
        "clean_stats": clean_stats,
        "customer_country": customer_country,
    }
