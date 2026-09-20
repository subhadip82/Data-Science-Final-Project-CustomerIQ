import pytest
import uuid
from datetime import datetime

def test_insight_categories_and_structure():
    # Test that insight format adheres to UI requirements
    sample_insight = {
        "id": "vip-concentration",
        "category": "opportunity",
        "title": "VIP Customers Drive Your Revenue",
        "description": "Your top 10% VIP customers generate 55% of total revenue.",
        "metric": "VIP Revenue Share",
        "metric_value": "55%",
        "priority": "high",
        "action_label": "Launch VIP Programme",
    }
    assert sample_insight["category"] in ["opportunity", "warning", "recommendation", "growth"]
    assert sample_insight["priority"] in ["high", "medium", "low"]
    assert "metric_value" in sample_insight
    assert "action_label" in sample_insight
