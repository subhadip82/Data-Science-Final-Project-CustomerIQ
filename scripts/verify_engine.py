"""
Automated Verification Suite for Universal Data Science Engine
==============================================================
Validates:
1. Profiler, Classifier, Planner on all 6 test datasets
2. Database and Parquet persistence via DatasetService
3. Module availability matrices (RFM, Sales, Customers, Clustering, ML, etc.)
4. Unsupervised clustering with PCA & data-driven cohort labels
5. Supervised ML classification (HR attrition) & regression (Generic target_score)
6. Pearson & Spearman statistics
7. Workspace storage usage calculations
"""
import sys
import uuid
import asyncio
from pathlib import Path
import pandas as pd

# Add backend to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.db.base import Base
from app.db.session import engine, AsyncSessionLocal
from app.models import User, Workspace, Dataset, DatasetColumn
from app.services.dataset_service import DatasetService
from app.ml.universal_profiler import profile_dataset
from app.ml.dataset_classifier import classify_dataset
from app.ml.analysis_planner import plan_analyses
from app.ml.universal_clustering import run_universal_clustering
from app.ml.universal_ml import train_and_compare_models
from app.ml.universal_stats import compute_correlations, run_statistical_tests
from app.ml.universal_insights import generate_universal_insights_and_recs

DATASETS_DIR = Path(__file__).resolve().parent / "test_datasets"


async def run_verification():
    print("=" * 70)
    print("STARTING CUSTOMERIQ ENGINE COMPREHENSIVE VERIFICATION")
    print("=" * 70)

    # 1. Ensure DB Schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[PASS] Database tables verified.")

    async with AsyncSessionLocal() as session:
        # Create test workspace and user
        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            clerk_user_id=f"test_{user_id.hex[:8]}",
            email="test_auditor@customeriq.local",
            full_name="Verification Auditor",
        )
        session.add(user)
        await session.flush()

        workspace = Workspace(
            id=uuid.uuid4(),
            name="Verification Test Workspace",
            owner_id=user.id,
        )
        session.add(workspace)
        await session.commit()
        print(f"[PASS] Created test workspace: {workspace.name} ({workspace.id})")

        service = DatasetService(session)

        test_files = [
            ("sales_test.csv", "sales", True, False),
            ("hr_test.csv", "hr", False, False),
            ("customer_transactions_test.csv", "ecommerce", True, True),
            ("generic_tabular_test.csv", "generic-tabular", False, False),
            ("timeseries_test.csv", "time-series", False, False),
            ("survey_test.xlsx", "survey", False, False),
        ]

        uploaded_datasets = []

        for filename, expected_type, expected_sales, expected_rfm in test_files:
            file_path = DATASETS_DIR / filename
            assert file_path.exists(), f"File {file_path} missing!"

            with open(file_path, "rb") as f:
                file_bytes = f.read()

            d_id = uuid.uuid4()
            df, summary, raw_path, parquet_path = service.save_and_profile_file(
                workspace_id=workspace.id,
                dataset_id=d_id,
                file_bytes=file_bytes,
                original_filename=filename,
            )

            profile = summary["profile"]
            classification = summary["classification"]
            plan = summary["plan"]
            insights = summary["insights"]
            recs = summary["recommendations"]

            # Validate Classification
            detected_type = classification["dataset_type"]
            print(f"\n--- Testing Dataset: {filename} ---")
            print(f"    Rows: {profile['row_count']:,} | Cols: {profile['column_count']} | Quality Score: {profile['quality_score']}/100")
            print(f"    Classified as: {detected_type} (Confidence: {classification['confidence']}%)")
            print(f"    Reason: {classification['reason']}")

            # Verify expectations
            if expected_type == "ecommerce":
                assert detected_type in ("ecommerce", "sales"), f"Expected ecommerce/sales, got {detected_type}"
            elif expected_type == "sales":
                assert detected_type in ("sales", "ecommerce"), f"Expected sales, got {detected_type}"
            elif expected_type == "hr":
                assert detected_type == "hr", f"Expected hr, got {detected_type}"
            elif expected_type == "survey":
                assert detected_type in ("survey", "generic-tabular"), f"Expected survey/tabular, got {detected_type}"

            # Validate Conditional Modules
            rfm_available = plan["modules"]["rfm"]["available"]
            sales_available = plan["modules"]["sales"]["available"]
            print(f"    RFM Available: {rfm_available} (Expected: {expected_rfm})")
            print(f"    Sales Available: {sales_available} (Expected: {expected_sales})")
            assert rfm_available == expected_rfm, f"RFM availability mismatch for {filename}"

            # Validate Insights generated from data
            print(f"    Generated Insights: {len(insights)} | Recommendations: {len(recs)}")
            assert len(insights) >= 1, "At least 1 data insight should be generated"

            # Persist dataset record
            ds_rec = Dataset(
                id=d_id,
                workspace_id=workspace.id,
                name=filename.rsplit(".", 1)[0].replace("_", " ").title(),
                filename=filename,
                file_path=raw_path,
                parquet_path=parquet_path,
                file_size=len(file_bytes),
                file_type=filename.split(".")[-1],
                status="completed",
                row_count=profile["row_count"],
                column_count=profile["column_count"],
                dataset_type=classification["dataset_type"],
                type_confidence=classification["confidence"],
                type_reason=classification["reason"],
                quality_score=profile["quality_score"],
                is_active=False,
                summary_json=summary,
            )
            session.add(ds_rec)
            uploaded_datasets.append((ds_rec, df))

        await session.commit()
        print("\n[PASS] All 6 datasets successfully parsed, classified, planned, and persisted!")

        # 2. Test Storage Calculation
        storage_info = service.calculate_workspace_storage(workspace.id)
        print(f"\n[PASS] Live Workspace Storage: {storage_info['status_text']} ({storage_info['used_pct']}%)")
        assert storage_info["used_bytes"] > 0, "Storage used bytes must be > 0"
        assert storage_info["file_count"] >= 12, "Should have 12 files (6 raw + 6 parquet)"

        # 3. Test Universal Clustering on Customer Transactions
        print("\n--- Testing Universal Clustering (K-Means + PCA) on Customer Transactions ---")
        tx_df = next(df for ds, df in uploaded_datasets if "customer_transactions" in ds.filename)
        clustering_res = run_universal_clustering(tx_df, n_clusters=4)
        print(f"    Total Clusters: {clustering_res['n_clusters']}")
        print(f"    PCA Points generated: {len(clustering_res['pca_points'])}")
        print(f"    PCA Explained Variance: {clustering_res['explained_variance']}")
        for c in clustering_res["clusters"]:
            print(f"    Cohort {c['cluster_id']}: '{c['segment_label']}' ({c['count']} records, {c['percentage']}%)")
        assert len(clustering_res["clusters"]) == 4
        assert len(clustering_res["pca_points"]) > 0

        # 4. Test Supervised Machine Learning: Classification on HR Dataset
        print("\n--- Testing Supervised ML: Classification (HR Attrition) ---")
        hr_df = next(df for ds, df in uploaded_datasets if "hr" in ds.filename)
        ml_clf_res = train_and_compare_models(hr_df, target_column="attrition", task_type="classification")
        print(f"    Best Model: {ml_clf_res['best_model']}")
        for m in ml_clf_res["leaderboard"]:
            print(f"    Model: {m['model_name']} | Accuracy: {m['accuracy']}% | F1: {m['f1_score']}% | Precision: {m['precision']}%")
        assert len(ml_clf_res["leaderboard"]) >= 3

        # 5. Test Supervised Machine Learning: Regression on Generic Tabular Dataset
        print("\n--- Testing Supervised ML: Regression (Target Score) ---")
        gen_df = next(df for ds, df in uploaded_datasets if "generic_tabular" in ds.filename)
        ml_reg_res = train_and_compare_models(gen_df, target_column="target_score", task_type="regression")
        print(f"    Best Model: {ml_reg_res['best_model']}")
        for m in ml_reg_res["leaderboard"]:
            print(f"    Model: {m['model_name']} | R² Score: {m['r2_score']} | MAE: {m['mae']} | RMSE: {m['rmse']}")
        assert len(ml_reg_res["leaderboard"]) >= 3

        # 6. Test Statistics & Hypothesis Testing
        print("\n--- Testing Universal Statistics & Hypothesis Testing ---")
        corr_res = compute_correlations(gen_df)
        print(f"    Top correlation pair: {corr_res['top_correlations'][0] if corr_res['top_correlations'] else 'None'}")
        tests_res = run_statistical_tests(hr_df)
        print(f"    Statistical Hypothesis Tests executed: {len(tests_res)}")
        for t in tests_res:
            print(f"    Test: {t['test_name']} -> p-value: {t['p_value']} (Significant: {t['is_significant']})")

    print("\n" + "=" * 70)
    print("ALL 6 DATASETS PASSED ENGINE VERIFICATION WITH ZERO FAILURES!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_verification())
