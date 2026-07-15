"""
BƯỚC 1 — KHÁM PHÁ DỮ LIỆU (Data Exploration)
============================================
Mục tiêu của file này: TRẢ LỜI 4 CÂU HỎI trước khi train model.
  1. Dữ liệu có những cột gì? Mỗi dòng là gì?
  2. Cột nào là "đáp án" (nhãn) để model học?  -> res_win
  3. Các cột ta định dùng làm feature có bị thiếu (missing) nhiều không?
  4. Một cuộc đua trong data trông như thế nào?

Chạy:  python ai/notebooks/01_explore.py
(Đọc kỹ phần in ra terminal — đó là bài học, không chỉ là output.)
"""

import sys
import pandas as pd
from pathlib import Path

# Terminal Windows mặc định không phải UTF-8 -> ép in được tiếng Việt.
sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# 1. TRỎ ĐƯỜNG DẪN TỚI DATA
# ---------------------------------------------------------------------------
# __file__ = vị trí file này. .parents[2] = lùi 2 cấp -> thư mục gốc dự án.
# Ta không copy CSV nặng vào ai/, chỉ đọc trực tiếp từ docs/.
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "docs" / "horseracing_dataset"

# Bước 1 chỉ xem 1 năm cho nhanh. Train thật (bước sau) sẽ gộp nhiều năm.
horses = pd.read_csv(DATA_DIR / "horses_2020.csv", low_memory=False)
races = pd.read_csv(DATA_DIR / "races_2020.csv")

print("=" * 70)
print("CÂU HỎI 1: DỮ LIỆU CÓ GÌ?")
print("=" * 70)
# horses = mỗi dòng là 1 con ngựa tham gia 1 cuộc đua (1 lượt chạy).
# races  = mỗi dòng là 1 cuộc đua. Nối 2 bảng qua cột 'rid' (race id).
print(f"\nBảng HORSES: {horses.shape[0]:,} dòng, {horses.shape[1]} cột")
print("Các cột:", list(horses.columns))
print(f"\nBảng RACES : {races.shape[0]:,} dòng, {races.shape[1]} cột")
print("Các cột:", list(races.columns))

print("\n--- 3 dòng đầu của HORSES (các cột quan trọng) ---")
cols_xem = ["rid", "horseName", "age", "jockeyName", "RPR", "OR",
            "weightLb", "isFav", "position", "res_win"]
print(horses[cols_xem].head(3).to_string(index=False))

# ---------------------------------------------------------------------------
print("\n" + "=" * 70)
print("CÂU HỎI 2: ĐÂU LÀ 'ĐÁP ÁN' ĐỂ MODEL HỌC?")
print("=" * 70)
# res_win = 1 nếu con ngựa này THẮNG cuộc đua, = 0 nếu không. Đây là NHÃN (target).
print("\nPhân bố res_win (0 = thua, 1 = thắng):")
print(horses["res_win"].value_counts())
ty_le = horses["res_win"].mean() * 100
print(f"\n-> Chỉ ~{ty_le:.1f}% số lượt là thắng.")
print("   ĐÂY LÀ BÀI HỌC QUAN TRỌNG: dữ liệu 'mất cân bằng' (imbalanced).")
print("   Mỗi đua nhiều ngựa nhưng chỉ 1 con thắng -> phần lớn nhãn là 0.")
print("   => KHÔNG đánh giá model chỉ bằng 'accuracy' (đoán bừa 'thua' đã ~92% đúng).")
print("   Ở bước đánh giá ta sẽ dùng 'top-1 hit rate theo từng đua' + AUC.")

# ---------------------------------------------------------------------------
print("\n" + "=" * 70)
print("CÂU HỎI 3: FEATURES DỰ ĐỊNH DÙNG CÓ BỊ THIẾU KHÔNG?")
print("=" * 70)
# Đây là các cột ta ĐỊNH dùng làm đầu vào cho model (đã loại decimalPrice/price).
features_du_kien = ["age", "saddle", "RPR", "OR", "TR", "weightLb", "runners", "isFav"]
print("\nSố ô bị thiếu (NaN) trên từng feature dự kiến:")
thieu = horses[features_du_kien].isna().sum()
tong = len(horses)
for cot, so_thieu in thieu.items():
    print(f"  {cot:10s}: {so_thieu:7,} thiếu  ({so_thieu/tong*100:5.1f}%)")
print("\n-> Cột nào thiếu quá nhiều (vd >50%) ta sẽ cân nhắc bỏ hoặc điền giá trị.")
print("   Cột thiếu ít sẽ 'điền' (impute) bằng trung vị ở bước làm sạch data.")

# ---------------------------------------------------------------------------
print("\n" + "=" * 70)
print("CÂU HỎI 4: MỘT CUỘC ĐUA TRÔNG NHƯ THẾ NÀO?")
print("=" * 70)
# Lấy 1 rid bất kỳ có nhiều ngựa để xem toàn cảnh 1 cuộc đua.
mot_rid = horses["rid"].value_counts().index[0]
mot_dua = horses[horses["rid"] == mot_rid].sort_values("position")
print(f"\nCuộc đua rid={mot_rid} có {len(mot_dua)} ngựa. Xếp theo vị trí về đích:")
print(mot_dua[["horseName", "jockeyName", "RPR", "OR", "isFav",
               "position", "res_win"]].to_string(index=False))
print("\n-> Chú ý: đúng 1 con có res_win=1 (về nhất). Đây là điều model phải học đoán.")
print("   Ở bước ra odds, ta sẽ chuẩn hóa xác suất các ngựa trong CÙNG 1 rid cho tổng = 1.")

print("\n" + "=" * 70)
print("XONG BƯỚC 1. Báo lại kết quả để mình cùng chốt danh sách feature nhé!")
print("=" * 70)
