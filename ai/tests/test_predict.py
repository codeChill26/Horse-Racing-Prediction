"""Test cho Agent 1 (predict.py) — model ML.

Chạy được trong CI vì ai/models/model.pkl đã được commit.
Không kiểm tra giá trị xác suất cụ thể (phụ thuộc model đã train), chỉ kiểm tra
các bất biến mà code cam kết: chuẩn hoá tổng = 100%, quan hệ odds, ranking.
"""
import pytest

from predict import DEFAULT_MARGIN, load_model, predict_race


RACE = [
    {"horseName": "Thunderbolt", "OR": 105, "RPR": 110, "age": 5,
     "weightLb": 152, "saddle": 2, "jockeyName": "Oisin Murphy"},
    {"horseName": "Silver Arrow", "OR": 92, "RPR": 95, "age": 4,
     "weightLb": 140, "saddle": 5, "jockeyName": "Frankie Dettori"},
    {"horseName": "Old Timer", "OR": 78, "RPR": 80, "age": 9,
     "weightLb": 133, "saddle": 8, "jockeyName": "Unknown Jockey"},
]


def test_load_model_tra_ve_bundle_du_thanh_phan():
    bundle = load_model()
    for key in ("pipeline", "feature_cols", "jockey_winrate", "jockey_global",
                "trainer_global"):
        assert key in bundle, f"bundle thiếu '{key}'"


def test_predict_race_tra_du_so_ngua():
    out = predict_race(RACE)
    assert len(out) == len(RACE)
    assert {h["horseName"] for h in out} == {h["horseName"] for h in RACE}


def test_predict_race_tong_xac_suat_bang_100():
    """Mỗi đua đúng 1 con thắng -> code chuẩn hoá tổng xác suất về 1."""
    out = predict_race(RACE)
    total = sum(h["win_probability"] for h in out)
    assert total == pytest.approx(100.0, abs=0.1)


def test_predict_race_ranking_giam_dan_theo_xac_suat():
    out = predict_race(RACE)

    assert [h["rank"] for h in out] == list(range(1, len(RACE) + 1))
    probs = [h["win_probability"] for h in out]
    assert probs == sorted(probs, reverse=True)


def test_predict_race_suggested_odds_thap_hon_fair_odds():
    """Overround: odds trả người chơi luôn thấp hơn odds công bằng."""
    out = predict_race(RACE)
    for h in out:
        assert h["suggested_odds"] < h["fair_odds"]
        assert h["suggested_odds"] == pytest.approx(
            h["fair_odds"] / (1 + DEFAULT_MARGIN), abs=0.02
        )


def test_predict_race_margin_cao_hon_thi_odds_thap_hon():
    """Nhà cái ăn dày hơn -> người chơi nhận odds thấp hơn."""
    it = {h["horseName"]: h for h in predict_race(RACE, margin=0.15)}
    day = {h["horseName"]: h for h in predict_race(RACE, margin=0.30)}

    for name in it:
        assert day[name]["suggested_odds"] < it[name]["suggested_odds"]


def test_predict_race_giu_nguyen_field_goc_cua_input():
    out = predict_race(RACE)
    by_name = {h["horseName"]: h for h in out}

    assert by_name["Thunderbolt"]["OR"] == 105
    assert by_name["Thunderbolt"]["jockeyName"] == "Oisin Murphy"


def test_predict_race_chap_nhan_field_so_bi_thieu():
    """OR/RPR thiếu -> pipeline tự impute, không được ném lỗi."""
    race = RACE + [{"horseName": "Dark Horse", "OR": None, "RPR": None, "age": 3,
                    "weightLb": 128, "saddle": 1, "jockeyName": "William Buick"}]
    out = predict_race(race)

    dark = next(h for h in out if h["horseName"] == "Dark Horse")
    assert dark["win_probability"] >= 0


def test_predict_race_jockey_la_khong_lam_vo():
    """Kỵ sĩ chưa từng thấy lúc train -> dùng winrate chung, không lỗi."""
    race = [dict(h, jockeyName="Nguoi La Hoan Toan") for h in RACE]
    out = predict_race(race)

    assert len(out) == len(RACE)
