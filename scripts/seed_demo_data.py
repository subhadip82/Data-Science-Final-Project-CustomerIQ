"""
CustomerIQ Demo Data Seed Script
=================================
Generates realistic e-commerce data for development/demo purposes.
Run: python scripts/seed_demo_data.py
"""
import os, sys, uuid, random, asyncio
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import asyncpg
from faker import Faker

fake = Faker()
random.seed(42)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://customeriq:customeriq@localhost:5432/customeriq").replace("postgresql+asyncpg://", "postgresql://")

PRODUCTS = [
    ("Premium Laptop Stand", "Electronics", 2499), ("Wireless Keyboard", "Electronics", 799),
    ("USB-C Hub 7-in-1", "Electronics", 1299), ("Noise Cancelling Earbuds", "Electronics", 3499),
    ("Ergonomic Mouse", "Electronics", 999), ("4K Webcam", "Electronics", 2199),
    ("LED Desk Lamp", "Home Office", 699), ("Standing Desk Converter", "Home Office", 4999),
    ("Cable Management Kit", "Home Office", 299), ("Monitor Arm", "Home Office", 1499),
    ("Mechanical Keyboard", "Electronics", 3999), ("Screen Cleaner Kit", "Accessories", 199),
    ("Laptop Sleeve 15\"", "Accessories", 599), ("Power Bank 20000mAh", "Electronics", 1799),
    ("Smart Watch Band", "Accessories", 399), ("Blue Light Glasses", "Health", 899),
    ("Posture Corrector", "Health", 1199), ("Desk Plant Pot", "Home Office", 349),
    ("Notebook A5 Pack", "Stationery", 249), ("Pen Holder Organiser", "Stationery", 199),
]
COUNTRIES = ["United Kingdom", "Germany", "France", "Netherlands", "Belgium",
             "Spain", "Italy", "Sweden", "Denmark", "Poland", "India", "USA"]
SEGMENTS = ["VIP Customers", "Loyal Customers", "Potential Customers", "At-Risk Customers"]

DEMO_CLERK_ID = "user_demo_seed_customeriq"
DEMO_EMAIL = "demo@customeriq.app"
DEMO_NAME = "Demo User"


async def seed():
    print("🌱 CustomerIQ Demo Seed Starting...")
    conn = await asyncpg.connect(DATABASE_URL)

    # ── Users & Workspace ────────────────────────────────────────────────────
    user_id = str(uuid.uuid4())
    workspace_id = str(uuid.uuid4())

    existing = await conn.fetchrow("SELECT id FROM users WHERE clerk_user_id = $1", DEMO_CLERK_ID)
    if existing:
        user_id = str(existing["id"])
        ws = await conn.fetchrow("SELECT id FROM workspaces WHERE owner_id = $1", user_id)
        workspace_id = str(ws["id"]) if ws else workspace_id
        print(f"✓ Demo user already exists (id={user_id})")
    else:
        await conn.execute("""
            INSERT INTO users (id, clerk_user_id, email, full_name, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
        """, user_id, DEMO_CLERK_ID, DEMO_EMAIL, DEMO_NAME)
        await conn.execute("""
            INSERT INTO workspaces (id, name, owner_id, plan, created_at)
            VALUES ($1, $2, $3, $4, NOW())
        """, workspace_id, "Demo Workspace", user_id, "pro")
        print(f"✓ Created demo user and workspace")

    # ── Customers ────────────────────────────────────────────────────────────
    today = date.today()
    num_customers = 500
    customer_ids = {}

    # Clear existing demo data
    for tbl in ["customer_segments", "rfm_scores", "orders", "customers", "notifications", "reports"]:
        await conn.execute(f"DELETE FROM {tbl} WHERE workspace_id = $1", workspace_id)
    print(f"✓ Cleared existing workspace data")

    print(f"🔧 Creating {num_customers} customers...")
    for i in range(num_customers):
        cid = str(uuid.uuid4())
        country = random.choice(COUNTRIES)
        name = fake.name()
        join_date = today - timedelta(days=random.randint(30, 1000))
        code = f"CUST{10000 + i}"
        customer_ids[code] = (cid, country)
        await conn.execute("""
            INSERT INTO customers (id, workspace_id, customer_code, name, country, join_date, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
        """, cid, workspace_id, code, name, country, join_date)

    print(f"✓ Created {num_customers} customers")

    # ── Orders ───────────────────────────────────────────────────────────────
    print(f"🔧 Generating orders...")
    customer_codes = list(customer_ids.keys())
    order_count = 0

    # Assign behaviour profiles
    vip_codes = customer_codes[:50]         # ~10% VIP — high freq, high value, recent
    loyal_codes = customer_codes[50:175]    # ~25% Loyal — moderate freq, recent
    potential_codes = customer_codes[175:325] # ~30% Potential — low freq
    atrisk_codes = customer_codes[325:]     # ~35% At-Risk — old purchases

    profiles = {
        "vip": (vip_codes, 12, 30, 0, 90),      # 12-30 orders, within last 90 days
        "loyal": (loyal_codes, 4, 12, 0, 180),
        "potential": (potential_codes, 1, 4, 60, 300),
        "atrisk": (atrisk_codes, 1, 3, 180, 700),
    }

    for profile, (codes, min_orders, max_orders, recent_offset, max_age) in profiles.items():
        for code in codes:
            cid, country = customer_ids[code]
            n_orders = random.randint(min_orders, max_orders)
            for _ in range(n_orders):
                days_ago = random.randint(recent_offset, max_age)
                order_date = today - timedelta(days=days_ago)
                product, category, base_price = random.choice(PRODUCTS)
                qty = random.randint(1, 4)
                unit_price = base_price * random.uniform(0.85, 1.25)
                await conn.execute("""
                    INSERT INTO orders (id, workspace_id, customer_id, invoice_id, order_date, product, category, quantity, unit_price, total_price, country)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """, str(uuid.uuid4()), workspace_id, cid,
                    f"INV-{random.randint(100000, 999999)}",
                    order_date, product, category, qty,
                    round(unit_price, 2), round(unit_price * qty, 2), country)
                order_count += 1

    print(f"✓ Created {order_count} orders")

    # ── RFM Scores ───────────────────────────────────────────────────────────
    print("🔧 Computing RFM scores...")
    customer_stats = await conn.fetch("""
        SELECT c.id, c.customer_code,
               MAX(o.order_date) AS last_purchase,
               COUNT(DISTINCT o.invoice_id) AS frequency,
               SUM(o.total_price) AS monetary
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        WHERE c.workspace_id = $1
        GROUP BY c.id, c.customer_code
    """, workspace_id)

    rfm_records = []
    for row in customer_stats:
        if not row["last_purchase"]:
            continue
        recency = (today - row["last_purchase"]).days
        freq = int(row["frequency"] or 0)
        monetary = float(row["monetary"] or 0)
        rfm_records.append((str(row["id"]), recency, freq, monetary))

    # Compute quintile scores
    recencies = sorted([r[1] for r in rfm_records])
    freqs = sorted([r[2] for r in rfm_records])
    monetaries = sorted([r[3] for r in rfm_records])

    def quintile(val, sorted_list, invert=False):
        idx = sorted_list.index(val) / max(len(sorted_list) - 1, 1)
        score = int(idx * 4) + 1
        return 6 - score if invert else score

    for cid, recency, freq, monetary in rfm_records:
        r = quintile(recency, recencies, invert=True)
        f = quintile(freq, freqs)
        m = quintile(monetary, monetaries)
        rfm_score = r * 100 + f * 10 + m
        await conn.execute("""
            INSERT INTO rfm_scores (id, workspace_id, customer_id, recency_days, frequency, monetary, r_score, f_score, m_score, rfm_score, computed_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        """, str(uuid.uuid4()), workspace_id, cid, recency, freq, round(monetary, 2), r, f, m, rfm_score)

    print(f"✓ Computed RFM for {len(rfm_records)} customers")

    # ── Customer Segments ─────────────────────────────────────────────────────
    print("🔧 Assigning segments...")
    segment_map = {}
    for code in vip_codes:
        segment_map[customer_ids[code][0]] = ("VIP Customers", 0)
    for code in loyal_codes:
        segment_map[customer_ids[code][0]] = ("Loyal Customers", 1)
    for code in potential_codes:
        segment_map[customer_ids[code][0]] = ("Potential Customers", 2)
    for code in atrisk_codes:
        segment_map[customer_ids[code][0]] = ("At-Risk Customers", 3)

    for cid, (seg, cl) in segment_map.items():
        pca_x = random.gauss(cl * 2, 0.8)
        pca_y = random.gauss(cl, 0.8)
        await conn.execute("""
            INSERT INTO customer_segments (id, workspace_id, customer_id, segment_label, cluster_id, pca_x, pca_y, assigned_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        """, str(uuid.uuid4()), workspace_id, cid, seg, cl, pca_x, pca_y)

    print(f"✓ Assigned segments")

    # ── Notifications ─────────────────────────────────────────────────────────
    notifications = [
        ("Dataset Processed Successfully", "500 customers imported. RFM scores and segments updated.", "success"),
        ("VIP Customers Identified", "50 VIP customers identified generating 38% of total revenue.", "info"),
        ("At-Risk Alert", "175 customers are classified as At-Risk. Consider launching a retention campaign.", "warning"),
        ("New Product Update", "CustomerIQ v1.2 — PCA visualisation and export features added.", "info"),
        ("Monthly Report Ready", "Your October analytics report is available for download.", "success"),
    ]
    for title, msg, ntype in notifications:
        await conn.execute("""
            INSERT INTO notifications (id, workspace_id, user_id, title, message, type, is_read, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, false, NOW() - INTERVAL '1 hour' * $7)
        """, str(uuid.uuid4()), workspace_id, user_id, title, msg, ntype, random.randint(0, 72))

    # ── Reports ───────────────────────────────────────────────────────────────
    reports = [
        ("Monthly Analytics Report — October", "analytics", "completed"),
        ("Customer Segmentation Report Q3", "segments", "completed"),
        ("RFM Analysis Report", "rfm", "completed"),
        ("Sales Performance Report", "sales", "completed"),
    ]
    for name, rtype, status in reports:
        await conn.execute("""
            INSERT INTO reports (id, workspace_id, name, type, status, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '1 day' * $6)
        """, str(uuid.uuid4()), workspace_id, name, rtype, status, random.randint(0, 30))

    await conn.close()
    print("\n✅ Seed complete!")
    print(f"   Workspace ID : {workspace_id}")
    print(f"   Clerk User ID: {DEMO_CLERK_ID}")
    print(f"   Customers    : {num_customers}")
    print(f"   Orders       : {order_count}")
    print(f"\n💡 Add this to your Clerk dashboard or use the demo login flow.")


if __name__ == "__main__":
    asyncio.run(seed())
