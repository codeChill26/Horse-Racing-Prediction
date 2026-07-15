"""
BƯỚC 5 — TỪ XÁC SUẤT -> ODDS (Agent 1: Prediction Engine, phần dùng chung)
=========================================================================
Model cho ra xác suất thắng RỜI RẠC của từng con (cộng lại KHÔNG = 1).
File này biến nó thành output đúng yêu cầu AI_Feature.md:
  - win_probability : chuẩn hóa theo từng đua cho tổng = 100%
  - fair_odds       : 1 / xác_suất  (odds "công bằng", không lãi nhà cái)
  - suggested_odds  : fair_odds có trừ biên lợi nhuận nhà cái (overround)
  - rank            : xếp hạng theo xác suất

File này KHÔNG chạy web. Nó được:
  - gọi trực tiếp để demo:  python ai/predict.py
  - import bởi FastAPI service ở bước 7.
"""

from pathlib import Path
import pandas as pd
import joblib

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "ai" / "models" / "model.pkl"

# Biên lợi nhuận nhà cái (house edge / overround). 0.15 = 15%, mức phổ biến thực tế.
DEFAULT_MARGIN = 0.15

# Nạp model 1 lần khi import (không nạp lại mỗi request -> nhanh).
_bundle = None


def load_model():
    global _bundle
    if _bundle is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Chưa có model tại {MODEL_PATH}. Chạy `python ai/train.py` trước."
            )
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


def predict_race(horses, margin=DEFAULT_MARGIN):
    """
    Dự đoán cho MỘT cuộc đua.

    horses: list các dict, mỗi dict là 1 con ngựa, ví dụ:
        {"horseName": "Waterproof", "OR": 95, "RPR": 103, "age": 4,
         "weightLb": 150, "saddle": 3, "jockeyName": "Brendan Powell"}
    Các trường số thiếu -> để None, model tự impute.

    Trả về: list dict đã thêm win_probability / fair_odds / suggested_odds / rank,
            đã sắp xếp theo rank.
    """
    bundle = load_model()
    pipeline = bundle["pipeline"]
    feature_cols = bundle["feature_cols"]

    df = pd.DataFrame(horses)

    # runners = số ngựa trong đua này (feature model đã học). Tính tự động.
    df["runners"] = len(df)

    # Tra winrate jockey từ bảng đã học lúc train. Người lạ -> winrate chung.
    df["jockey_winrate"] = (
        df.get("jockeyName", pd.Series([None] * len(df)))
        .map(bundle["jockey_winrate"]).fillna(bundle["jockey_global"])
    )
    # trainerName đã bỏ khỏi input (DB không lưu Trainer). Model vẫn cần feature
    # trainer_winrate -> luôn dùng winrate trainer trung bình chung.
    df["trainer_winrate"] = bundle["trainer_global"]

    # Đảm bảo đủ cột feature model cần (thiếu -> NaN để pipeline impute).
    for col in feature_cols:
        if col not in df.columns:
            df[col] = None

    # 1) Xác suất thô từ model.
    raw = pipeline.predict_proba(df[feature_cols])[:, 1]

    # 2) Chuẩn hóa theo đua: mỗi đua đúng 1 con thắng -> tổng xác suất = 1.
    total = raw.sum()
    norm = raw / total if total > 0 else [1.0 / len(df)] * len(df)

    # 3) Đổi ra odds.
    results = []
    for i, horse in enumerate(horses):
        p = float(norm[i])
        fair = 1.0 / p if p > 0 else 999.0
        # Overround: giảm odds trả cho người chơi để nhà cái có lãi.
        suggested = fair / (1.0 + margin)
        out = dict(horse)
        out["win_probability"] = round(p * 100, 2)      # %
        out["fair_odds"] = round(fair, 2)
        out["suggested_odds"] = round(suggested, 2)
        results.append(out)

    # 4) Ranking theo xác suất giảm dần.
    results.sort(key=lambda r: r["win_probability"], reverse=True)
    for rank, r in enumerate(results, start=1):
        r["rank"] = rank

    return results


# ---------------------------------------------------------------------------
# DEMO khi chạy trực tiếp: python ai/predict.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")

    sample_race = [
        {"horseName": "Thunderbolt", "OR": 105, "RPR": 110, "age": 5,
         "weightLb": 152, "saddle": 2, "jockeyName": "Oisin Murphy"},
        {"horseName": "Silver Arrow", "OR": 92, "RPR": 95, "age": 4,
         "weightLb": 140, "saddle": 5, "jockeyName": "Frankie Dettori"},
        {"horseName": "Old Timer", "OR": 78, "RPR": 80, "age": 9,
         "weightLb": 133, "saddle": 8, "jockeyName": "Unknown Jockey"},
        {"horseName": "Dark Horse", "OR": None, "RPR": None, "age": 3,
         "weightLb": 128, "saddle": 1, "jockeyName": "William Buick"},
    ]

    print("=" * 60)
    print("DEMO: dự đoán 1 cuộc đua 4 ngựa")
    print("=" * 60)
    for r in predict_race(sample_race):
        print(f"  #{r['rank']} {r['horseName']:14s} | "
              f"P(thắng)={r['win_probability']:5.2f}% | "
              f"odds công bằng={r['fair_odds']:6.2f} | "
              f"odds đề xuất={r['suggested_odds']:6.2f}")
