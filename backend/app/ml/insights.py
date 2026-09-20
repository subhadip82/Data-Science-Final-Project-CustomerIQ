"""Insight engine — rule-based business insight generation."""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def generate_insights(db: AsyncSession, workspace_id: uuid.UUID) -> list[dict]:
    """Generate business insights from real database metrics."""
    wid = str(workspace_id)
    insights = []

    # ── 1. VIP revenue concentration ──────────────────────────────────────────
    vip_q = await db.execute(text("""
        SELECT
            SUM(CASE WHEN cs.segment_label = 'VIP Customers' THEN rfm.monetary ELSE 0 END) AS vip_rev,
            SUM(rfm.monetary) AS total_rev,
            COUNT(CASE WHEN cs.segment_label = 'VIP Customers' THEN 1 END) AS vip_count,
            COUNT(*) AS total_count
        FROM rfm_scores rfm
        JOIN customer_segments cs ON cs.customer_id = rfm.customer_id
        WHERE rfm.workspace_id = :wid
    """), {"wid": wid})
    row = vip_q.fetchone()
    if row and row.total_rev and float(row.total_rev) > 0:
        vip_pct = round(float(row.vip_rev or 0) / float(row.total_rev) * 100, 1)
        vip_count_pct = round(int(row.vip_count or 0) / int(row.total_count) * 100, 1) if row.total_count else 0
        if vip_pct > 40:
            insights.append({
                "id": "vip-concentration",
                "category": "opportunity",
                "title": "VIP Customers Drive Your Revenue",
                "description": f"Your top {vip_count_pct}% VIP customers generate {vip_pct}% of total revenue. Investing in their retention has outsized ROI.",
                "metric": "VIP Revenue Share",
                "metric_value": f"{vip_pct}%",
                "priority": "high",
                "action_label": "Launch VIP Programme",
            })

    # ── 2. At-Risk customer count ──────────────────────────────────────────────
    risk_q = await db.execute(text("""
        SELECT COUNT(*) AS at_risk_count,
               (SELECT COUNT(*) FROM customer_segments WHERE workspace_id = :wid) AS total
        FROM customer_segments
        WHERE workspace_id = :wid AND segment_label = 'At-Risk Customers'
    """), {"wid": wid})
    risk_row = risk_q.fetchone()
    if risk_row and risk_row.total and int(risk_row.total) > 0:
        risk_pct = round(int(risk_row.at_risk_count) / int(risk_row.total) * 100, 1)
        if risk_pct > 15:
            insights.append({
                "id": "at-risk-warning",
                "category": "warning",
                "title": "At-Risk Customers Need Attention",
                "description": f"{risk_pct}% of your customers are classified as at-risk. They haven't purchased recently and may churn without targeted action.",
                "metric": "At-Risk Share",
                "metric_value": f"{risk_pct}%",
                "priority": "high",
                "action_label": "Run Retention Campaign",
            })

    # ── 3. Repeat purchase rate ────────────────────────────────────────────────
    repeat_q = await db.execute(text("""
        SELECT
            COUNT(CASE WHEN frequency > 1 THEN 1 END) AS repeat_count,
            COUNT(*) AS total
        FROM rfm_scores
        WHERE workspace_id = :wid
    """), {"wid": wid})
    rr = repeat_q.fetchone()
    if rr and rr.total and int(rr.total) > 0:
        repeat_rate = round(int(rr.repeat_count) / int(rr.total) * 100, 1)
        category = "growth" if repeat_rate > 50 else "recommendation"
        insights.append({
            "id": "repeat-rate",
            "category": category,
            "title": "Repeat Purchase Rate" + (" is Strong" if repeat_rate > 50 else " Needs Improvement"),
            "description": f"{repeat_rate}% of your customers have made more than one purchase. " +
                           ("This indicates strong loyalty." if repeat_rate > 50 else "Improving this metric significantly impacts LTV."),
            "metric": "Repeat Rate",
            "metric_value": f"{repeat_rate}%",
            "priority": "medium",
            "action_label": "Improve with Cross-sell",
        })

    # ── 4. Top country opportunity ─────────────────────────────────────────────
    country_q = await db.execute(text("""
        SELECT country, SUM(total_price) AS rev
        FROM orders
        WHERE workspace_id = :wid AND country IS NOT NULL
        GROUP BY country
        ORDER BY rev DESC
        LIMIT 3
    """), {"wid": wid})
    countries = country_q.fetchall()
    if countries and len(countries) >= 2:
        top = countries[0]
        total_rev_q = await db.execute(text("SELECT SUM(total_price) FROM orders WHERE workspace_id = :wid"), {"wid": wid})
        total_rev = float(total_rev_q.scalar() or 1)
        top_pct = round(float(top.rev) / total_rev * 100, 1)
        if top_pct > 30:
            insights.append({
                "id": "country-concentration",
                "category": "recommendation",
                "title": f"{top.country} Dominates Sales",
                "description": f"{top_pct}% of revenue comes from {top.country}. Consider expanding marketing in {countries[1].country} and {countries[2].country if len(countries) > 2 else 'other regions'} to reduce geographic risk.",
                "metric": "Top Country Share",
                "metric_value": f"{top_pct}%",
                "priority": "medium",
                "action_label": "Explore New Markets",
            })

    # ── 5. Average Order Value insight ────────────────────────────────────────
    aov_q = await db.execute(text("""
        SELECT AVG(total_price) AS aov,
               PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_price) AS median_order
        FROM orders WHERE workspace_id = :wid
    """), {"wid": wid})
    aov_row = aov_q.fetchone()
    if aov_row and aov_row.aov:
        aov = float(aov_row.aov)
        median = float(aov_row.median_order)
        if aov > median * 1.5:
            insights.append({
                "id": "aov-skew",
                "category": "opportunity",
                "title": "Large Orders Skew Your Average",
                "description": f"Average order value (₹{aov:,.0f}) is significantly higher than the median (₹{median:,.0f}), suggesting a few large buyers. Consider bundle pricing to lift median orders.",
                "metric": "AOV vs Median",
                "metric_value": f"₹{aov:,.0f} / ₹{median:,.0f}",
                "priority": "low",
                "action_label": "Create Bundle Offers",
            })

    return insights
