"""Customer repository — list, detail, search, filter."""
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, or_
from app.models.models import Customer, Order, RFMScore, CustomerSegment


class CustomerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_customers(
        self,
        workspace_id: uuid.UUID,
        page: int = 1,
        page_size: int = 25,
        search: str | None = None,
        segment: str | None = None,
        country: str | None = None,
        sort_by: str = "total_revenue",
        sort_order: str = "desc",
    ) -> dict:
        offset = (page - 1) * page_size

        # Build query with joins
        query = text("""
            SELECT
                c.id, c.customer_code, c.name, c.country, c.status,
                COUNT(DISTINCT o.id) AS total_orders,
                COALESCE(SUM(o.total_price), 0) AS total_revenue,
                rfm.recency_days, rfm.frequency, rfm.monetary, rfm.rfm_score,
                cs.segment_label
            FROM customers c
            LEFT JOIN orders o ON o.customer_id = c.id
            LEFT JOIN rfm_scores rfm ON rfm.customer_id = c.id
            LEFT JOIN customer_segments cs ON cs.customer_id = c.id
            WHERE c.workspace_id = :wid
              {search_clause}
              {segment_clause}
              {country_clause}
            GROUP BY c.id, c.customer_code, c.name, c.country, c.status,
                     rfm.recency_days, rfm.frequency, rfm.monetary, rfm.rfm_score,
                     cs.segment_label
            ORDER BY {sort_col} {sort_dir}
            LIMIT :limit OFFSET :offset
        """.format(
            search_clause="AND (c.name ILIKE :search OR c.customer_code ILIKE :search)" if search else "",
            segment_clause="AND cs.segment_label = :segment" if segment else "",
            country_clause="AND c.country ILIKE :country" if country else "",
            sort_col=self._safe_sort_col(sort_by),
            sort_dir="DESC" if sort_order == "desc" else "ASC",
        ))

        count_query = text("""
            SELECT COUNT(DISTINCT c.id)
            FROM customers c
            LEFT JOIN customer_segments cs ON cs.customer_id = c.id
            WHERE c.workspace_id = :wid
              {search_clause}
              {segment_clause}
              {country_clause}
        """.format(
            search_clause="AND (c.name ILIKE :search OR c.customer_code ILIKE :search)" if search else "",
            segment_clause="AND cs.segment_label = :segment" if segment else "",
            country_clause="AND c.country ILIKE :country" if country else "",
        ))

        params = {"wid": str(workspace_id), "limit": page_size, "offset": offset}
        count_params = {"wid": str(workspace_id)}
        if search:
            params["search"] = f"%{search}%"
            count_params["search"] = f"%{search}%"
        if segment:
            params["segment"] = segment
            count_params["segment"] = segment
        if country:
            params["country"] = f"%{country}%"
            count_params["country"] = f"%{country}%"

        result = await self.db.execute(query, params)
        count_result = await self.db.execute(count_query, count_params)

        rows = result.fetchall()
        total = count_result.scalar() or 0

        items = [
            {
                "id": r.id,
                "customer_code": r.customer_code,
                "name": r.name,
                "country": r.country,
                "status": r.status,
                "total_orders": int(r.total_orders),
                "total_revenue": float(r.total_revenue),
                "recency_days": r.recency_days,
                "frequency": r.frequency,
                "monetary": float(r.monetary) if r.monetary is not None else None,
                "rfm_score": r.rfm_score,
                "segment_label": r.segment_label,
            }
            for r in rows
        ]

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, (total + page_size - 1) // page_size),
        }

    def _safe_sort_col(self, col: str) -> str:
        allowed = {
            "total_revenue": "COALESCE(SUM(o.total_price), 0)",
            "total_orders": "COUNT(DISTINCT o.id)",
            "recency_days": "rfm.recency_days",
            "frequency": "rfm.frequency",
            "monetary": "rfm.monetary",
            "rfm_score": "rfm.rfm_score",
            "name": "c.name",
            "country": "c.country",
        }
        return allowed.get(col, "COALESCE(SUM(o.total_price), 0)")

    async def get_customer_detail(self, workspace_id: uuid.UUID, customer_id: uuid.UUID) -> dict | None:
        result = await self.db.execute(
            text("""
                SELECT c.*,
                       rfm.recency_days, rfm.frequency, rfm.monetary,
                       rfm.r_score, rfm.f_score, rfm.m_score, rfm.rfm_score,
                       cs.segment_label, cs.pca_x, cs.pca_y,
                       COUNT(DISTINCT o.id) AS total_orders,
                       COALESCE(SUM(o.total_price), 0) AS total_revenue,
                       MAX(o.order_date) AS last_purchase_date
                FROM customers c
                LEFT JOIN orders o ON o.customer_id = c.id
                LEFT JOIN rfm_scores rfm ON rfm.customer_id = c.id
                LEFT JOIN customer_segments cs ON cs.customer_id = c.id
                WHERE c.id = :cid AND c.workspace_id = :wid
                GROUP BY c.id, rfm.recency_days, rfm.frequency, rfm.monetary,
                         rfm.r_score, rfm.f_score, rfm.m_score, rfm.rfm_score,
                         cs.segment_label, cs.pca_x, cs.pca_y
            """),
            {"cid": str(customer_id), "wid": str(workspace_id)},
        )
        row = result.fetchone()
        if not row:
            return None

        # Get orders
        orders_result = await self.db.execute(
            text("""
                SELECT * FROM orders
                WHERE customer_id = :cid
                ORDER BY order_date DESC
                LIMIT 50
            """),
            {"cid": str(customer_id)},
        )
        orders = [dict(o._mapping) for o in orders_result.fetchall()]

        total_orders = int(row.total_orders)
        total_revenue = float(row.total_revenue)
        aov = total_revenue / total_orders if total_orders > 0 else 0.0

        return {
            "id": row.id,
            "customer_code": row.customer_code,
            "name": row.name,
            "email": row.email,
            "country": row.country,
            "join_date": row.join_date,
            "status": row.status,
            "total_orders": total_orders,
            "total_revenue": round(total_revenue, 2),
            "avg_order_value": round(aov, 2),
            "last_purchase_date": row.last_purchase_date,
            "recency_days": row.recency_days,
            "frequency": row.frequency,
            "monetary": float(row.monetary) if row.monetary else None,
            "r_score": row.r_score,
            "f_score": row.f_score,
            "m_score": row.m_score,
            "rfm_score": row.rfm_score,
            "segment_label": row.segment_label,
            "pca_x": row.pca_x,
            "pca_y": row.pca_y,
            "orders": orders,
            "recommended_actions": self._get_actions(row.segment_label),
        }

    def _get_actions(self, segment: str | None) -> list[str]:
        actions = {
            "VIP Customers": ["Offer exclusive loyalty rewards", "Provide early access to new products", "Assign dedicated account manager"],
            "Loyal Customers": ["Cross-sell complementary products", "Upsell premium tiers", "Send personalised thank-you offers"],
            "Potential Customers": ["Send promotional offers", "Encourage product discovery", "Offer first-time repeat-purchase discount"],
            "At-Risk Customers": ["Launch win-back email campaign", "Offer special retention discount", "Schedule proactive outreach"],
        }
        return actions.get(segment or "", ["Review purchase history", "Engage with personalised communication"])
