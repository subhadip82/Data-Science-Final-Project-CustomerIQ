"""
Run and Benchmark Machine Learning Models on Datasets
=====================================================
Automated machine learning trainer:
- Excludes IDs and date columns from targets
- Trains classification models (Gradient Boosting, Random Forest, Logistic Regression)
- Trains regression models (Random Forest, Gradient Boosting, Ridge, Linear Regression)
- Computes feature importance rankings and operational drivers
- Persists trained models into the database for immediate visualization
"""
import asyncio
import uuid
import sys
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.models import Dataset, MLModel, MLModelMetric
from app.services.dataset_service import DatasetService
from app.ml.universal_ml import train_and_compare_models, analyze_feature_importance

def pick_best_target(df):
    cols = list(df.columns)
    # Exclude ID, Code, Date, Timestamp columns
    excluded_keywords = ["id", "code", "date", "time", "timestamp", "invoice", "index"]
    valid_cols = [c for c in cols if not any(k in c.lower() for k in excluded_keywords)]
    
    # Priority targets
    priority_keywords = ["grade", "score", "churn", "target", "status", "profit", "amount", "revenue", "outcome", "converted"]
    for pk in priority_keywords:
        for c in valid_cols:
            if pk in c.lower():
                return c
    return valid_cols[-1] if valid_cols else cols[-1]

async def train_dataset_models(s, ds):
    print(f"\n==================================================")
    print(f"Dataset: {ds.name} (Rows: {ds.row_count or 'N/A'})")
    print(f"Dataset ID: {ds.id}")
    print(f"==================================================")

    svc = DatasetService(s)
    try:
        df = svc.load_dataframe(ds)
    except Exception as e:
        print(f"Could not load dataset {ds.name}: {e}")
        return

    if len(df) < 15:
        print(f"Dataset has {len(df)} rows; skipping (minimum 15 required for ML).")
        return

    target = pick_best_target(df)
    print(f"Auto-selected Target Column: '{target}'")

    ml_res = train_and_compare_models(df, target_column=target)
    task_type = ml_res.get("task_type") or ml_res.get("task") or "classification"
    best_model = ml_res.get("best_model")

    print(f"Task Type: {task_type.upper()}")
    print(f"Top Algorithm: {best_model}")
    print("Leaderboard:")
    for idx, m in enumerate(ml_res.get("leaderboard", []), 1):
        if task_type == "classification":
            print(f"  {idx}. {m['model_name']} | Accuracy: {m.get('accuracy')}% | F1: {m.get('f1_score')}%")
        else:
            print(f"  {idx}. {m['model_name']} | R²: {m.get('r2_score', m.get('r2'))}% | RMSE: {m.get('rmse')}")

    # Feature Importance
    feat_res = analyze_feature_importance(df, target_column=target)
    driver = feat_res.get("primary_driver") or {}
    driver_name = driver.get("name") if isinstance(driver, dict) else str(driver)
    print(f"Primary Business Driver: {driver_name}")
    for idx, f in enumerate(feat_res.get("features", [])[:5], 1):
        name = f.get("name") or f.get("column")
        pct = f.get("importance_pct", 0)
        direction = f.get("direction", "neutral")
        print(f"  {idx}. {name}: {pct}% ({direction})")

    # Clear previous models for this dataset
    existing_models = (await s.execute(select(MLModel).where(MLModel.dataset_id == ds.id))).scalars().all()
    for em in existing_models:
        await s.delete(em)

    # Persist benchmark models
    saved = 0
    for m in ml_res.get("leaderboard", []):
        m_id = uuid.uuid4()
        rec = MLModel(
            id=m_id,
            dataset_id=ds.id,
            workspace_id=ds.workspace_id,
            model_name=f"{m['model_name']} ({target})",
            model_type=task_type,
            algorithm=m["model_name"],
            target_column=target,
            feature_columns=ml_res.get("features_used", []),
            metrics={k: v for k, v in m.items() if k not in ("model_name", "task")},
        )
        s.add(rec)
        for mk, mv in m.items():
            if isinstance(mv, (int, float)) and mk not in ("rank",):
                s.add(MLModelMetric(
                    id=uuid.uuid4(),
                    model_id=m_id,
                    metric_name=mk,
                    metric_value=float(mv),
                    split_type="test",
                ))
        saved += 1

    await s.commit()
    print(f"Saved {saved} models for {ds.name} successfully!")

async def main():
    async with AsyncSessionLocal() as s:
        # Find active datasets or key test datasets
        datasets = (await s.execute(
            select(Dataset).where(Dataset.name.in_(["Student Performance", "Sales Test", "Survey Test"]))
        )).scalars().all()

        if not datasets:
            datasets = (await s.execute(select(Dataset).where(Dataset.is_active == True))).scalars().all()

        print(f"Found {len(datasets)} target dataset(s) for ML modeling.")
        for ds in datasets:
            await train_dataset_models(s, ds)

        print("\n>>> ALL MODELS TRAINED AND SAVED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    asyncio.run(main())
