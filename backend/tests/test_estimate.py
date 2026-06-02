"""Tests for live cost estimate merging and access gating."""

import os
import sys
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.routers.estimate import _estimate_component


def _component(**kwargs):
    defaults = {
        "id": "n1",
        "type": "ec2",
        "label": "Web",
        "config": {"instance_type": "t3.micro"},
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_estimate_component_without_live_access_stays_static():
    result = _estimate_component(
        "aws",
        _component(),
        "us-east-1",
        {"hours_per_month": 100},
        allow_live_pricing=False,
    )
    assert result is not None
    assert result["live"] is False
    assert result["monthly_cost"] > 0


def test_estimate_component_uses_live_when_allowed():
    usage = {"hours_per_month": 365, "data_transfer_gb": 0}
    with patch("app.routers.estimate.fetch_live_price", return_value=365.0) as mock_live:
        result = _estimate_component(
            "aws",
            _component(),
            "us-east-1",
            usage,
            allow_live_pricing=True,
        )
    assert result is not None
    assert result["live"] is True
    assert result["monthly_cost"] == 365.0
    mock_live.assert_called_once()
    call_kwargs = mock_live.call_args
    assert call_kwargs[0][4] == usage


def test_estimate_component_falls_back_when_live_returns_none():
    with patch("app.routers.estimate.fetch_live_price", return_value=None):
        result = _estimate_component(
            "aws",
            _component(),
            "us-east-1",
            {},
            allow_live_pricing=True,
        )
    assert result is not None
    assert result["live"] is False
    assert result["monthly_cost"] > 0
