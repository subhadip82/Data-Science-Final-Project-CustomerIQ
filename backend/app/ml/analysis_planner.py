"""
Analysis Planner & Conditional Capability Engine
=================================================
Dynamically inspects dataset column profiles to determine which analytics modules
are mathematically and functionally viable for the dataset:
- Data Analytics & EDA
- Statistical Testing & Correlation Analysis
- Dynamic Visualization & Outlier Detection
- Machine Learning (Classification / Regression)
- Unsupervised Segmentation (K-Means & PCA)
- Time-Series Analytics & Trend Forecasting
- RFM Analysis (Recency, Frequency, Monetary)
- NLP & Text Analytics
- Business Insights & Recommendations
- Report Generation
"""
from __future__ import annotations
from typing import Dict, Any, List


def plan_analyses(column_profiles: List[Dict[str, Any]], dataset_type: str, row_count: int) -> Dict[str, Any]:
    """Evaluates module availability and provides tailored capability diagnostics."""
    data_types = {c["name"]: c["data_type"] for c in column_profiles}
    semantic_types = {c["name"]: c["semantic_type"] for c in column_profiles}

    numeric_cols = [c["name"] for c in column_profiles if c["data_type"] in ("integer", "float")]
    categorical_cols = [c["name"] for c in column_profiles if c["data_type"] in ("categorical", "boolean")]
    datetime_cols = [c["name"] for c in column_profiles if c["data_type"] == "datetime" or c["semantic_type"] == "datetime"]
    text_cols = [c["name"] for c in column_profiles if c["data_type"] == "text" or c["semantic_type"] == "text"]
    id_cols = [c["name"] for c in column_profiles if c["semantic_type"] == "id" or "id" in c["name"].lower() or "code" in c["name"].lower()]

    # 1. Detect candidate columns
    rfm_cust = next((c["name"] for c in column_profiles if any(k in c["name"].lower() for k in ["customer", "client", "buyer", "user_id", "member_id", "account_id"])), None)
    rfm_date = datetime_cols[0] if datetime_cols else None
    rfm_money = next((c["name"] for c in column_profiles if any(k in c["name"].lower() for k in ["total", "price", "revenue", "amount", "spend", "cost", "monetary", "sales"]) and c["data_type"] in ("integer", "float")), None)
    rfm_available = bool(rfm_cust and rfm_date and rfm_money)

    sales_col = next((c["name"] for c in column_profiles if any(k in c["name"].lower() for k in ["sales", "revenue", "amount", "total_price", "price", "profit"]) and c["data_type"] in ("integer", "float")), None)
    sales_available = bool(sales_col and len(numeric_cols) >= 1)

    entity_col = rfm_cust or (id_cols[0] if id_cols else None)
    customers_available = bool(entity_col)

    seg_available = len(numeric_cols) >= 2 and row_count >= 10
    ts_available = bool(datetime_cols and numeric_cols)
    nlp_available = len(text_cols) >= 1
    stats_available = len(numeric_cols) >= 2
    corr_available = len(numeric_cols) >= 2
    outlier_available = len(numeric_cols) >= 1
    eda_available = len(column_profiles) >= 1 and row_count >= 1
    viz_available = len(column_profiles) >= 1 and row_count >= 1

    target_candidate = next((c["name"] for c in column_profiles if c["semantic_type"] == "target_candidate" or any(k in c["name"].lower() for k in ["target", "label", "churn", "attrition", "status", "outcome", "converted", "default"])), None)
    if not target_candidate and categorical_cols:
        target_candidate = categorical_cols[-1]
    ml_available = bool(len(numeric_cols) + len(categorical_cols) >= 2 and row_count >= 20)
    ml_task = "classification" if (target_candidate and data_types.get(target_candidate) in ("categorical", "boolean")) else "regression" if (target_candidate and data_types.get(target_candidate) in ("integer", "float")) else "classification"

    # All 14 Universal Platform Feature Cards (Requirement 3 Section E)
    features = {
        "analytics": {
            "title": "Data Analytics",
            "available": True,
            "reason": f"Active dataset loaded with {len(column_profiles)} columns and {row_count:,} rows ready for aggregated analytics.",
        },
        "eda": {
            "title": "EDA (Exploratory Data Analysis)",
            "available": eda_available,
            "reason": "Sufficient distribution and frequency data to construct univariate and bivariate summaries." if eda_available else "Requires at least 1 column and 1 row.",
        },
        "statistics": {
            "title": "Statistics",
            "available": stats_available,
            "reason": f"Descriptive moments, confidence intervals, and hypothesis tests available for {len(numeric_cols)} numeric variables." if stats_available else "Requires at least 2 numerical continuous variables for hypothesis testing.",
        },
        "visualization": {
            "title": "Visualization",
            "available": viz_available,
            "reason": "Multi-dimensional chart configurations can be generated across categorical and numerical axes." if viz_available else "Insufficient data to plot charts.",
        },
        "correlation": {
            "title": "Correlation Analysis",
            "available": corr_available,
            "reason": f"Pearson and Spearman matrices supported across {len(numeric_cols)} numerical features." if corr_available else "Correlation analysis requires at least 2 numerical columns.",
        },
        "outliers": {
            "title": "Outlier Detection",
            "available": outlier_available,
            "reason": f"Interquartile Range (IQR) and Z-score outlier detection available on {len(numeric_cols)} numerical features." if outlier_available else "Requires at least 1 numerical column.",
        },
        "ml": {
            "title": "Machine Learning",
            "available": ml_available,
            "reason": f"Supervised predictive models can be benchmarked ({'Target: ' + target_candidate if target_candidate else 'Select Target'})." if ml_available else "Machine learning requires at least 2 features and at least 20 records.",
            "target_candidate": target_candidate,
            "recommended_task": ml_task,
        },
        "segmentation": {
            "title": "Segmentation",
            "available": seg_available,
            "reason": f"Unsupervised K-Means clustering and PCA projection supported across {len(numeric_cols)} numeric features." if seg_available else "Clustering requires at least 2 numerical continuous variables and at least 10 rows.",
        },
        "time_series": {
            "title": "Time Series",
            "available": ts_available,
            "reason": f"Temporal trends and rolling metrics supported using '{datetime_cols[0] if datetime_cols else ''}'." if ts_available else "Requires a valid date/time column and a numerical metric.",
            "date_col": datetime_cols[0] if datetime_cols else None,
        },
        "rfm": {
            "title": "RFM Analysis",
            "available": rfm_available,
            "reason": "Customer identifier, transaction date, and monetary columns detected." if rfm_available else "No customer identifier + transaction date + monetary field were detected.",
            "detected_fields": {"customer_col": rfm_cust, "date_col": rfm_date, "monetary_col": rfm_money} if rfm_available else {},
        },
        "nlp": {
            "title": "NLP & Text Analytics",
            "available": nlp_available,
            "reason": f"{len(text_cols)} free-text column(s) detected for word frequencies and lexical analysis." if nlp_available else "No free-text columns detected for text analysis.",
            "text_cols": text_cols,
        },
        "insights": {
            "title": "Business Insights",
            "available": True,
            "reason": "Automated discovery of anomalies, top drivers, and key domain trends grounded in actual data.",
        },
        "recommendations": {
            "title": "Recommendations",
            "available": True,
            "reason": "Actionable playbooks with impact and effort ratings synthesized from dataset findings.",
        },
        "reports": {
            "title": "Reports",
            "available": True,
            "reason": "Exportable executive summaries, statistical audits, and full analytical briefs.",
        },
    }

    # Recommended Analyses with checkboxes and explanations (Requirement 3 Section F)
    recommended_analyses = [
        {
            "id": "eda",
            "name": "Exploratory Data Analysis",
            "recommended": True,
            "explanation": "Calculates complete summary statistics, distributions, missing values, and data health profiles.",
            "enabled": True,
        },
        {
            "id": "statistics",
            "name": "Statistical & Correlation Analysis",
            "recommended": stats_available,
            "explanation": f"Evaluates Pearson & Spearman correlations and hypothesis tests across {len(numeric_cols)} numeric variables." if stats_available else "Disabled: requires at least 2 numerical measures.",
            "enabled": stats_available,
        },
        {
            "id": "trends",
            "name": "Trend & Temporal Analysis",
            "recommended": ts_available,
            "explanation": f"Trend Analysis is recommended because a valid date column ('{datetime_cols[0] if datetime_cols else ''}') and numeric measures were detected." if ts_available else "Disabled: no temporal date column detected.",
            "enabled": ts_available,
        },
        {
            "id": "segmentation",
            "name": "Customer / Record Segmentation",
            "recommended": seg_available,
            "explanation": f"Unsupervised K-Means clustering and PCA dimensionality reduction across continuous variables." if seg_available else "Disabled: requires at least 2 numerical continuous variables.",
            "enabled": seg_available,
        },
        {
            "id": "ml",
            "name": "Predictive Machine Learning",
            "recommended": ml_available and bool(target_candidate),
            "explanation": f"Trains and benchmarks competing classification / regression algorithms against target '{target_candidate or 'candidate'}'." if ml_available else "Disabled: insufficient rows or features for training.",
            "enabled": ml_available and bool(target_candidate),
        },
        {
            "id": "rfm",
            "name": "RFM Customer Quintile Scoring",
            "recommended": rfm_available,
            "explanation": "Evaluates Recency, Frequency, and Monetary quintile scores to segment customer loyalty." if rfm_available else "Disabled: required customer, date, and monetary columns were not detected.",
            "enabled": rfm_available,
        },
        {
            "id": "nlp",
            "name": "Text & Sentiment / Lexical Analysis",
            "recommended": nlp_available,
            "explanation": f"Computes lexical richness, TF-IDF terms, and vocabulary frequencies on '{text_cols[0] if text_cols else ''}'." if nlp_available else "Disabled: no free-text columns detected.",
            "enabled": nlp_available,
        },
    ]

    modules: Dict[str, Dict[str, Any]] = {
        "rfm": features["rfm"],
        "sales": {
            "available": sales_available,
            "title": "Sales Analytics",
            "reason": f"Revenue metric '{sales_col}' detected." if sales_available else "Sales Analytics is unavailable because no revenue or transaction amount fields were detected.",
            "detected_fields": {"revenue_col": sales_col, "date_col": datetime_cols[0] if datetime_cols else None},
        },
        "customers": {
            "available": customers_available,
            "title": "Customer / Entity Directory",
            "reason": f"Entity identifier '{entity_col}' detected." if customers_available else "Customer/Entity analysis is unavailable because no distinct entity identifier was detected.",
            "detected_fields": {"entity_col": entity_col},
        },
        "segmentation": features["segmentation"],
        "ml": features["ml"],
        "time_series": features["time_series"],
        "nlp": features["nlp"],
        "statistics": features["statistics"],
    }

    return {
        "dataset_type": dataset_type,
        "features": features,
        "recommended_analyses": recommended_analyses,
        "modules": modules,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "datetime_columns": datetime_cols,
        "text_columns": text_cols,
        "id_columns": id_cols,
        "detected_selectors": {
            "target_column": target_candidate,
            "date_column": datetime_cols[0] if datetime_cols else None,
            "customer_column": entity_col,
            "text_column": text_cols[0] if text_cols else None,
            "measure_column": sales_col or (numeric_cols[0] if numeric_cols else None),
        },
    }
