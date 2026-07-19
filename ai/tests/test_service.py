"""Test cho FastAPI service (service/main.py) — 3 endpoint backend gọi tới.

Dùng TestClient nên không cần chạy uvicorn thật.
"""
from fastapi.testclient import TestClient

from service.main import app


client = TestClient(app)


def test_health():
    res = client.get("/health")

    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_predict_odds_tra_ve_du_predictions():
    payload = {
        "horses": [
            {"horseName": "Thunderbolt", "OR": 105, "RPR": 110, "age": 5,
             "weightLb": 152, "saddle": 2, "jockeyName": "Oisin Murphy"},
            {"horseName": "Silver Arrow", "OR": 92, "RPR": 95, "age": 4,
             "weightLb": 140, "saddle": 5, "jockeyName": "Frankie Dettori"},
        ]
    }
    res = client.post("/predict-odds", json=payload)

    assert res.status_code == 200
    preds = res.json()["predictions"]
    assert len(preds) == 2
    for p in preds:
        assert "win_probability" in p
        assert "suggested_odds" in p
        assert "rank" in p


def test_predict_odds_chap_nhan_field_thieu():
    """OR/RPR là Optional -> gửi thiếu vẫn phải 200."""
    payload = {"horses": [{"horseName": "Mystery"}]}
    res = client.post("/predict-odds", json=payload)

    assert res.status_code == 200


def test_predict_odds_thieu_horseName_thi_422():
    """horseName là bắt buộc -> pydantic phải chặn."""
    res = client.post("/predict-odds", json={"horses": [{"OR": 100}]})

    assert res.status_code == 422


def test_risk_score_tra_ve_du_field():
    payload = {
        "treasury": 10000,
        "horses": [
            {"horseName": "Thunderbolt", "current_odds": 2.5, "total_bet": 8000},
            {"horseName": "Silver Arrow", "current_odds": 3.2, "total_bet": 1500},
        ],
    }
    res = client.post("/risk-score", json=payload)

    assert res.status_code == 200
    body = res.json()
    for key in ("risk_score", "risk_level", "total_pool",
                "worst_case_liability", "treasury", "horses"):
        assert key in body

    assert body["risk_level"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_risk_score_thieu_current_odds_thi_422():
    """current_odds bắt buộc, không có default."""
    res = client.post("/risk-score", json={
        "treasury": 1000,
        "horses": [{"horseName": "X"}],
    })

    assert res.status_code == 422


def test_risk_score_total_bet_mac_dinh_bang_0():
    """total_bet có default = 0 -> gửi thiếu vẫn hợp lệ."""
    res = client.post("/risk-score", json={
        "treasury": 1000,
        "horses": [{"horseName": "X", "current_odds": 2.0}],
    })

    assert res.status_code == 200
    assert res.json()["total_pool"] == 0
