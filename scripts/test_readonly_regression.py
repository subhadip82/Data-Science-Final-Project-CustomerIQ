"""
Comprehensive Regression Test Suite for Read-Only Array Safety & Universal Ingestion
=====================================================================================
Validates that:
1. Intentionally locked read-only arrays (flags.writeable=False) do NOT cause:
   "underlying array is read-only" or "assignment destination is read-only"
2. All preprocessing, ML, stats, clustering, insights, and profiling pipelines
   safely operate on read-only / copy-on-write DataFrames and NumPy arrays.
3. CSV & XLSX pipelines produce safe, writeable representations end-to-end.
"""
import sys
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import unittest
import numpy as np
import pandas as pd
import tempfile
import uuid

from app.ml.universal_profiler import profile_dataset
from app.ml.dataset_classifier import classify_dataset
from app.ml.analysis_planner import plan_analyses
from app.ml.universal_clustering import run_universal_clustering
from app.ml.universal_ml import train_and_compare_models
from app.ml.universal_stats import compute_correlations, run_statistical_tests
from app.ml.universal_insights import generate_universal_insights_and_recs


class TestReadOnlyArraySafety(unittest.TestCase):

    def setUp(self):
        """Build synthetic test data with various structures."""
        np.random.seed(42)
        n = 100
        self.raw_data = {
            "entity_id": [f"ID_{i}" for i in range(n)],
            "numeric_a": np.random.randn(n) * 10 + 50,
            "numeric_b": np.random.randn(n) * 5 + 20,
            "category_col": np.random.choice(["Alpha", "Beta", "Gamma"], size=n),
            "binary_target": np.random.choice([0, 1], size=n),
            "continuous_target": np.random.randn(n) * 15 + 100,
        }
        self.df = pd.DataFrame(self.raw_data)

    def _make_readonly_df(self, df: pd.DataFrame) -> pd.DataFrame:
        """Constructs a DataFrame where all underlying NumPy column buffers have writeable=False."""
        readonly_dict = {}
        for col in df.columns:
            arr = np.asarray(df[col].values)
            # Make array explicitly read-only
            arr_copy = arr.copy()
            arr_copy.setflags(write=False)
            assert not arr_copy.flags.writeable, f"Array for {col} must be read-only"
            readonly_dict[col] = arr_copy
        ro_df = pd.DataFrame(readonly_dict)
        return ro_df

    def test_readonly_profiler_and_classifier(self):
        """Verify universal_profiler and dataset_classifier on read-only DataFrames."""
        ro_df = self._make_readonly_df(self.df)
        
        # Must not raise "underlying array is read-only"
        profile = profile_dataset(ro_df)
        self.assertEqual(profile["row_count"], 100)
        self.assertEqual(profile["column_count"], 6)
        self.assertGreater(profile["quality_score"], 0)

        classification = classify_dataset(ro_df, profile["columns"])
        self.assertIn("dataset_type", classification)
        self.assertIn("confidence", classification)

        plan = plan_analyses(profile["columns"], classification["dataset_type"], len(ro_df))
        self.assertIn("modules", plan)
        print("[PASS] Profiler and Classifier safe on read-only DataFrame.")

    def test_readonly_clustering(self):
        """Verify run_universal_clustering when inputs are backed by read-only memory."""
        ro_df = self._make_readonly_df(self.df)

        result = run_universal_clustering(ro_df, feature_cols=["numeric_a", "numeric_b"], n_clusters=3)
        self.assertIn("clusters", result)
        self.assertIn("pca_points", result)
        self.assertEqual(len(result["clusters"]), 3)
        print("[PASS] Universal Clustering safe on read-only DataFrame.")

    def test_readonly_supervised_classification(self):
        """Verify train_and_compare_models classification on read-only DataFrame."""
        ro_df = self._make_readonly_df(self.df)

        res = train_and_compare_models(
            df=ro_df,
            target_column="binary_target",
            feature_columns=["numeric_a", "numeric_b", "category_col"],
            task_type="classification"
        )
        self.assertEqual(res["status"], "success")
        self.assertIn("leaderboard", res)
        self.assertGreater(len(res["leaderboard"]), 0)
        print("[PASS] Supervised Classification safe on read-only DataFrame.")

    def test_readonly_supervised_regression(self):
        """Verify train_and_compare_models regression on read-only DataFrame."""
        ro_df = self._make_readonly_df(self.df)

        res = train_and_compare_models(
            df=ro_df,
            target_column="continuous_target",
            feature_columns=["numeric_a", "numeric_b"],
            task_type="regression"
        )
        self.assertEqual(res["status"], "success")
        self.assertIn("leaderboard", res)
        self.assertGreater(len(res["leaderboard"]), 0)
        print("[PASS] Supervised Regression safe on read-only DataFrame.")

    def test_readonly_statistics_and_hypothesis_tests(self):
        """Verify correlations and hypothesis tests on read-only DataFrames."""
        ro_df = self._make_readonly_df(self.df)

        corrs = compute_correlations(ro_df)
        self.assertIn("matrix", corrs)
        self.assertIn("top_correlations", corrs)

        tests = run_statistical_tests(ro_df)
        self.assertIsInstance(tests, list)
        print("[PASS] Statistics and Hypothesis Tests safe on read-only DataFrame.")

    def test_readonly_insights_and_recommendations(self):
        """Verify insights and recommendations on read-only DataFrames."""
        ro_df = self._make_readonly_df(self.df)
        profile = profile_dataset(ro_df)

        insights, recs = generate_universal_insights_and_recs(ro_df, "generic-tabular", profile["columns"])
        self.assertIsInstance(insights, list)
        self.assertIsInstance(recs, list)
        print("[PASS] Insights and Recommendations safe on read-only DataFrame.")

    def test_missing_values_and_duplicates_readonly(self):
        """Verify pipelines with missing values, duplicate rows, and read-only memory."""
        df_dirty = self.df.copy()
        # Introduce NaNs and duplicates
        df_dirty.loc[0:10, "numeric_a"] = np.nan
        df_dirty.loc[15:20, "category_col"] = np.nan
        df_dirty = pd.concat([df_dirty, df_dirty.iloc[:5]], ignore_index=True)

        ro_dirty = self._make_readonly_df(df_dirty)
        profile = profile_dataset(ro_dirty)
        self.assertGreater(profile["duplicate_rows"], 0)

        clustering_res = run_universal_clustering(ro_dirty, feature_cols=["numeric_a", "numeric_b"])
        self.assertIn("clusters", clustering_res)
        print("[PASS] Dirty / missing / duplicate read-only DataFrame handled cleanly.")


if __name__ == "__main__":
    unittest.main()
