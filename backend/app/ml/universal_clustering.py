"""
Universal Clustering & PCA Engine
==================================
Performs:
- Dynamic feature selection and missing value imputation
- StandardScaler normalization
- Optimal cluster discovery via Elbow method (Inertia) & Silhouette analysis
- K-Means clustering (user-selected or optimal k)
- 2D PCA dimensionality reduction for scatter plotting
- Data-driven cohort labelling based on relative feature averages
"""
from __future__ import annotations
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score


CLUSTER_PALETTE = [
    "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B",
    "#EC4899", "#06B6D4", "#6366F1", "#84CC16"
]


def _generate_data_driven_label(cluster_idx: int, cluster_means: pd.Series, overall_means: pd.Series, features: List[str]) -> str:
    """Generates descriptive labels from observed relative characteristics rather than hardcoded personas."""
    # Find most distinctive higher and lower features compared to overall mean
    ratios = cluster_means / (overall_means.replace(0, 0.0001))
    top_feature = ratios.idxmax()
    top_ratio = ratios.max()

    lowest_feature = ratios.idxmin()
    lowest_ratio = ratios.min()

    # Format feature name for human readability
    top_clean = top_feature.replace("_", " ").title()

    if top_ratio > 1.3:
        return f"High {top_clean} Cohort"
    elif lowest_ratio < 0.7:
        low_clean = lowest_feature.replace("_", " ").title()
        return f"Low {low_clean} Cohort"
    else:
        return f"Balanced Tier {cluster_idx + 1}"


def run_universal_clustering(
    df: pd.DataFrame,
    feature_cols: Optional[List[str]] = None,
    n_clusters: Optional[int] = None,
    max_k: int = 8,
) -> Dict[str, Any]:
    """Universal K-Means clustering with Elbow & Silhouette analysis and 2D PCA projection."""
    # Select features
    if not feature_cols:
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        # Drop ID-like columns
        feature_cols = [c for c in numeric_cols if not c.lower().endswith("id") and not c.lower().endswith("code")]
        if len(feature_cols) < 2:
            feature_cols = numeric_cols

    if len(feature_cols) < 2:
        raise ValueError("At least 2 numerical features are required for clustering.")

    sub_df = df[feature_cols].copy(deep=True)
    # Impute missing values with median
    sub_df = sub_df.fillna(sub_df.median())

    if len(sub_df) < 10:
        raise ValueError("Dataset has too few records for meaningful clustering (minimum 10 rows required).")

    # Scaling with guaranteed writeable float64 array
    X = np.asarray(sub_df.to_numpy(dtype=np.float64, copy=True)).copy()
    scaler = StandardScaler()
    scaled_matrix = scaler.fit_transform(X)

    # Determine elbow curve and silhouette scores
    elbow_data = []
    max_test_k = min(max_k, len(sub_df) - 1, 8)
    best_k = 3
    best_sil = -1.0

    for k in range(2, max_test_k + 1):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(scaled_matrix)
        sil = float(silhouette_score(scaled_matrix, labels))
        elbow_data.append({
            "k": k,
            "inertia": round(float(km.inertia_), 2),
            "silhouette": round(sil, 3),
        })
        if sil > best_sil:
            best_sil = sil
            best_k = k

    # Use specified n_clusters or optimal k
    chosen_k = n_clusters if (n_clusters and 2 <= n_clusters <= max_test_k) else best_k

    final_kmeans = KMeans(n_clusters=chosen_k, random_state=42, n_init=10)
    final_labels = final_kmeans.fit_predict(scaled_matrix)

    # 2D PCA projection
    pca = PCA(n_components=2, random_state=42)
    pca_coords = pca.fit_transform(scaled_matrix)
    explained_var = [round(float(v) * 100, 1) for v in pca.explained_variance_ratio_]

    # Cluster summary
    df_clustered = sub_df.copy()
    df_clustered["cluster"] = final_labels

    overall_means = sub_df.mean()
    cluster_summaries = []

    for c_id in range(chosen_k):
        c_mask = final_labels == c_id
        c_sub = sub_df[c_mask]
        count = int(c_mask.sum())
        pct = round((count / len(sub_df)) * 100, 1)

        c_means = c_sub.mean()
        label = _generate_data_driven_label(c_id, c_means, overall_means, feature_cols)

        means_dict = {col: round(float(c_means[col]), 2) for col in feature_cols}

        cluster_summaries.append({
            "cluster_id": c_id,
            "segment_label": label,
            "count": count,
            "percentage": pct,
            "color": CLUSTER_PALETTE[c_id % len(CLUSTER_PALETTE)],
            "feature_means": means_dict,
        })

    # Sample PCA points for scatter chart (up to 500 points)
    sample_indices = np.random.RandomState(42).choice(
        len(df),
        size=min(500, len(df)),
        replace=False
    )

    pca_points = []
    # Try finding an identifier column if present in original df
    id_col = next((c for c in df.columns if "id" in c.lower() or "name" in c.lower() or "code" in c.lower()), None)

    for idx in sample_indices:
        c_id = int(final_labels[idx])
        label = cluster_summaries[c_id]["segment_label"]
        name_val = str(df.iloc[idx][id_col]) if id_col else f"Record {idx + 1}"
        pca_points.append({
            "index": int(idx),
            "name": name_val[:30],
            "cluster_id": c_id,
            "segment_label": label,
            "x": round(float(pca_coords[idx, 0]), 3),
            "y": round(float(pca_coords[idx, 1]), 3),
            "color": CLUSTER_PALETTE[c_id % len(CLUSTER_PALETTE)],
        })

    return {
        "n_clusters": chosen_k,
        "features": feature_cols,
        "clusters": cluster_summaries,
        "pca_points": pca_points,
        "elbow_curve": elbow_data,
        "explained_variance": explained_var,
        "total_records": len(df),
    }
