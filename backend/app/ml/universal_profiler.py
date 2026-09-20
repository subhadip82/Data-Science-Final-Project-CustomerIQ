"""
Universal Tabular Profiler
===========================
Analyzes structured tabular data (CSV/XLSX) to compute:
- Row/column counts, memory usage, duplicate rows
- In-depth column profiling (types, semantic classification, missingness, cardinality, stats)
- Outlier detection (IQR method)
- Overall dataset quality score (0-100) and transformation recommendations
"""
from __future__ import annotations
import math
import numpy as np
import pandas as pd
from typing import Any, Dict, List, Tuple


def _json_safe(val: Any) -> Any:
    """Convert numpy / pandas types to native JSON-serializable primitives."""
    if val is None or pd.isna(val):
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        if math.isnan(val) or math.isinf(val):
            return None
        return round(float(val), 4)
    if isinstance(val, (np.bool_, bool)):
        return bool(val)
    if isinstance(val, (pd.Timestamp, np.datetime64)):
        return str(val)
    return str(val)


def detect_semantic_type(col_name: str, series: pd.Series, dtype: str) -> str:
    """Infer the semantic meaning of a column."""
    name_lower = col_name.lower().replace(" ", "_").replace("-", "_")
    non_null = series.dropna()
    n_unique = non_null.nunique()
    total_len = len(series)

    # Identifier candidates
    id_tokens = ["id", "code", "uuid", "key", "no", "number", "num", "hash", "sku"]
    if any(tok in name_lower.split("_") for tok in id_tokens) or name_lower.endswith("id") or name_lower.endswith("no"):
        if n_unique > total_len * 0.7 or n_unique > 50:
            return "id"

    # Monetary / Currency candidates
    money_tokens = ["price", "revenue", "amount", "total", "cost", "salary", "spend", "sales", "fare", "fee", "rate", "income", "value"]
    if any(tok in name_lower for tok in money_tokens) and dtype in ("float", "integer"):
        return "monetary"

    # Quantity / Count candidates
    qty_tokens = ["quantity", "qty", "count", "units", "items", "volume", "inventory", "stock", "orders"]
    if any(tok in name_lower for tok in qty_tokens) and dtype in ("float", "integer"):
        return "quantity"

    # Datetime candidates
    if dtype in ("datetime", "date"):
        return "datetime"
    date_tokens = ["date", "time", "timestamp", "year", "month", "day", "created_at", "updated_at", "invoicedate"]
    if any(tok in name_lower for tok in date_tokens):
        return "datetime"

    # Boolean candidates
    if dtype == "boolean" or n_unique == 2:
        return "boolean"

    # Categorical
    if dtype == "categorical" or (n_unique < 50 and n_unique < total_len * 0.2):
        return "categorical"

    # Text / NLP candidates
    if dtype == "text" or (series.dtype == object and non_null.astype(str).str.len().mean() > 30):
        return "text"

    # Target candidates
    target_tokens = ["target", "label", "churn", "attrition", "status", "converted", "class", "default", "outcome"]
    if any(tok in name_lower for tok in target_tokens):
        return "target_candidate"

    return dtype


def profile_column(series: pd.Series, col_name: str) -> Dict[str, Any]:
    """Calculate comprehensive statistics and metadata for a single column."""
    total = len(series)
    missing_count = int(series.isna().sum())
    missing_pct = round((missing_count / total) * 100, 2) if total > 0 else 0.0
    non_null = series.dropna()
    unique_count = int(non_null.nunique())

    # Infer basic data type
    if pd.api.types.is_numeric_dtype(series):
        if pd.api.types.is_integer_dtype(series):
            dtype = "integer"
        else:
            dtype = "float"
    elif pd.api.types.is_datetime64_any_dtype(series):
        dtype = "datetime"
    elif pd.api.types.is_bool_dtype(series):
        dtype = "boolean"
    else:
        # Try datetime conversion
        try:
            converted = pd.to_datetime(non_null.head(100), errors="coerce", format="mixed")
            if converted.notna().mean() > 0.85:
                dtype = "datetime"
            else:
                avg_len = non_null.astype(str).str.len().mean() if len(non_null) > 0 else 0
                dtype = "text" if avg_len > 35 else "categorical"
        except Exception:
            dtype = "categorical"

    semantic_type = detect_semantic_type(col_name, series, dtype)
    sample_values = [_json_safe(v) for v in non_null.head(5).tolist()]

    stats: Dict[str, Any] = {}
    outlier_count = 0

    if dtype in ("integer", "float") and len(non_null) > 0:
        numeric_vals = pd.to_numeric(non_null, errors="coerce").dropna()
        if len(numeric_vals) > 0:
            q25 = float(numeric_vals.quantile(0.25))
            q75 = float(numeric_vals.quantile(0.75))
            iqr = q75 - q25
            lower_bound = q25 - (1.5 * iqr)
            upper_bound = q75 + (1.5 * iqr)
            outlier_count = int(((numeric_vals < lower_bound) | (numeric_vals > upper_bound)).sum())

            stats = {
                "min": _json_safe(numeric_vals.min()),
                "max": _json_safe(numeric_vals.max()),
                "mean": _json_safe(numeric_vals.mean()),
                "median": _json_safe(numeric_vals.median()),
                "std": _json_safe(numeric_vals.std()) if len(numeric_vals) > 1 else 0,
                "q25": _json_safe(q25),
                "q75": _json_safe(q75),
                "iqr": _json_safe(iqr),
            }

    elif dtype == "categorical" and len(non_null) > 0:
        top_cats = non_null.value_counts().head(5)
        stats = {
            "top_values": {str(k): int(v) for k, v in top_cats.items()},
            "most_frequent": _json_safe(top_cats.index[0]) if len(top_cats) > 0 else None,
        }

    elif dtype == "datetime" and len(non_null) > 0:
        dt_series = pd.to_datetime(non_null, errors="coerce").dropna()
        if len(dt_series) > 0:
            min_dt = dt_series.min()
            max_dt = dt_series.max()
            stats = {
                "min_date": str(min_dt),
                "max_date": str(max_dt),
                "date_range_days": int((max_dt - min_dt).days),
            }

    elif dtype == "text" and len(non_null) > 0:
        lengths = non_null.astype(str).str.len()
        stats = {
            "avg_length": _json_safe(lengths.mean()),
            "min_length": int(lengths.min()),
            "max_length": int(lengths.max()),
        }

    return {
        "name": col_name,
        "original_name": col_name,
        "data_type": dtype,
        "semantic_type": semantic_type,
        "missing_count": missing_count,
        "missing_pct": missing_pct,
        "unique_count": unique_count,
        "sample_values": sample_values,
        "stats": stats,
        "outlier_count": outlier_count,
    }


def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """Profiles the entire dataset and returns structured quality score, column profiles, and recommendations."""
    row_count = len(df)
    col_count = len(df.columns)

    if row_count == 0 or col_count == 0:
        return {
            "row_count": row_count,
            "column_count": col_count,
            "columns": [],
            "quality_score": 0.0,
            "issues": ["Dataset is empty."],
            "recommendations": ["Upload a non-empty CSV or XLSX file with headers."],
            "duplicate_rows": 0,
            "memory_usage_kb": 0,
        }

    # Duplicate rows count
    duplicate_rows = int(df.duplicated().sum())

    # Profile each column
    columns_profile = [profile_column(df[col], col) for col in df.columns]

    # Calculate overall Data Quality Score (0 - 100)
    issues: List[str] = []
    recommendations: List[str] = []
    deductions = 0.0

    # 1. Missing values check
    total_cells = row_count * col_count
    total_missing = sum(c["missing_count"] for c in columns_profile)
    overall_missing_pct = (total_missing / total_cells) * 100
    if overall_missing_pct > 0:
        deductions += min(overall_missing_pct * 1.5, 30.0)
        issues.append(f"{overall_missing_pct:.1f}% of values across the dataset are missing.")
        recommendations.append("Consider imputing missing values or dropping high-missingness columns.")

    # 2. Duplicate rows check
    dup_pct = (duplicate_rows / row_count) * 100
    if dup_pct > 0:
        deductions += min(dup_pct * 2.0, 20.0)
        issues.append(f"{duplicate_rows} duplicate rows detected ({dup_pct:.1f}%).")
        recommendations.append("Deduplicate redundant records before training machine learning models.")

    # 3. Constant columns check
    constant_cols = [c["name"] for c in columns_profile if c["unique_count"] <= 1]
    if constant_cols:
        deductions += len(constant_cols) * 5.0
        issues.append(f"{len(constant_cols)} constant or zero-variance column(s) detected: {', '.join(constant_cols)}.")
        recommendations.append("Drop constant columns as they carry no statistical variance.")

    # 4. Outliers check
    total_outliers = sum(c["outlier_count"] for c in columns_profile)
    if total_outliers > 0:
        deductions += min((total_outliers / row_count) * 10.0, 15.0)
        issues.append(f"{total_outliers} numerical outlier instances identified using IQR thresholds.")
        recommendations.append("Inspect outliers to evaluate if log-transformation or capping is appropriate.")

    quality_score = max(round(100.0 - deductions, 1), 10.0)

    # Column type summary
    type_counts = {}
    for c in columns_profile:
        t = c["data_type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    memory_kb = int(df.memory_usage(deep=True).sum() / 1024)

    return {
        "row_count": row_count,
        "column_count": col_count,
        "memory_usage_kb": memory_kb,
        "duplicate_rows": duplicate_rows,
        "quality_score": quality_score,
        "type_counts": type_counts,
        "issues": issues,
        "recommendations": recommendations,
        "columns": columns_profile,
    }
