"""
Comprehensive Regression Test Suite for Read-Only Array Safety
==============================================================
Validates that:
1. Arrays with flags.writeable=False do NOT trigger "underlying array is read-only"
2. Universal profiler, classifier, planner, clustering, supervised ML, stats,
   and insights operate safely on read-only and copy-on-write DataFrames.
"""
import pytest
import numpy as np
import pandas as pd

from app.ml.universal_profiler import profile_dataset
from app.ml.dataset_classifier import classify_dataset
from app.ml.analysis_planner import plan_analyses
from app.ml.universal_clustering import run_universal_clustering
from app.ml.universal_ml import train_and_compare_models
from app.ml.universal_stats import compute_correlations, run_statistical_tests
from app.ml.universal_insights import generate_universal_insights_and_recs


@pytest.fixture
def readonly_df():
    np.random.seed(42)
    n = 100
    data = {
        "entity_id": [f"ID_{i}" for i in range(n)],
        "numeric_a": np.random.randn(n) * 10 + 50,
        "numeric_b": np.random.randn(n) * 5 + 20,
        "category_col": np.random.choice(["Alpha", "Beta", "Gamma"], size=n),
        "binary_target": np.random.choice([0, 1], size=n),
        "continuous_target": np.random.randn(n) * 15 + 100,
    }
    df = pd.DataFrame(data)

    readonly_dict = {}
    for col in df.columns:
        arr = np.asarray(df[col].values)
        arr_copy = arr.copy()
        arr_copy.setflags(write=False)
        assert not arr_copy.flags.writeable, f"Array for {col} must be read-only"
        readonly_dict[col] = arr_copy
    return pd.DataFrame(readonly_dict)


def test_readonly_profiler_and_classifier(readonly_df):
    profile = profile_dataset(readonly_df)
    assert profile["row_count"] == 100
    assert profile["column_count"] == 6
    assert profile["quality_score"] > 0

    classification = classify_dataset(readonly_df, profile["columns"])
    assert "dataset_type" in classification
    assert "confidence" in classification

    plan = plan_analyses(profile["columns"], classification["dataset_type"], len(readonly_df))
    assert "modules" in plan


def test_readonly_clustering(readonly_df):
    result = run_universal_clustering(readonly_df, feature_cols=["numeric_a", "numeric_b"], n_clusters=3)
    assert "clusters" in result
    assert "pca_points" in result
    assert len(result["clusters"]) == 3


def test_readonly_supervised_classification(readonly_df):
    res = train_and_compare_models(
        df=readonly_df,
        target_column="binary_target",
        feature_columns=["numeric_a", "numeric_b", "category_col"],
        task_type="classification",
    )
    assert res["status"] == "success"
    assert len(res["leaderboard"]) > 0


def test_readonly_supervised_regression(readonly_df):
    res = train_and_compare_models(
        df=readonly_df,
        target_column="continuous_target",
        feature_columns=["numeric_a", "numeric_b"],
        task_type="regression",
    )
    assert res["status"] == "success"
    assert len(res["leaderboard"]) > 0


def test_readonly_stats(readonly_df):
    corr = compute_correlations(readonly_df)
    assert corr is not None
    assert "numeric_a" in corr["features"]

    tests = run_statistical_tests(readonly_df)
    assert isinstance(tests, list)


def test_readonly_insights(readonly_df):
    profile = profile_dataset(readonly_df)
    insights, recs = generate_universal_insights_and_recs(readonly_df, "generic_tabular", profile["columns"])
    assert isinstance(insights, list)
    assert isinstance(recs, list)
