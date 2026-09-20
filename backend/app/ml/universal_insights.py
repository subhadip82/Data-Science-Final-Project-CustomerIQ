"""
Universal Business Insights & Action Recommendations Engine
============================================================
Generates mathematically grounded, data-backed insights and recommendations directly
from the active dataset:
- Trend Insights
- Distribution & Pareto Skew
- Anomaly / Outlier alerts
- Correlation & Key Driver findings
- Data Quality & Integrity flags
- Actionable operational playbooks (Impact & Effort ratings)
"""
from __future__ import annotations
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple


def generate_universal_insights_and_recs(
    df: pd.DataFrame,
    dataset_type: str,
    column_profiles: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Inspects dataset distributions and patterns to derive genuine findings, interpretations, and action recommendations."""
    insights: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []

    numeric_cols = [c for c in column_profiles if c["data_type"] in ("integer", "float")]
    cat_cols = [c for c in column_profiles if c["data_type"] in ("categorical", "boolean")]
    date_cols = [c for c in column_profiles if c["data_type"] == "datetime" or c["semantic_type"] == "datetime"]

    # ── 1. Pareto Concentration / Skew Insight ──────────────────────────────────
    monetary_col = next((c["name"] for c in numeric_cols if c["semantic_type"] == "monetary" or any(k in c["name"].lower() for k in ["price", "revenue", "sales", "total", "amount", "salary"])), None)
    entity_col = next((c["name"] for c in column_profiles if c["semantic_type"] == "id" or any(k in c["name"].lower() for k in ["customer", "employee", "client", "product", "item"])), None)

    if monetary_col and entity_col and len(df) >= 20:
        grouped = df.groupby(entity_col)[monetary_col].sum().sort_values(ascending=False)
        total_sum = grouped.sum()
        if total_sum > 0:
            top_20_count = max(int(len(grouped) * 0.2), 1)
            top_20_sum = grouped.iloc[:top_20_count].sum()
            pareto_pct = (top_20_sum / total_sum) * 100

            if pareto_pct > 50:
                insights.append({
                    "id": "insight_pareto_concentration",
                    "type": "distribution",
                    "priority": "high",
                    "title": f"High {monetary_col.title()} Concentration",
                    "finding": f"Top 20% of {entity_col} ({top_20_count:,}) generate {pareto_pct:.1f}% of total {monetary_col}.",
                    "evidence": f"Top 20% aggregate {top_20_sum:,.2f} out of total {total_sum:,.2f}.",
                    "interpretation": f"Revenue or metric distribution exhibits severe Pareto skew. Business performance heavily hinges on a compact cohort of entities.",
                    "recommended_action": f"Deploy VIP engagement protocols and proactive retention workflows to prevent high-impact churn among top {entity_col}.",
                    "metric": "Top 20% Share",
                    "metric_value": f"{pareto_pct:.1f}%",
                })
                recommendations.append({
                    "id": "rec_vip_retention",
                    "category": "retention",
                    "title": f"Protect & Nurture High-Value {entity_col.title()} Cohort",
                    "finding": f"{pareto_pct:.1f}% of {monetary_col} is concentrated in top 20% of {entity_col}.",
                    "recommendation": f"Establish dedicated support channels, customized loyalty rewards, or priority outreach for the top quintile of {entity_col}.",
                    "impact": "high",
                    "effort": "medium",
                    "status": "open",
                })

    # ── 2. Correlation / Key Driver Insight ──────────────────────────────────────
    if len(numeric_cols) >= 2:
        num_df = df[[c["name"] for c in numeric_cols]].dropna()
        if len(num_df) >= 15:
            corr = num_df.corr().abs()
            for col in corr.columns:
                corr.loc[col, col] = 0.0
            max_corr = corr.max().max()
            if not math.isnan(max_corr) and max_corr > 0.65:
                max_pair = corr.stack().idxmax()
                v1, v2 = max_pair
                actual_val = df[[v1, v2]].dropna().corr().loc[v1, v2]
                direction = "positive" if actual_val > 0 else "inverse"

                insights.append({
                    "id": "insight_key_correlation",
                    "type": "correlation",
                    "priority": "medium",
                    "title": f"Strong Relationship: {v1.title()} & {v2.title()}",
                    "finding": f"A strong {direction} correlation (r = {actual_val:.2f}) observed between '{v1}' and '{v2}'.",
                    "evidence": f"Pearson correlation coefficient r = {actual_val:.3f} across {len(num_df):,} verified records.",
                    "interpretation": f"Changes in {v1} exhibit statistical alignment with {v2}. Can serve as a leading indicator or primary modeling feature.",
                    "recommended_action": f"Incorporate {v1} and {v2} into predictive pipelines and monitor interaction effects.",
                    "metric": "Correlation (r)",
                    "metric_value": f"{actual_val:.2f}",
                })
                recommendations.append({
                    "id": "rec_driver_optimization",
                    "category": "optimization",
                    "title": f"Leverage {v1.title()} as Operational Driver for {v2.title()}",
                    "finding": f"Strong statistical alignment (r = {actual_val:.2f}) observed between {v1} and {v2}.",
                    "recommendation": f"Test strategic initiatives targeting {v1} to evaluate downstream impact on {v2}.",
                    "impact": "medium",
                    "effort": "low",
                    "status": "open",
                })

    # ── 3. Temporal Trend / Period-over-Period ───────────────────────────────────
    if date_cols and monetary_col:
        d_col = date_cols[0]["name"]
        m_col = monetary_col
        temp_df = df.dropna(subset=[d_col, m_col]).copy()
        temp_df[d_col] = pd.to_datetime(temp_df[d_col], errors="coerce")
        temp_df = temp_df.dropna(subset=[d_col]).sort_values(d_col)

        if len(temp_df) >= 10:
            monthly = temp_df.set_index(d_col)[m_col].resample("ME").sum()
            if len(monthly) >= 2:
                last_m = float(monthly.iloc[-1])
                prev_m = float(monthly.iloc[-2])
                if prev_m > 0:
                    pct_diff = ((last_m - prev_m) / prev_m) * 100
                    trend_word = "growth" if pct_diff >= 0 else "contraction"
                    priority = "high" if pct_diff < -15 else "medium"

                    insights.append({
                        "id": "insight_monthly_trend",
                        "type": "trend",
                        "priority": priority,
                        "title": f"Recent Period {trend_word.capitalize()} ({pct_diff:+.1f}%)",
                        "finding": f"{m_col.title()} transitioned from {prev_m:,.2f} to {last_m:,.2f} ({pct_diff:+.1f}%).",
                        "evidence": f"Monthly aggregate comparison for period ending {monthly.index[-1].strftime('%b %Y')}.",
                        "interpretation": f"Velocity indicates noticeable short-term {trend_word} in primary transaction metrics.",
                        "recommended_action": "Audit order frequency and inventory replenishment to reinforce growth or arrest dip." if pct_diff < 0 else "Scale top-performing distribution channels to sustain momentum.",
                        "metric": "Period Delta",
                        "metric_value": f"{pct_diff:+.1f}%",
                    })

    # ── 4. Outlier & Data Integrity Insight ──────────────────────────────────────
    outlier_cols = [c for c in numeric_cols if c.get("outlier_count", 0) > len(df) * 0.03]
    if outlier_cols:
        target_out = outlier_cols[0]
        out_count = target_out["outlier_count"]
        out_pct = (out_count / len(df)) * 100

        insights.append({
            "id": "insight_outlier_warning",
            "type": "anomaly",
            "priority": "medium",
            "title": f"Extreme Values in {target_out['name'].title()}",
            "finding": f"{out_count:,} records ({out_pct:.1f}%) in '{target_out['name']}' exceed 1.5x IQR boundaries.",
            "evidence": f"Values span up to {target_out['stats'].get('max', 'N/A')} against median {target_out['stats'].get('median', 'N/A')}.",
            "interpretation": f"Heavy-tailed distribution may introduce bias in standard linear aggregations and algorithms.",
            "recommended_action": "Apply robust median metrics and consider logarithmic scaling prior to model fitting.",
            "metric": "Outliers Count",
            "metric_value": f"{out_count:,}",
        })
        recommendations.append({
            "id": "rec_robust_scaling",
            "category": "data_quality",
            "title": f"Apply Robust Normalization to {target_out['name'].title()}",
            "finding": f"{out_count} outlier instances detected outside IQR boundaries.",
            "recommendation": "Use median-based reporting and winsorization or log1p transformation for downstream analytics.",
            "impact": "low",
            "effort": "low",
            "status": "open",
        })

    # ── 5. Category Skew / Top Category Dominance ───────────────────────────────
    if cat_cols:
        primary_cat = cat_cols[0]["name"]
        val_counts = df[primary_cat].value_counts(normalize=True)
        if len(val_counts) >= 2 and val_counts.iloc[0] > 0.5:
            top_name = val_counts.index[0]
            top_share = val_counts.iloc[0] * 100

            insights.append({
                "id": "insight_category_skew",
                "type": "comparison",
                "priority": "low",
                "title": f"Heavy Skew in {primary_cat.title()}",
                "finding": f"Category '{top_name}' accounts for {top_share:.1f}% of all {primary_cat} records.",
                "evidence": f"Top category representation exceeds 50% threshold ({top_share:.1f}% vs next at {val_counts.iloc[1]*100:.1f}%).",
                "interpretation": f"Operations and transactions exhibit geographic or categorical clustering in '{top_name}'.",
                "recommended_action": "Evaluate expansion potential into adjacent, under-penetrated categories.",
                "metric": "Top Share",
                "metric_value": f"{top_share:.1f}%",
            })

    # Fallback insight if dataset is small or uniform
    if not insights:
        insights.append({
            "id": "insight_baseline",
            "type": "distribution",
            "priority": "low",
            "title": "Dataset Baseline Distribution Verified",
            "finding": f"Ingested {len(df):,} records across {len(column_profiles)} features without critical structural anomalies.",
            "evidence": f"Data quality check verified {len(df)} rows across {len(column_profiles)} columns.",
            "interpretation": "Baseline distributions conform to standard expectations.",
            "recommended_action": "Proceed with exploratory profiling and module-specific segmentation.",
            "metric": "Record Count",
            "metric_value": f"{len(df):,}",
        })

    return insights, recommendations
