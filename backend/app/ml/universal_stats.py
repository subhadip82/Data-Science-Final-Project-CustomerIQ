"""
Universal Statistics & Correlation Engine
==========================================
Computes:
- Correlation matrices (Pearson & Spearman)
- Statistical hypothesis testing (Two-sample T-Test, One-way ANOVA, Chi-Square Test of Independence)
- Assumption checks and statistical interpretations
"""
from __future__ import annotations
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from scipy import stats


def compute_correlations(df: pd.DataFrame, method: str = "pearson") -> Dict[str, Any]:
    """Computes correlation matrix across all numeric features."""
    num_df = df.select_dtypes(include=[np.number]).dropna()
    if num_df.shape[1] < 2:
        return {"features": [], "matrix": [], "top_correlations": []}

    corr = num_df.corr(method=method)
    features = list(corr.columns)

    matrix = []
    for row_name in features:
        row_vals = [round(float(corr.loc[row_name, col]), 3) for col in features]
        matrix.append({"feature": row_name, "values": row_vals})

    # Find top strongest correlations (excluding diagonal 1.0)
    pairs = []
    for i in range(len(features)):
        for j in range(i + 1, len(features)):
            val = float(corr.iloc[i, j])
            if not math.isnan(val):
                pairs.append({
                    "var1": features[i],
                    "var2": features[j],
                    "correlation": round(val, 3),
                    "abs_correlation": round(abs(val), 3),
                    "relationship": "Strong Positive" if val > 0.7 else "Moderate Positive" if val > 0.3 else "Strong Negative" if val < -0.7 else "Moderate Negative" if val < -0.3 else "Weak / None",
                })

    pairs.sort(key=lambda x: x["abs_correlation"], reverse=True)

    return {
        "method": method,
        "features": features,
        "matrix": matrix,
        "top_correlations": pairs[:10],
    }


def run_statistical_tests(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Runs statistically justified hypothesis tests based on dataset distributions."""
    results: List[Dict[str, Any]] = []
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "string", "category", "bool"]).columns.tolist()

    # 1. Two-sample T-test between a binary category and a numeric measure
    binary_cats = [c for c in cat_cols if df[c].nunique() == 2]
    if binary_cats and num_cols:
        cat_col = binary_cats[0]
        num_col = num_cols[0]
        groups = df[[cat_col, num_col]].dropna()
        vals = groups[cat_col].unique()
        g1 = np.asarray(groups[groups[cat_col] == vals[0]][num_col].to_numpy(dtype=np.float64, copy=True)).copy()
        g2 = np.asarray(groups[groups[cat_col] == vals[1]][num_col].to_numpy(dtype=np.float64, copy=True)).copy()

        if len(g1) >= 5 and len(g2) >= 5:
            t_stat, p_val = stats.ttest_ind(g1, g2, equal_var=False)
            significant = p_val < 0.05
            results.append({
                "test_name": "Two-Sample Welch's T-Test",
                "variables": f"{num_col} across {cat_col} ('{vals[0]}' vs '{vals[1]}')",
                "statistic": round(float(t_stat), 4),
                "p_value": float(f"{p_val:.4e}"),
                "is_significant": significant,
                "interpretation": f"Statistically significant difference detected in {num_col} between {vals[0]} and {vals[1]} (p < 0.05)." if significant else f"No statistically significant difference in {num_col} detected between {vals[0]} and {vals[1]} (p >= 0.05).",
                "assumptions": "Assumes continuous distribution; Welch's variant robust to unequal variances.",
            })

    # 2. One-Way ANOVA across a categorical variable with 3-6 groups
    multi_cats = [c for c in cat_cols if 3 <= df[c].nunique() <= 6]
    if multi_cats and len(num_cols) >= 1:
        cat_col = multi_cats[0]
        num_col = num_cols[0]
        groups_data = [
            np.asarray(group[num_col].dropna().to_numpy(dtype=np.float64, copy=True)).copy()
            for _, group in df.groupby(cat_col)
            if len(group[num_col].dropna()) >= 5
        ]

        if len(groups_data) >= 3:
            f_stat, p_val = stats.f_oneway(*groups_data)
            significant = p_val < 0.05
            results.append({
                "test_name": "One-Way ANOVA (Analysis of Variance)",
                "variables": f"{num_col} grouped by {cat_col}",
                "statistic": round(float(f_stat), 4),
                "p_value": float(f"{p_val:.4e}"),
                "is_significant": significant,
                "interpretation": f"Mean {num_col} varies significantly across groups of {cat_col} (F = {f_stat:.2f}, p < 0.05)." if significant else f"No significant difference in group means of {num_col} across {cat_col}.",
                "assumptions": "Assumes normality and independent observations.",
            })

    # 3. Chi-Square Test of Independence between 2 categorical columns
    if len(cat_cols) >= 2:
        c1, c2 = cat_cols[0], cat_cols[1]
        if df[c1].nunique() <= 10 and df[c2].nunique() <= 10:
            contingency = pd.crosstab(df[c1], df[c2])
            contingency_arr = np.asarray(contingency.to_numpy(dtype=np.float64, copy=True)).copy()
            if (contingency_arr >= 5).mean() >= 0.8:
                chi2, p_val, dof, _ = stats.chi2_contingency(contingency_arr)
                significant = p_val < 0.05
                results.append({
                    "test_name": "Chi-Square Test of Independence",
                    "variables": f"{c1} and {c2}",
                    "statistic": round(float(chi2), 4),
                    "p_value": float(f"{p_val:.4e}"),
                    "is_significant": significant,
                    "interpretation": f"Significant association detected between {c1} and {c2} (Chi2 = {chi2:.2f}, p < 0.05)." if significant else f"{c1} and {c2} appear statistically independent.",
                    "assumptions": "Expected frequencies in at least 80% of contingency table cells >= 5.",
                })

    return results
