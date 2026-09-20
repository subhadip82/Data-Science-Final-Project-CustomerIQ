"""
Generate 6 Realistic Test Datasets Across Different Business Domains
=====================================================================
1. sales_test.csv - Sales & Revenue deals
2. hr_test.csv - Human Resources workforce & attrition
3. customer_transactions_test.csv - E-commerce retail transactions (RFM ready)
4. generic_tabular_test.csv - Numerical & categorical scientific features
5. timeseries_test.csv - Sequential sensor / power time-series
6. survey_test.xlsx - Survey responses with text and Likert scales (XLSX test!)
"""
import os
import random
from pathlib import Path
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

DATASETS_DIR = Path(__file__).resolve().parent / "test_datasets"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)


def generate_datasets():
    random.seed(42)
    np.random.seed(42)

    # 1. Sales Dataset (Sales, Deals, Profit, Margin)
    print("Generating 1. sales_test.csv...")
    reps = ["Alice Smith", "Bob Jones", "Carlos Ray", "Diana Prince", "Evan Wright"]
    stages = ["Closed Won", "Closed Lost", "Proposal", "Qualified", "Negotiation"]
    regions = ["North America", "EMEA", "APAC", "LATAM"]

    sales_data = []
    start_date = datetime(2025, 1, 1)
    for i in range(1, 201):
        deal_date = start_date + timedelta(days=random.randint(0, 365))
        amount = round(random.uniform(5000, 120000), 2)
        profit = round(amount * random.uniform(0.15, 0.45), 2)
        sales_data.append({
            "deal_id": f"DEAL-{i:04d}",
            "sales_rep": random.choice(reps),
            "region": random.choice(regions),
            "stage": random.choice(stages),
            "deal_amount": amount,
            "profit": profit,
            "discount_pct": round(random.uniform(0, 25), 1),
            "closed_date": deal_date.strftime("%Y-%m-%d"),
        })
    df_sales = pd.DataFrame(sales_data)
    df_sales.to_csv(DATASETS_DIR / "sales_test.csv", index=False)

    # 2. HR Dataset (Workforce, Salary, Tenure, Attrition)
    print("Generating 2. hr_test.csv...")
    departments = ["Engineering", "Sales", "Marketing", "Human Resources", "Finance", "Operations"]
    roles = ["Associate", "Senior", "Lead", "Manager", "Director"]

    hr_data = []
    for i in range(1, 251):
        tenure = random.randint(1, 15)
        monthly_income = int(3000 + (tenure * random.uniform(400, 800)) + random.uniform(0, 2000))
        attrition = "Yes" if (tenure < 3 and random.random() < 0.35) or (monthly_income < 4500 and random.random() < 0.4) else "No"
        hr_data.append({
            "employee_id": f"EMP-{i:04d}",
            "department": random.choice(departments),
            "job_role": random.choice(roles),
            "monthly_income": monthly_income,
            "years_at_company": tenure,
            "performance_rating": random.choice([2, 3, 3, 4, 4, 5]),
            "overtime": random.choice(["Yes", "No"]),
            "attrition": attrition,
        })
    df_hr = pd.DataFrame(hr_data)
    df_hr.to_csv(DATASETS_DIR / "hr_test.csv", index=False)

    # 3. Customer Transactions Dataset (E-Commerce RFM)
    print("Generating 3. customer_transactions_test.csv...")
    products = [
        ("SKU-101", "Wireless Noise-Cancelling Headphones", 149.99),
        ("SKU-102", "Ergonomic Mechanical Keyboard", 89.50),
        ("SKU-103", "Ultra HD 27-inch Monitor", 299.00),
        ("SKU-104", "USB-C Multiport Hub", 39.99),
        ("SKU-105", "Vertical Ergonomic Mouse", 45.00),
        ("SKU-106", "Smart LED Desk Lamp", 29.95),
    ]
    countries = ["United Kingdom", "Germany", "France", "United States", "Japan", "Australia"]

    tx_data = []
    customers = [f"CUST-{c:04d}" for c in range(1, 81)]
    for inv_num in range(1001, 1351):
        cust = random.choice(customers)
        ctry = random.choice(countries)
        inv_date = datetime(2025, 1, 1) + timedelta(days=random.randint(0, 360), hours=random.randint(8, 20))
        # 1-4 line items per invoice
        for _ in range(random.randint(1, 3)):
            sku, desc, unit_price = random.choice(products)
            qty = random.randint(1, 5)
            tx_data.append({
                "invoice_no": f"INV-{inv_num}",
                "customer_id": cust,
                "description": desc,
                "quantity": qty,
                "unit_price": unit_price,
                "total_amount": round(qty * unit_price, 2),
                "invoice_date": inv_date.strftime("%Y-%m-%d %H:%M:%S"),
                "country": ctry,
            })
    df_tx = pd.DataFrame(tx_data)
    df_tx.to_csv(DATASETS_DIR / "customer_transactions_test.csv", index=False)

    # 4. Generic Tabular Dataset (Feature Measurements & Groups)
    print("Generating 4. generic_tabular_test.csv...")
    gen_data = []
    for i in range(1, 181):
        g = random.choice(["Group Alpha", "Group Beta", "Group Gamma"])
        base = 50 if g == "Group Alpha" else 80 if g == "Group Beta" else 110
        f_a = round(np.random.normal(base, 12), 2)
        f_b = round(f_a * 0.75 + np.random.normal(10, 5), 2)
        f_c = round(np.random.exponential(15), 2)
        f_d = round(np.random.uniform(1.0, 10.0), 3)
        gen_data.append({
            "sample_index": i,
            "feature_a": f_a,
            "feature_b": f_b,
            "feature_c": f_c,
            "ratio_d": f_d,
            "cohort_group": g,
            "target_score": round(f_a * 0.4 + f_b * 0.3 + random.uniform(5, 15), 2),
        })
    df_gen = pd.DataFrame(gen_data)
    df_gen.to_csv(DATASETS_DIR / "generic_tabular_test.csv", index=False)

    # 5. Time Series Dataset (Power Consumption & Sensor Readings)
    print("Generating 5. timeseries_test.csv...")
    ts_data = []
    base_time = datetime(2025, 6, 1, 0, 0, 0)
    for minute_step in range(0, 300):
        t = base_time + timedelta(minutes=minute_step * 15)
        kwh = round(45.0 + 15.0 * np.sin(minute_step / 12.0) + random.uniform(-3, 3), 2)
        volts = round(230.0 + random.uniform(-4, 4), 1)
        temp = round(22.0 + (minute_step / 60.0) + random.uniform(-0.5, 0.5), 1)
        ts_data.append({
            "timestamp": t.strftime("%Y-%m-%d %H:%M:%S"),
            "power_kwh": kwh,
            "voltage": volts,
            "ambient_temp_c": temp,
        })
    df_ts = pd.DataFrame(ts_data)
    df_ts.to_csv(DATASETS_DIR / "timeseries_test.csv", index=False)

    # 6. Survey & Text Dataset in XLSX format (XLSX test!)
    print("Generating 6. survey_test.xlsx...")
    feedback_samples = [
        "The software workflow is intuitive and saves our analytics team several hours each week.",
        "Reports are well presented, although adding custom color palettes would be a welcome enhancement.",
        "Fast data loading and seamless CSV parsing. Very happy with the automated clustering.",
        "Clustering visualisations are great, would love automated scheduled email reports.",
        "Exceptional platform for rapid exploratory data profiling.",
        "Simple navigation and robust data quality scoring. Highly recommended.",
    ]
    survey_data = []
    for i in range(1, 151):
        sat = random.choice([3, 4, 4, 5, 5, 5])
        nps = random.choice([7, 8, 9, 9, 10])
        survey_data.append({
            "respondent_id": f"RESP-{i:03d}",
            "satisfaction_score": sat,
            "nps_rating": nps,
            "ease_of_use_rating": random.choice([3, 4, 5]),
            "department_type": random.choice(["Marketing", "Finance", "Product", "Operations"]),
            "feedback_comments": random.choice(feedback_samples),
        })
    df_survey = pd.DataFrame(survey_data)
    df_survey.to_excel(DATASETS_DIR / "survey_test.xlsx", index=False)

    print("All 6 test datasets generated successfully in:", DATASETS_DIR)


if __name__ == "__main__":
    generate_datasets()
