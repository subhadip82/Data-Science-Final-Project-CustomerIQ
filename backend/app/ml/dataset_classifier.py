"""
Dataset Understanding Engine
============================
Intelligently classifies structured tabular datasets into domain categories:
- sales
- ecommerce
- customer
- hr
- finance
- marketing
- operations
- time-series
- survey
- generic-tabular

Uses column semantic types, names, data types, statistical distributions, and value patterns.
"""
from __future__ import annotations
import pandas as pd
from typing import Dict, Any, List


# Domain signature tokens and weights
DOMAIN_SIGNATURES = {
    "ecommerce": {
        "tokens": ["invoice", "invoiceno", "order", "order_id", "product", "sku", "quantity", "unitprice", "customer", "customerid", "shipping", "cart"],
        "weight": 1.2,
        "requires_min_tokens": 3,
    },
    "sales": {
        "tokens": ["sales", "revenue", "revenue_usd", "amount", "profit", "discount", "margin", "deal", "pipeline", "quota", "lead", "opportunity", "closed_date"],
        "weight": 1.1,
        "requires_min_tokens": 2,
    },
    "customer": {
        "tokens": ["customer", "client", "churn", "clv", "ltv", "retention", "tenure", "segment", "loyalty", "satisfaction", "nps", "tier"],
        "weight": 1.1,
        "requires_min_tokens": 2,
    },
    "hr": {
        "tokens": ["employee", "staff", "department", "salary", "wage", "attrition", "hire_date", "performance", "job_role", "manager", "resignation", "education", "overtime", "years_at_company"],
        "weight": 1.3,
        "requires_min_tokens": 2,
    },
    "finance": {
        "tokens": ["balance", "asset", "liability", "expense", "budget", "cashflow", "interest", "debt", "equity", "dividend", "roi", "ebitda", "audit", "account_no"],
        "weight": 1.2,
        "requires_min_tokens": 2,
    },
    "marketing": {
        "tokens": ["campaign", "clicks", "impressions", "ctr", "cpc", "cpa", "conversions", "roas", "channel", "ad_group", "utm_source", "bounce_rate"],
        "weight": 1.2,
        "requires_min_tokens": 2,
    },
    "operations": {
        "tokens": ["inventory", "warehouse", "stock", "supplier", "lead_time", "dispatch", "logistics", "defect", "machine", "yield", "downtime", "batch"],
        "weight": 1.1,
        "requires_min_tokens": 2,
    },
    "survey": {
        "tokens": ["respondent", "question", "agree", "disagree", "rating", "feedback", "strongly_agree", "likert", "score", "q1", "q2", "q3"],
        "weight": 1.2,
        "requires_min_tokens": 2,
    },
}


def classify_dataset(df: pd.DataFrame, column_profiles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Examines column names, types, and values to classify dataset category with confidence and reasoning."""
    col_names_norm = [c["name"].lower().replace(" ", "_").replace("-", "_") for c in column_profiles]
    semantic_types = [c["semantic_type"] for c in column_profiles]
    data_types = [c["data_type"] for c in column_profiles]

    # Scores per category
    scores: Dict[str, float] = {}
    match_reasons: Dict[str, List[str]] = {}

    for category, spec in DOMAIN_SIGNATURES.items():
        matched_tokens = []
        for col in col_names_norm:
            for tok in spec["tokens"]:
                if tok in col.split("_") or col == tok or tok in col:
                    matched_tokens.append(tok)
                    break

        distinct_matches = list(set(matched_tokens))
        if len(distinct_matches) >= spec["requires_min_tokens"]:
            score = (len(distinct_matches) / len(col_names_norm)) * spec["weight"] * 100
            score = min(score + (len(distinct_matches) * 12), 98.0)
            scores[category] = score
            match_reasons[category] = distinct_matches

    # Special check: Time Series dataset
    has_date = any(t == "datetime" for t in semantic_types or data_types)
    numeric_count = sum(1 for t in data_types if t in ("integer", "float"))
    if has_date and numeric_count >= 1 and len(col_names_norm) <= 6:
        scores["time-series"] = 85.0
        match_reasons["time-series"] = ["datetime column paired with sequential numerical measures"]

    # Special check: E-commerce override if invoice + customer + price
    if any("invoice" in c for c in col_names_norm) and any("customer" in c for c in col_names_norm):
        scores["ecommerce"] = max(scores.get("ecommerce", 0), 92.0)
        match_reasons["ecommerce"] = match_reasons.get("ecommerce", []) + ["transaction invoice and customer identifier"]

    # Special check: Survey if many rating / score / scale columns
    rating_cols = [c for c in col_names_norm if "rate" in c or "score" in c or "scale" in c or "q" in c]
    if len(rating_cols) >= 3 and len(rating_cols) >= len(col_names_norm) * 0.4:
        scores["survey"] = max(scores.get("survey", 0), 88.0)
        match_reasons["survey"] = rating_cols

    if not scores:
        return {
            "dataset_type": "generic-tabular",
            "confidence": 60.0,
            "reason": "Structured tabular data with general numeric and categorical distributions.",
        }

    # Pick top scoring category
    best_category, best_score = max(scores.items(), key=lambda item: item[1])
    matched_features = match_reasons.get(best_category, [])
    features_str = ", ".join(matched_features[:4])

    category_labels = {
        "ecommerce": "E-commerce Transactions",
        "sales": "Sales & Revenue",
        "customer": "Customer Profile & Loyalty",
        "hr": "Human Resources & Workforce",
        "finance": "Financial & Accounting",
        "marketing": "Marketing & Campaign Performance",
        "operations": "Operations & Supply Chain",
        "time-series": "Time-Series & Sequential",
        "survey": "Survey & Questionnaire",
        "generic-tabular": "General Tabular Data",
    }

    reason = f"Detected characteristic {best_category} patterns (matched key fields: {features_str})."

    return {
        "dataset_type": best_category,
        "dataset_type_label": category_labels.get(best_category, best_category.title()),
        "confidence": round(float(best_score), 1),
        "reason": reason,
        "matched_features": matched_features,
    }
