"""Analytics repository — revenue, orders, customer trend queries."""
import uuid
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_
from app.models.models import Order, Customer, RFMScore, CustomerSegment


class AnalyticsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(self, workspace_id: uuid.UUID, from_date: date | None = None, to_date: date | None = None) -> dict:
        conditions = [Order.workspace_id == workspace_id]
        prev_conditions = [Order.workspace_id == workspace_id]

        if from_date and to_date:
            conditions.append(Order.order_date >= from_date)
            conditions.append(Order.order_date <= to_date)
            delta = (to_date - from_date).days
            prev_from = from_date - timedelta(days=delta + 1)
            prev_to = from_date - timedelta(days=1)
            prev_conditions.append(Order.order_date >= prev_from)
            prev_conditions.append(Order.order_date <= prev_to)

        # Current period
        curr = await self.db.execute(
            select(
                func.coalesce(func.sum(Order.total_price), 0).label("revenue"),
                func.count(Order.id).label("orders"),
                func.count(func.distinct(Order.customer_id)).label("customers"),
            ).where(and_(*conditions))
        )
        curr_row = curr.one()

        # Previous period for change %
        prev = await self.db.execute(
            select(
                func.coalesce(func.sum(Order.total_price), 0).label("revenue"),
                func.count(Order.id).label("orders"),
                func.count(func.distinct(Order.customer_id)).label("customers"),
            ).where(and_(*prev_conditions))
        )
        prev_row = prev.one()

        def pct_change(curr_val, prev_val):
            if prev_val == 0:
                return 0.0
            return round(((curr_val - prev_val) / prev_val) * 100, 1)

        curr_revenue = float(curr_row.revenue)
        curr_orders = curr_row.orders
        curr_customers = curr_row.customers
        curr_aov = curr_revenue / curr_orders if curr_orders > 0 else 0.0

        prev_revenue = float(prev_row.revenue)
        prev_orders = prev_row.orders
        prev_aov = prev_revenue / prev_orders if prev_orders > 0 else 0.0

        # Repeat customer rate
        repeat_result = await self.db.execute(
            select(func.count(Customer.id)).where(
                and_(
                    Customer.workspace_id == workspace_id,
                )
            )
        )
        # Count customers with more than 1 order
        repeat_q = await self.db.execute(
            text("""
                SELECT COUNT(*) FROM (
                    SELECT customer_id FROM orders
                    WHERE workspace_id = :wid
                    GROUP BY customer_id
                    HAVING COUNT(*) > 1
                ) sub
            """),
            {"wid": str(workspace_id)},
        )
        repeat_count = repeat_q.scalar() or 0
        total_cust = curr_customers or 1
        repeat_rate = round((repeat_count / total_cust) * 100, 1)

        return {
            "total_revenue": round(curr_revenue, 2),
            "total_orders": curr_orders,
            "total_customers": curr_customers,
            "avg_order_value": round(curr_aov, 2),
            "repeat_customer_rate": repeat_rate,
            "revenue_change_pct": pct_change(curr_revenue, prev_revenue),
            "orders_change_pct": pct_change(curr_orders, prev_orders),
            "customers_change_pct": pct_change(curr_customers, prev_row.customers),
            "aov_change_pct": pct_change(curr_aov, prev_aov),
        }

    async def get_revenue_trend(self, workspace_id: uuid.UUID, from_date: date, to_date: date) -> list[dict]:
        result = await self.db.execute(
            text("""
                SELECT DATE_TRUNC('month', order_date)::date AS month,
                       SUM(total_price) AS revenue,
                       COUNT(*) AS orders
                FROM orders
                WHERE workspace_id = :wid
                  AND order_date >= :from_date
                  AND order_date <= :to_date
                GROUP BY month
                ORDER BY month
            """),
            {"wid": str(workspace_id), "from_date": str(from_date), "to_date": str(to_date)},
        )
        rows = result.fetchall()
        return [
            {"month": str(r.month)[:7], "date": str(r.month), "revenue": round(float(r.revenue), 2), "orders": r.orders}
            for r in rows
        ]

    async def get_country_revenue(self, workspace_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            text("""
                SELECT country, SUM(total_price) AS revenue, COUNT(*) AS orders
                FROM orders
                WHERE workspace_id = :wid AND country IS NOT NULL
                GROUP BY country
                ORDER BY revenue DESC
                LIMIT 10
            """),
            {"wid": str(workspace_id)},
        )
        return [{"country": r.country, "revenue": round(float(r.revenue), 2), "orders": r.orders} for r in result.fetchall()]

    async def get_top_products(self, workspace_id: uuid.UUID, limit: int = 10) -> list[dict]:
        result = await self.db.execute(
            text("""
                SELECT product, SUM(total_price) AS revenue, SUM(quantity) AS quantity
                FROM orders
                WHERE workspace_id = :wid
                GROUP BY product
                ORDER BY revenue DESC
                LIMIT :limit
            """),
            {"wid": str(workspace_id), "limit": limit},
        )
        return [{"product": r.product, "revenue": round(float(r.revenue), 2), "quantity": int(r.quantity)} for r in result.fetchall()]

    async def get_segment_distribution(self, workspace_id: uuid.UUID) -> list[dict]:
        result = await self.db.execute(
            text("""
                SELECT cs.segment_label,
                       COUNT(*) AS customer_count,
                       COALESCE(SUM(rfm.monetary), 0) AS revenue
                FROM customer_segments cs
                LEFT JOIN rfm_scores rfm ON rfm.customer_id = cs.customer_id
                WHERE cs.workspace_id = :wid
                GROUP BY cs.segment_label
                ORDER BY revenue DESC
            """),
            {"wid": str(workspace_id)},
        )
        rows = result.fetchall()
        total = sum(r.customer_count for r in rows)
        return [
            {
                "segment_label": r.segment_label,
                "count": r.customer_count,
                "percentage": round((r.customer_count / total) * 100, 1) if total > 0 else 0,
                "revenue": round(float(r.revenue), 2),
            }
            for r in rows
        ]
