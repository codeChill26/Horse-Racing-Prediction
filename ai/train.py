import sys
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
import joblib

sys.stdout.reconfigure(encoding="utf-8")  # in tiếng Việt trên terminal Windows

# ---------------------------------------------------------------------------
# CẤU HÌNH
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "docs" / "horseracing_dataset"
MODEL_DIR = ROOT / "ai" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

YEARS = [2016, 2017, 2018, 2019, 2020]

# Feature "thô" lấy trực tiếp từ CSV (đã ép kiểu số). KHÔNG lấy decimalPrice/price/isFav
# (leak thị trường) và KHÔNG lấy TR (leak tốc độ sau đua).
RAW_FEATURES = ["OR", "RPR", "age", "weightLb", "saddle", "runners"]

# Feature tự tính (feature engineering) — thêm ở bước 4.
ENGINEERED_FEATURES = ["jockey_winrate", "trainer_winrate"]

FEATURE_COLS = RAW_FEATURES + ENGINEERED_FEATURES
TARGET = "res_win"

# Hệ số làm mượt winrate (smoothing). Jockey chỉ chạy 2 lần mà thắng 1 -> winrate 50%
# là ảo. Công thức: (số_thắng + K*winrate_chung) / (số_lượt + K). K càng lớn càng "kéo"
# winrate về mức trung bình chung khi mẫu nhỏ. Đây là 1 dạng regularization.
SMOOTHING_K = 20


# ---------------------------------------------------------------------------
# 1) NẠP & GỘP DỮ LIỆU
# ---------------------------------------------------------------------------
def load_data():
    frames = []
    for year in YEARS:
        path = DATA_DIR / f"horses_{year}.csv"
        df = pd.read_csv(path, low_memory=False)
        frames.append(df)
        print(f"  + horses_{year}.csv: {len(df):,} dòng")
    data = pd.concat(frames, ignore_index=True)
    print(f"  = Tổng: {len(data):,} lượt ngựa, {data['rid'].nunique():,} cuộc đua")
    return data


# ---------------------------------------------------------------------------
# 2) CHUẨN BỊ: ép kiểu số cho các cột feature thô + target sạch
# ---------------------------------------------------------------------------
def prepare(data):
    for col in RAW_FEATURES:
        # errors="coerce": ô nào không phải số -> NaN (sẽ được impute sau).
        data[col] = pd.to_numeric(data[col], errors="coerce")
    # Bỏ dòng không có nhãn hợp lệ.
    data = data[data[TARGET].isin([0, 1])].copy()
    data[TARGET] = data[TARGET].astype(int)
    # Cần jockeyName / trainerName để tính winrate.
    data["jockeyName"] = data["jockeyName"].fillna("UNKNOWN")
    data["trainerName"] = data["trainerName"].fillna("UNKNOWN")
    return data


# ---------------------------------------------------------------------------
# 3) CHIA TRAIN/TEST THEO CUỘC ĐUA
# ---------------------------------------------------------------------------
def split_by_race(data, test_ratio=0.2, seed=42):
    rids = data["rid"].unique()
    rng = np.random.default_rng(seed)
    rng.shuffle(rids)
    n_test = int(len(rids) * test_ratio)
    test_rids = set(rids[:n_test])

    is_test = data["rid"].isin(test_rids)
    train_df = data[~is_test].copy()
    test_df = data[is_test].copy()
    print(f"  Train: {len(train_df):,} lượt / {train_df['rid'].nunique():,} đua")
    print(f"  Test : {len(test_df):,} lượt / {test_df['rid'].nunique():,} đua")
    return train_df, test_df


# ---------------------------------------------------------------------------
# 4) FEATURE ENGINEERING: winrate jockey & trainer (TÍNH TỪ TRAIN)
# ---------------------------------------------------------------------------
# QUAN TRỌNG chống leakage: winrate CHỈ được học từ tập TRAIN, rồi "tra bảng" áp
# sang test. Người/HLV chưa từng thấy -> gán winrate trung bình chung.
def build_winrate_table(train_df, name_col):
    global_rate = train_df[TARGET].mean()
    grp = train_df.groupby(name_col)[TARGET].agg(["sum", "count"])
    smoothed = (grp["sum"] + SMOOTHING_K * global_rate) / (grp["count"] + SMOOTHING_K)
    return smoothed.to_dict(), global_rate


def apply_winrate(df, table, global_rate, name_col, out_col):
    df[out_col] = df[name_col].map(table).fillna(global_rate)
    return df


# ---------------------------------------------------------------------------
# 6) ĐÁNH GIÁ: top-1 hit-rate theo từng đua
# ---------------------------------------------------------------------------
# Với mỗi đua trong test: chọn con model cho xác suất cao NHẤT, xem nó có thắng thật
# không. % số đua đoán trúng người thắng = thước đo "dùng được" thực tế nhất.
def top1_hit_rate(test_df, proba):
    tmp = test_df[["rid", TARGET]].copy()
    tmp["proba"] = proba
    # Trong mỗi rid, lấy dòng có proba lớn nhất.
    idx = tmp.groupby("rid")["proba"].idxmax()
    picked = tmp.loc[idx]
    return picked[TARGET].mean()


def main():
    print("=" * 70)
    print("1) NẠP DỮ LIỆU")
    print("=" * 70)
    data = load_data()

    print("\n2) CHUẨN BỊ / ÉP KIỂU")
    data = prepare(data)

    print("\n3) CHIA TRAIN/TEST THEO ĐUA")
    train_df, test_df = split_by_race(data)

    print("\n4) TÍNH WINRATE JOCKEY & TRAINER (từ train)")
    jockey_tbl, jockey_global = build_winrate_table(train_df, "jockeyName")
    trainer_tbl, trainer_global = build_winrate_table(train_df, "trainerName")
    for df in (train_df, test_df):
        apply_winrate(df, jockey_tbl, jockey_global, "jockeyName", "jockey_winrate")
        apply_winrate(df, trainer_tbl, trainer_global, "trainerName", "trainer_winrate")
    print(f"  jockey_winrate trung bình: {jockey_global:.3f} | "
          f"trainer_winrate trung bình: {trainer_global:.3f}")

    X_train, y_train = train_df[FEATURE_COLS], train_df[TARGET]
    X_test, y_test = test_df[FEATURE_COLS], test_df[TARGET]

    print("\n5) DỰNG PIPELINE & TRAIN LOGISTIC REGRESSION")
    # add_indicator=True: tự thêm cột cờ "was_missing" cho mỗi cột từng bị thiếu.
    # class_weight="balanced": bù cho việc chỉ ~10% nhãn là 1 (dữ liệu mất cân bằng).
    pipeline = Pipeline([
        ("impute", SimpleImputer(strategy="median", add_indicator=True)),
        ("scale", StandardScaler()),
        ("model", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])
    pipeline.fit(X_train, y_train)

    print("\n6) ĐÁNH GIÁ TRÊN TEST")
    proba = pipeline.predict_proba(X_test)[:, 1]  # xác suất thắng của từng ngựa
    auc = roc_auc_score(y_test, proba)
    hit = top1_hit_rate(test_df, proba)
    # Mốc so sánh: nếu đoán bừa, tỉ lệ trúng người thắng ~ trung bình 1/số_ngựa mỗi đua.
    baseline = 1.0 / test_df.groupby("rid").size().mean()
    print(f"  AUC (phân biệt thắng/thua)      : {auc:.3f}   (0.5=ngẫu nhiên, 1.0=hoàn hảo)")
    print(f"  Top-1 hit-rate (đoán trúng nhất): {hit*100:.1f}% số đua")
    print(f"  Mốc đoán bừa                     : {baseline*100:.1f}%")
    print(f"  -> Model tốt hơn đoán bừa {hit/baseline:.1f} lần" if baseline else "")

    # In hệ số để GIẢI THÍCH model học gì (điểm cộng thuyết trình).
    print("\n  Hệ số Logistic (dương = tăng khả năng thắng):")
    feat_names = pipeline.named_steps["impute"].get_feature_names_out(FEATURE_COLS)
    coefs = pipeline.named_steps["model"].coef_[0]
    for name, c in sorted(zip(feat_names, coefs), key=lambda x: -abs(x[1])):
        print(f"    {name:28s}: {c:+.3f}")

    print("\n7) LƯU MODEL -> ai/models/model.pkl")
    # Lưu KÈM bảng winrate + danh sách feature: lúc serving (FastAPI) phải tái tạo
    # đúng feature này từ input, nên cần mang theo.
    bundle = {
        "pipeline": pipeline,
        "feature_cols": FEATURE_COLS,
        "raw_features": RAW_FEATURES,
        "jockey_winrate": jockey_tbl,
        "jockey_global": jockey_global,
        "trainer_winrate": trainer_tbl,
        "trainer_global": trainer_global,
    }
    joblib.dump(bundle, MODEL_DIR / "model.pkl")
    print("  Đã lưu. Xong bước train!")


if __name__ == "__main__":
    main()
