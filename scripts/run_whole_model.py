"""
Comprehensive Model Runner for CustomerIQ
==========================================
Executes all machine learning models across the platform:
1. Core CustomerIQ Pipeline (RFM Engine + K-Means Clustering + 2D PCA + Cohort Segmentation)
2. Supervised ML: Multi-model Classification Leaderboard (HR Attrition)
3. Supervised ML: Multi-model Regression Leaderboard (Tabular Target Score)
4. Universal Unsupervised Clustering & Dimensionality Reduction
5. Automated Business Insights & Prescriptive Segment Playbooks
"""

import sys
import time
from pathlib import Path
import pandas as pd

# Add backend to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.ml.pipeline import run_pipeline, detect_columns
from app.ml.universal_ml import train_and_compare_models
from app.ml.universal_clustering import run_universal_clustering
from app.ml.universal_stats import compute_correlations, run_statistical_tests
from app.ml.insights import generate_insights
from app.ml.universal_insights import generate_universal_insights_and_recs

DATASETS_DIR = PROJECT_ROOT / "scripts" / "test_datasets"


def format_header(title: str):
    print("\n" + "=" * 75)
    print(f"  {title.upper()}")
    print("=" * 75)


def run_customeriq_core_pipeline():
    format_header("1. Running Core CustomerIQ RFM + K-Means + PCA Pipeline")
    dataset_file = DATASETS_DIR / "customer_transactions_test.csv"
    if not dataset_file.exists():
        dataset_file = PROJECT_ROOT / "frontend" / "public" / "data" / "sample_retail_data.csv"
    
    print(f"[Loading Data] {dataset_file.name}...")
    df = pd.read_csv(dataset_file)
    print(f" -> Raw records: {len(df):,} rows, {len(df.columns)} columns")
    print(f" -> Detected columns: {detect_columns(df)}")

    t0 = time.time()
    result = run_pipeline(df)
    elapsed = time.time() - t0

    if not result.get("success"):
        print(f"[ERROR] Pipeline failed: {result.get('errors')}")
        return

    rfm = result["rfm"]
    meta = result["meta"]
    orders = result["orders"]
    clean_stats = result["clean_stats"]

    print(f"[SUCCESS] ML Pipeline finished in {elapsed:.3f}s")
    print(f" -> Cleaned rows: {clean_stats['original_rows'] - clean_stats['dropped_rows']:,} valid transactions")
    print(f" -> Customers processed: {len(rfm):,}")
    print(f" -> Total orders computed: {len(orders):,}")
    print(f" -> Optimal K-Means Clusters: {meta['n_clusters']}")
    print(f" -> Silhouette Score: {meta['silhouette_score']}")
    print(f" -> PCA Explained Variance (2D): {', '.join([f'{v*100:.1f}%' for v in meta['explained_variance']])}")

    print("\n[Segment Breakdown]")
    segment_counts = rfm["segment_label"].value_counts()
    for seg, count in segment_counts.items():
        pct = (count / len(rfm)) * 100
        seg_rfm = rfm[rfm["segment_label"] == seg]
        avg_r = seg_rfm["recency_days"].mean()
        avg_f = seg_rfm["frequency"].mean()
        avg_m = seg_rfm["monetary"].mean()
        print(f"  * {seg:<22}: {count:>4} customers ({pct:>5.1f}%) | Avg Recency: {avg_r:>5.1f}d | Avg Freq: {avg_f:>4.1f} | Avg Spend: ${avg_m:>8.2f}")

    print("\n[Sample Customer Segmentation Outputs (Top 5)]")
    cols_to_show = ["customer_code", "recency_days", "frequency", "monetary", "rfm_score", "cluster", "segment_label", "pca_x", "pca_y"]
    cols_present = [c for c in cols_to_show if c in rfm.columns]
    print(rfm[cols_present].head(5).to_string(index=False))

    # Generate insights and recommendations
    from app.ml.universal_profiler import profile_dataset
    profile = profile_dataset(df)
    insights, recs = generate_universal_insights_and_recs(df, dataset_type="ecommerce", column_profiles=profile["columns"])
    print(f"\n[Automated Business Intelligence Insights ({len(insights)} Insights, {len(recs)} Actionable Playbooks)]")
    for i, ins in enumerate(insights[:4], 1):
        print(f"  {i}. [{ins['priority'].upper()}] {ins['title']}")
        print(f"     Finding: {ins['finding']}")
        print(f"     Action:  {ins['recommended_action']}")


def run_supervised_classification():
    format_header("2. Running Supervised Machine Learning: Classification")
    dataset_file = DATASETS_DIR / "hr_test.csv"
    if not dataset_file.exists():
        print(f"[SKIP] {dataset_file} not found.")
        return

    print(f"[Loading Data] {dataset_file.name}...")
    df = pd.read_csv(dataset_file)
    print(f" -> Dataset shape: {df.shape[0]} rows x {df.shape[1]} columns")
    print(f" -> Target column: 'attrition' (Predicting employee turnover)")

    t0 = time.time()
    clf_results = train_and_compare_models(df, target_column="attrition", task_type="classification")
    elapsed = time.time() - t0

    print(f"[SUCCESS] Trained and compared candidate models in {elapsed:.3f}s")
    print(f" -> Best Performing Model: {clf_results['best_model']}")
    print(f" -> Train size: {clf_results.get('train_samples')} | Test size: {clf_results.get('test_samples')}")

    print("\n[Model Benchmark Leaderboard]")
    print(f"  {'Model':<30} | {'Accuracy':<10} | {'F1-Score':<10} | {'Precision':<10} | {'Recall':<10}")
    print("  " + "-" * 75)
    for m in clf_results["leaderboard"]:
        print(f"  {m['model_name']:<30} | {m['accuracy']:>9.2f}% | {m['f1_score']:>9.2f}% | {m['precision']:>9.2f}% | {m['recall']:>9.2f}%")

    if "feature_importance" in clf_results and clf_results["feature_importance"]:
        print("\n[Top 5 Predictive Features]")
        for feat in clf_results["feature_importance"][:5]:
            print(f"  * {feat['feature']:<25}: {feat['importance']*100:>5.2f}% importance")


def run_supervised_regression():
    format_header("3. Running Supervised Machine Learning: Regression")
    dataset_file = DATASETS_DIR / "generic_tabular_test.csv"
    if not dataset_file.exists():
        print(f"[SKIP] {dataset_file} not found.")
        return

    print(f"[Loading Data] {dataset_file.name}...")
    df = pd.read_csv(dataset_file)
    print(f" -> Dataset shape: {df.shape[0]} rows x {df.shape[1]} columns")
    print(f" -> Target column: 'target_score' (Predicting continuous score)")

    t0 = time.time()
    reg_results = train_and_compare_models(df, target_column="target_score", task_type="regression")
    elapsed = time.time() - t0

    print(f"[SUCCESS] Trained and evaluated candidate regressors in {elapsed:.3f}s")
    print(f" -> Best Performing Model: {reg_results['best_model']}")

    print("\n[Model Benchmark Leaderboard]")
    print(f"  {'Model':<30} | {'R² Score':<10} | {'MAE':<10} | {'RMSE':<10}")
    print("  " + "-" * 65)
    for m in reg_results["leaderboard"]:
        print(f"  {m['model_name']:<30} | {m['r2_score']:>9.4f}  | {m['mae']:>9.4f} | {m['rmse']:>9.4f}")


def run_universal_clustering_and_stats():
    format_header("4. Running Universal Clustering & Statistical Analysis")
    dataset_file = DATASETS_DIR / "sales_test.csv"
    if not dataset_file.exists():
        print(f"[SKIP] {dataset_file} not found.")
        return

    print(f"[Loading Data] {dataset_file.name}...")
    df = pd.read_csv(dataset_file)

    # 1. Clustering
    clustering = run_universal_clustering(df, n_clusters=4)
    best_sil = max((item["silhouette"] for item in clustering.get("elbow_curve", [])), default=None)
    print(f"[Clustering] Generated {clustering['n_clusters']} clusters via K-Means")
    print(f" -> Optimal Silhouette Score: {best_sil}")
    print(f" -> PCA 2D Explained Variance: {clustering['explained_variance']}")
    for c in clustering["clusters"]:
        print(f"    - Cohort #{c['cluster_id']} ('{c['segment_label']}'): {c['count']} rows ({c['percentage']}%)")

    # 2. Correlations & Hypothesis Testing
    corrs = compute_correlations(df)
    if corrs.get("top_correlations"):
        print("\n[Top 3 Significant Correlations (Pearson)]")
        for p in corrs["top_correlations"][:3]:
            print(f"  * {p['var1']} <-> {p['var2']}: r = {p['correlation']:+.3f} ({p.get('relationship', '')})")

    tests = run_statistical_tests(df)
    if tests:
        print("\n[Hypothesis Tests]")
        for t in tests[:2]:
            print(f"  * {t['test_name']}: {t['variables']} | p-value = {t['p_value']} (Significant: {t['is_significant']})")


def main():
    print("=" * 75)
    print("      STARTING CUSTOMERIQ COMPLETE MACHINE LEARNING MODEL RUNNER")
    print("=" * 75)
    start_time = time.time()

    run_customeriq_core_pipeline()
    run_supervised_classification()
    run_supervised_regression()
    run_universal_clustering_and_stats()

    total_time = time.time() - start_time
    print("\n" + "=" * 75)
    print(f"      ALL MODELS COMPLETED SUCCESSFULLY IN {total_time:.2f}s!")
    print("=" * 75)


if __name__ == "__main__":
    main()
