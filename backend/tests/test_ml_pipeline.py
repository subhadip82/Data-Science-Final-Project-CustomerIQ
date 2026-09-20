import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from app.ml.pipeline import validate_columns, clean_data, compute_rfm, run_clustering, run_pipeline

def make_sample_data():
    now = datetime.now()
    records = []
    # Create 30 customers with varying behaviors
    for cid in range(1001, 1031):
        num_orders = (cid % 5) + 1
        for o in range(num_orders):
            days_ago = (cid % 30) * 3 + o * 5
            records.append({
                "InvoiceNo": f"5{cid}{o}",
                "StockCode": "22423",
                "Description": "Test Product",
                "Quantity": 2 * (o + 1),
                "InvoiceDate": (now - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S"),
                "UnitPrice": 10.5,
                "CustomerID": str(cid),
                "Country": "United Kingdom" if cid % 2 == 0 else "Germany"
            })
    return pd.DataFrame(records)

def test_validate_columns_valid():
    df = make_sample_data()
    valid, errors = validate_columns(df)
    assert valid is True
    assert len(errors) == 0

def test_validate_columns_missing():
    df = make_sample_data().drop(columns=["UnitPrice", "CustomerID"])
    valid, errors = validate_columns(df)
    assert valid is False
    assert len(errors) > 0

def test_clean_data():
    df = make_sample_data()
    # Add cancelled invoice and invalid quantities
    bad_rows = pd.DataFrame([
        {"InvoiceNo": "C59999", "StockCode": "22423", "Description": "Cancelled", "Quantity": -2, "InvoiceDate": "2023-01-01", "UnitPrice": 10.0, "CustomerID": "9999", "Country": "UK"},
        {"InvoiceNo": "59998", "StockCode": "22423", "Description": "Free sample", "Quantity": 2, "InvoiceDate": "2023-01-01", "UnitPrice": 0.0, "CustomerID": "9998", "Country": "UK"},
    ])
    dirty_df = pd.concat([df, bad_rows], ignore_index=True)
    cleaned, stats = clean_data(dirty_df)
    assert "C59999" not in cleaned["invoice"].values
    assert not (cleaned["price"] <= 0).any()
    assert not (cleaned["quantity"] <= 0).any()
    assert stats["clean_rows"] == len(cleaned)

def test_compute_rfm():
    cleaned, _ = clean_data(make_sample_data())
    rfm = compute_rfm(cleaned)
    assert len(rfm) == 30
    assert "r_score" in rfm.columns
    assert "f_score" in rfm.columns
    assert "m_score" in rfm.columns
    assert "rfm_score" in rfm.columns
    assert rfm["r_score"].min() >= 1
    assert rfm["r_score"].max() <= 5

def test_run_clustering():
    cleaned, _ = clean_data(make_sample_data())
    rfm = compute_rfm(cleaned)
    clustered, meta = run_clustering(rfm)
    assert meta["n_clusters"] >= 2
    assert "cluster" in clustered.columns
    assert "segment_label" in clustered.columns
    assert "pca_x" in clustered.columns
    assert "pca_y" in clustered.columns
    assert set(clustered["segment_label"].dropna().unique()).issubset({
        "VIP Customers", "Loyal Customers", "Potential Customers", "At-Risk Customers"
    })

def test_end_to_end_pipeline():
    df = make_sample_data()
    res = run_pipeline(df)
    assert res["success"] is True
    assert "rfm" in res
    assert "orders" in res
    assert len(res["rfm"]) == 30
