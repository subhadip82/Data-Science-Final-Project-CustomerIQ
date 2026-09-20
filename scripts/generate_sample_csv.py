"""Generate a sample retail CSV for testing upload."""
import csv
import random
from datetime import datetime, timedelta

random.seed(42)

products = [
    ("22423", "REGENCY CAKESTAND 3 TIER", 12.75),
    ("85123A", "WHITE HANGING HEART T-LIGHT HOLDER", 2.95),
    ("47566", "PARTY BUNTING", 4.95),
    ("84879", "ASSORTED COLOUR BIRD ORNAMENT", 1.69),
    ("22720", "SET OF 3 CAKE TINS PANTRY DESIGN", 4.95),
    ("20725", "LUNCH BAG RED RETROSPOT", 1.65),
    ("21212", "PACK OF 72 RETROSPOT CAKE CASES", 0.55),
    ("22383", "LUNCH BAG SUKI DESIGN", 1.65),
    ("22086", "PAPER CHAIN KIT 50'S CHRISTMAS", 2.95),
    ("21931", "JUMBO STORAGE BAG SUKI", 2.08),
    ("22411", "JUMBO SHOPPER VINTAGE RED PAISLEY", 2.08),
    ("23203", "JUMBO BAG DOILEY PATTERNS", 2.08),
]

countries = ["United Kingdom", "Germany", "France", "EIRE", "Spain", "Netherlands", "Belgium", "Switzerland", "Australia"]

customers = [f"1{random.randint(2000, 8000)}" for _ in range(80)]

start_date = datetime(2023, 1, 1)

rows = []
for i in range(1, 600):
    inv_no = f"5{36000 + (i // 5)}"
    code, desc, price = random.choice(products)
    qty = random.randint(1, 12)
    dt = start_date + timedelta(days=random.randint(0, 360), hours=random.randint(8, 18), minutes=random.randint(0, 59))
    cid = random.choice(customers)
    country = "United Kingdom" if random.random() < 0.8 else random.choice(countries)
    rows.append({
        "InvoiceNo": inv_no,
        "StockCode": code,
        "Description": desc,
        "Quantity": qty,
        "InvoiceDate": dt.strftime("%Y-%m-%d %H:%M:%S"),
        "UnitPrice": price,
        "CustomerID": cid,
        "Country": country
    })

with open(r"c:\Users\SUBHADIP BERA\OneDrive\Desktop\Final Project\frontend\public\data\sample_retail_data.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["InvoiceNo", "StockCode", "Description", "Quantity", "InvoiceDate", "UnitPrice", "CustomerID", "Country"])
    writer.writeheader()
    writer.writerows(rows)

print("Sample retail data CSV generated with", len(rows), "rows")
