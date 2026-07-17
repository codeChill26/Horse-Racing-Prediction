"""Test cho Agent 2 (risk.py) — rule-based nên kiểm chứng được từng ngưỡng.

Các test này MÔ TẢ hành vi hiện tại, không áp đặt hành vi mới.
"""
import pytest

from risk import (
    INF_RISK,
    MAX_ODDS_CUT,
    OVER_EXPOSURE_SHARE,
    _risk_level,
    assess_risk,
)


# --- _risk_level: phân mức theo ngưỡng, biên là "<=" ---------------------------

@pytest.mark.parametrize("ratio, expected", [
    (0.0, "LOW"),
    (0.10, "LOW"),        # đúng biên 10% vẫn LOW
    (0.11, "MEDIUM"),
    (0.25, "MEDIUM"),     # đúng biên 25% vẫn MEDIUM
    (0.26, "HIGH"),
    (0.50, "HIGH"),       # đúng biên 50% vẫn HIGH
    (0.51, "CRITICAL"),
    (INF_RISK, "CRITICAL"),
])
def test_risk_level_boundaries(ratio, expected):
    assert _risk_level(ratio) == expected


# --- assess_risk: kịch bản chuẩn ----------------------------------------------

def test_assess_risk_lech_cua_thi_ha_odds():
    """Cửa chiếm 80% pool và lỗ nếu thắng -> bị hạ odds, tối đa MAX_ODDS_CUT."""
    horses = [
        {"horseName": "Thunderbolt", "current_odds": 2.5, "total_bet": 8000},
        {"horseName": "Silver Arrow", "current_odds": 3.2, "total_bet": 1500},
        {"horseName": "Old Timer", "current_odds": 7.0, "total_bet": 500},
    ]
    r = assess_risk(treasury=10000, horses=horses)

    assert r["total_pool"] == 10000
    # Thunderbolt: payout 8000*2.5=20000, pool 10000 -> liability 10000
    assert r["worst_case_liability"] == 10000
    # risk = 10000/10000 = 1.0 -> vượt 0.5 -> CRITICAL
    assert r["risk_score"] == 1.0
    assert r["risk_level"] == "CRITICAL"

    tb = r["horses"][0]
    assert tb["pool_share"] == 80.0
    # share 0.8 vượt ngưỡng 0.4 -> cut = min(0.10, 0.4) = 0.10 -> 2.5*0.9 = 2.25
    assert tb["suggested_odds"] == 2.25
    assert "hạ odds" in tb["reason"]


def test_assess_risk_cua_khong_lech_thi_giu_nguyen_odds():
    """Không cửa nào vượt 40% pool -> giữ nguyên odds."""
    horses = [
        {"horseName": "A", "current_odds": 3.0, "total_bet": 1000},
        {"horseName": "B", "current_odds": 3.0, "total_bet": 1000},
        {"horseName": "C", "current_odds": 3.0, "total_bet": 1000},
    ]
    r = assess_risk(treasury=100000, horses=horses)

    for h in r["horses"]:
        assert h["suggested_odds"] == h["current_odds"]
        assert h["reason"] == "giữ nguyên"


def test_assess_risk_cut_khong_vuot_qua_max_odds_cut():
    """Dù lệch cỡ nào, mức hạ odds cũng bị chặn ở MAX_ODDS_CUT."""
    horses = [
        {"horseName": "Alone", "current_odds": 10.0, "total_bet": 1000},
        {"horseName": "Nobody", "current_odds": 2.0, "total_bet": 0},
    ]
    r = assess_risk(treasury=50000, horses=horses)

    alone = r["horses"][0]
    assert alone["pool_share"] == 100.0            # chiếm trọn pool
    # cut bị chặn ở MAX_ODDS_CUT=0.10 -> 10.0 * 0.9 = 9.0
    assert alone["suggested_odds"] == round(10.0 * (1 - MAX_ODDS_CUT), 2)


def test_assess_risk_lech_nhung_van_lai_thi_khong_ha_odds():
    """share cao nhưng liability âm (vẫn lãi) -> không hạ odds.

    Điều kiện hạ là `share > OVER_EXPOSURE_SHARE AND liability > 0`.
    """
    horses = [
        {"horseName": "Heavy", "current_odds": 1.1, "total_bet": 9000},
        {"horseName": "Light", "current_odds": 2.0, "total_bet": 1000},
    ]
    r = assess_risk(treasury=10000, horses=horses)

    heavy = r["horses"][0]
    assert heavy["pool_share"] > OVER_EXPOSURE_SHARE * 100
    # payout 9000*1.1=9900 < pool 10000 -> liability âm -> vẫn lãi
    assert heavy["liability_if_win"] < 0
    assert heavy["suggested_odds"] == 1.1
    assert heavy["reason"] == "giữ nguyên"


# --- assess_risk: các biên nguy hiểm ------------------------------------------

def test_assess_risk_het_von_va_con_no_thi_rui_ro_vo_han():
    horses = [{"horseName": "X", "current_odds": 5.0, "total_bet": 1000}]
    r = assess_risk(treasury=0, horses=horses)

    # payout 5000 - pool 1000 = 4000 > 0, mà treasury = 0
    assert r["risk_score"] == INF_RISK
    assert r["risk_level"] == "CRITICAL"


def test_assess_risk_het_von_nhung_khong_no_thi_rui_ro_bang_khong():
    """Treasury 0 nhưng luôn lãi -> risk 0, không phải INF_RISK."""
    horses = [{"horseName": "X", "current_odds": 0.5, "total_bet": 1000}]
    r = assess_risk(treasury=0, horses=horses)

    # payout 500 - pool 1000 = -500 -> không lỗ
    assert r["risk_score"] == 0.0
    assert r["risk_level"] == "LOW"


def test_assess_risk_khong_ai_cuoc():
    """Pool rỗng: không chia cho 0, không lỗ."""
    horses = [
        {"horseName": "A", "current_odds": 3.0, "total_bet": 0},
        {"horseName": "B", "current_odds": 4.0, "total_bet": 0},
    ]
    r = assess_risk(treasury=10000, horses=horses)

    assert r["total_pool"] == 0
    assert r["risk_score"] == 0.0
    assert r["risk_level"] == "LOW"
    for h in r["horses"]:
        assert h["pool_share"] == 0.0


def test_assess_risk_risk_score_khong_bao_gio_am():
    """liability âm toàn bộ -> risk_score bị kẹp về 0, không âm."""
    horses = [{"horseName": "X", "current_odds": 1.01, "total_bet": 5000}]
    r = assess_risk(treasury=10000, horses=horses)

    assert r["risk_score"] >= 0.0


def test_assess_risk_giu_nguyen_so_ngua_va_ten():
    horses = [
        {"horseName": "A", "current_odds": 2.0, "total_bet": 100},
        {"horseName": "B", "current_odds": 3.0, "total_bet": 200},
    ]
    r = assess_risk(treasury=1000, horses=horses)

    assert [h["horseName"] for h in r["horses"]] == ["A", "B"]
