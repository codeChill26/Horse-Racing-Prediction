# AI Module — Horse Racing Prediction (Giải thích toàn bộ)

Tài liệu này giải thích **mọi thứ đã làm ở phần AI**, **lý do chọn từng phương án**, và **cách bạn tự làm lại từ đầu** để vừa học vừa hiểu.

## Mục lục
1. [Bức tranh tổng thể — 2 Agent](#1-bức-tranh-tổng-thể--2-agent)
2. [Quyết định cốt lõi: ML vs Rule-based](#2-quyết-định-cốt-lõi-ml-vs-rule-based)
3. [Dữ liệu](#3-dữ-liệu)
4. [Model dùng gì — thuật toán & thư viện](#4-model-dùng-gì--thuật-toán--thư-viện)
5. [Feature: chọn gì, bỏ gì, vì sao](#5-feature-chọn-gì-bỏ-gì-vì-sao)
6. [Kết quả & cách đánh giá](#6-kết-quả--cách-đánh-giá)
7. [Từ xác suất → odds](#7-từ-xác-suất--odds)
8. [Agent 2 — Risk Engine (rule-based)](#8-agent-2--risk-engine-rule-based)
9. [Service FastAPI — cách chạy](#9-service-fastapi--cách-chạy)
10. [Cấu trúc thư mục](#10-cấu-trúc-thư-mục)
11. [TỰ LÀM LẠI TỪ ĐẦU — hướng dẫn từng bước](#11-tự-làm-lại-từ-đầu--hướng-dẫn-từng-bước)
12. [Retrain & nâng cấp sau này](#12-retrain--nâng-cấp-sau-này)

---

## 1. Bức tranh tổng thể — 2 Agent

Theo `docs/AI_Feature.md`, hệ thống cần 2 "AI sub-agent":

| | **Agent 1 — Prediction Engine** | **Agent 2 — Risk Management** |
|---|---|---|
| Chạy khi nào | **Trước** khi mở cược | **Sau** khi mở cược (real-time) |
| Nhiệm vụ | Dự đoán xác suất thắng từng ngựa → đề xuất **odds ban đầu** | Theo dõi tiền cược → tính **risk score** → đề xuất **chỉnh odds** |
| Input | Lịch sử ngựa/nài, các chỉ số | Odds hiện tại, tiền cược mỗi cửa, liability, treasury |
| Output | Xác suất %, ranking, odds | Risk score, mức rủi ro, odds mới đề xuất |
| **Bản chất kỹ thuật** | **Machine Learning** | **Rule-based (công thức)** |

Cả hai chỉ **đề xuất** — Admin là người duyệt/áp dụng. AI không tự quyết.

---

## 2. Quyết định cốt lõi: ML vs Rule-based

Đây là quyết định quan trọng nhất của cả phần AI.

- **Agent 1 dùng Machine Learning** vì ta **có dữ liệu lịch sử có nhãn**: mỗi lượt ngựa chạy trong quá khứ đều biết nó có thắng không (`res_win`). Có "câu hỏi" (đặc điểm ngựa) + "đáp án" (thắng/thua) → đúng chuẩn bài toán **học có giám sát** (supervised learning). Không dùng ML ở đây là phí bộ dữ liệu.

- **Agent 2 dùng Rule-based (KHÔNG train model)** vì app **chưa có lịch sử cược** để học. Không có dữ liệu quá khứ → không thể train. May mắn `AI_Feature.md` đã định nghĩa Agent 2 toàn bằng **công thức** (liability, treasury, risk score), nên nó vốn là **hệ luật/expert system**. Ép ML vào đây sẽ là "AI giả".

> **Hệ quả thực dụng:** chỉ phải train **1** model (Agent 1). Agent 2 chỉ là vài công thức Python → tiết kiệm một nửa công sức.

---

## 3. Dữ liệu

- **Nguồn:** `docs/horseracing_dataset/` — bộ đua ngựa UK/Ireland 2016–2020.
- **2 loại file:**
  - `horses_YYYY.csv` — mỗi dòng = **1 con ngựa trong 1 cuộc đua** (~816.000 dòng, 5 năm).
  - `races_YYYY.csv` — mỗi dòng = **1 cuộc đua** (nối với bảng horses qua cột `rid`).
- **Nhãn (target):** `res_win` = 1 nếu ngựa thắng, 0 nếu không.
- **Đặc điểm quan trọng phát hiện lúc khám phá (`ai/notebooks/01_explore.py`):**
  - Dữ liệu **mất cân bằng**: chỉ ~10% lượt là thắng (mỗi đua nhiều ngựa, 1 con thắng). → không được đánh giá bằng accuracy trần.
  - Các chỉ số mạnh nhưng **thiếu nhiều**: `RPR` thiếu 48.5%, `OR` thiếu 46.8%, `TR` thiếu 68.1%.

### Bẫy "data leakage" (nhìn trộm đáp án) — cực kỳ quan trọng
Leakage = dùng thông tin mà **thực tế chưa có** tại thời điểm dự đoán. Ta loại 2 nhóm:
- **`TR`** (top-speed rating): tính từ **thời gian chạy → chỉ có SAU đua**. Dùng nó là gian lận. → **loại**.
- **`decimalPrice`, `price`, `isFav`**: đều sinh ra từ **odds của nhà cái**. Dùng chúng thì AI chỉ "chép" nhà cái, không tự dự đoán. Loại đi để có câu chuyện "AI dự đoán **độc lập** rồi so với thị trường". → **loại**.

---

## 4. Model dùng gì — thuật toán & thư viện

| Hạng mục | Lựa chọn | Vì sao |
|---|---|---|
| **Ngôn ngữ** | Python | Hệ sinh thái ML mạnh nhất |
| **Thư viện ML** | **scikit-learn** | Chuẩn cho ML cổ điển, ngắn gọn, dễ giải thích |
| **Thuật toán** | **Logistic Regression** | Ra thẳng **xác suất 0–1** → đổi sang odds `1/p`; **giải thích được** bằng hệ số; nhẹ, chắc chắn chạy |
| Xử lý số liệu | pandas, numpy | Đọc/biến đổi CSV |
| Lưu model | joblib | Xuất/nạp lại model `.pkl` |
| Phục vụ API | FastAPI + uvicorn | Bọc model thành service HTTP |

**Vì sao Logistic Regression mà không phải mạng nơ-ron / XGBoost?**
- Bài toán môn học cần "**có AI và dùng được**", ưu tiên **hiểu và thuyết trình trơn tru**.
- Logistic cho **hệ số** giải thích trực tiếp ("RPR cao → xác suất thắng cao"). Mạng nơ-ron là hộp đen khó giải thích.
- Đủ tốt: đạt **AUC 0.809** (xem mục 6). Nâng cấp lên Gradient Boosting là phần bonus nếu dư thời gian.

**Pipeline** (gói 3 bước vào 1 khối, dùng lại y hệt lúc serving) — trong `ai/train.py`:
```
SimpleImputer(median, add_indicator=True)  # điền chỗ thiếu bằng trung vị + cờ "was_missing"
        ↓
StandardScaler()                           # chuẩn hóa để các feature cùng thang đo
        ↓
LogisticRegression(class_weight="balanced")# model; "balanced" bù cho dữ liệu 10/90 mất cân bằng
```

> **"Mock data" cho ô thiếu — làm đúng cách:** không bịa số ngẫu nhiên (bơm nhiễu, hại model). Ta **impute** = điền bằng **trung vị** cột đó + thêm **cột cờ** báo "ô này vốn trống" (để model tự học ý nghĩa của việc thiếu). `SimpleImputer(add_indicator=True)` làm cả hai.

---

## 5. Feature: chọn gì, bỏ gì, vì sao

**Feature đưa vào model:**

| Feature | Nguồn | Ý nghĩa |
|---|---|---|
| `OR` | CSV (impute chỗ thiếu) | Official Rating — điểm phong độ **trước** đua |
| `RPR` | CSV (impute chỗ thiếu) | Racing Post Rating |
| `age` | CSV | Tuổi ngựa |
| `weightLb` | CSV | Trọng lượng mang (handicap) |
| `saddle` | CSV | Vị trí xuất phát (draw) |
| `runners` | tính = số ngựa trong đua | Đua càng đông càng khó thắng |
| `jockey_winrate` | **tự tính từ lịch sử** | Tỉ lệ thắng của nài |
| `trainer_winrate` | **tự tính từ lịch sử** | Tỉ lệ thắng của HLV |

**Bỏ:** `TR` (leak tốc độ sau đua), `decimalPrice`/`price`/`isFav` (leak thị trường), các cột tên/phả hệ dạng chữ.

### Feature engineering: winrate của jockey/trainer
Đây là điểm cộng. Cách tính **chống leakage** (trong `build_winrate_table`):
1. **Chỉ tính winrate từ tập TRAIN**, rồi "tra bảng" áp sang test. Người/HLV chưa từng thấy → gán winrate trung bình chung.
2. **Làm mượt (smoothing)** để tránh mẫu nhỏ gây ảo:
   ```
   winrate = (số_thắng + K × winrate_chung) / (số_lượt + K)      với K = 20
   ```
   Nài chạy 2 lần thắng 1 lần **không** thành 50% — công thức kéo về mức trung bình khi dữ liệu ít (một dạng *regularization*).

### Chống leakage khi chia train/test
Chia **theo cuộc đua (`rid`)**, không chia theo dòng. Nếu vài ngựa của cùng 1 đua nằm ở train, vài con nằm ở test → model "biết trước" đua đó. Vì vậy: **một đua nằm trọn 1 bên** (hàm `split_by_race`).

---

## 6. Kết quả & cách đánh giá

Chạy `python ai/train.py` cho ra (trên ~16.500 cuộc đua **test chưa từng thấy**):

```
AUC              : 0.809      (0.5 = đoán bừa, 1.0 = hoàn hảo)
Top-1 hit-rate   : 49.3% số đua
Mốc đoán bừa     : 10.1%   → model giỏi hơn ~4.9 lần
```

- **AUC 0.809** — khả năng phân biệt ngựa thắng/thua. Trong dự đoán đua ngựa, >0.75 đã là khá.
- **Top-1 hit-rate 49.3%** — thước đo "dùng được" nhất: chọn con model chấm cao nhất mỗi đua, đúng người thắng ~**một nửa** số đua (trung bình ~10 ngựa/đua).
- **Không dùng accuracy** vì dữ liệu mất cân bằng: đoán "thua" cho tất cả đã ~90% "đúng" nhưng vô dụng.

**Hệ số model học được** (in ra khi train) đều hợp trực giác: `RPR ↑`, `trainer_winrate ↑`, `jockey_winrate ↑` → tăng khả năng thắng; `runners ↑`, `age ↑` → giảm. (Lưu ý `OR` ra hệ số âm do **tương quan mạnh với RPR** — multicollinearity, không phải lỗi.)

---

## 7. Từ xác suất → odds

Model cho xác suất **rời rạc** từng con (cộng lại ≠ 1). File `ai/predict.py` biến thành output đúng `AI_Feature.md`:
1. **Chuẩn hóa theo đua**: chia mỗi xác suất cho tổng → các con trong 1 đua cộng lại = 100% (vì đúng 1 con thắng).
2. **`fair_odds` = 1 / xác_suất** (odds công bằng, không lãi nhà cái).
3. **`suggested_odds` = fair_odds / (1 + margin)** — trừ biên lợi nhuận nhà cái (*overround*, mặc định 15%).
4. **Ranking** theo xác suất giảm dần.

Ví dụ (`python ai/predict.py`): Silver Arrow (nài Dettori, HLV Gosden winrate cao) vượt Thunderbolt dù rating thấp hơn → chứng minh feature winrate có tác dụng.

---

## 8. Agent 2 — Risk Engine (rule-based)

File `ai/risk.py`. Logic nhà cái:
- `pool` = tổng tiền cược tất cả các cửa.
- Nếu con X thắng: nhà cái trả `total_bet[X] × odds[X]`, giữ tiền các cửa khác.
- `liability(X) = payout(X) − pool` (dương = **lỗ** nếu X thắng).
- `risk_score = max_liability / treasury` → phân mức **LOW / MEDIUM / HIGH / CRITICAL**.
- Cửa nào chiếm > 40% pool và gây lỗ → **đề xuất hạ odds** cửa đó (tối đa 10%) để giảm khoản phải trả và cân bằng liability.

Không train gì cả — thuần công thức, chạy tức thì.

---

## 9. Service FastAPI — cách chạy

```bash
pip install -r ai/requirements.txt
python ai/train.py                                   # tạo ai/models/model.pkl (chạy 1 lần)
uvicorn ai.service.main:app --reload --port 8000
```
Mở **http://localhost:8000/docs** (Swagger tự sinh) để bấm thử. Endpoints:

| Method | Path | Agent | Việc |
|---|---|---|---|
| GET | `/health` | — | Kiểm tra sống |
| POST | `/predict-odds` | 1 (ML) | Dự đoán xác suất + odds ban đầu |
| POST | `/risk-score` | 2 (rule) | Risk score + đề xuất chỉnh odds |

Ví dụ gọi `/predict-odds`:
```json
{ "horses": [
  {"horseName":"Thunderbolt","OR":105,"RPR":110,"age":5,"weightLb":152,"saddle":2,
   "jockeyName":"Oisin Murphy","trainerName":"Andrew Balding"}
]}
```

Backend Node (nếu tích hợp sau) chỉ cần POST danh sách ngựa sang service này và nhận odds — không phải viết ML bằng JavaScript.

---

## 10. Cấu trúc thư mục

```
ai/
├── requirements.txt          # thư viện Python cần cài
├── README.md                 # tài liệu này
├── notebooks/
│   └── 01_explore.py         # Bước 1: khám phá dữ liệu
├── train.py                  # Bước 2-3: train Logistic Regression -> model.pkl
├── predict.py                # Bước 5: xác suất -> odds (Agent 1, dùng chung)
├── risk.py                   # Agent 2: risk engine rule-based
├── models/
│   └── model.pkl             # model đã train (sinh ra bởi train.py)
└── service/
    └── main.py               # Bước 7: FastAPI bọc 2 agent
```

---

## 11. TỰ LÀM LẠI TỪ ĐẦU — hướng dẫn từng bước

Nếu bạn muốn **tự tay dựng lại để hiểu**, làm đúng thứ tự này:

**Bước 0 — Môi trường**
```bash
python --version                 # cần Python 3.10+
pip install pandas numpy scikit-learn joblib fastapi uvicorn matplotlib
```

**Bước 1 — Hiểu dữ liệu trước khi làm gì cả.** Mở `ai/notebooks/01_explore.py`, chạy, và tự trả lời 4 câu:
- Data có cột gì, mỗi dòng là gì?
- Cột nào là nhãn? (→ `res_win`)
- Feature dự định dùng có thiếu nhiều không? (→ RPR/OR/TR thiếu nhiều)
- Một cuộc đua trông thế nào? (→ mỗi `rid` có đúng 1 con `res_win=1`)

**Bước 2 — Chọn feature & target.** Liệt kê feature, **gạch bỏ mọi thứ leak** (đáp án tương lai, thông tin từ odds). Đây là bước tư duy quan trọng nhất, không phải code.

**Bước 3 — Train baseline đơn giản nhất trước.** Bắt đầu với đúng 2–3 feature dễ (`OR`, `age`, `runners`) + Logistic Regression. Chạy được đã, rồi mới thêm feature. **Đừng làm phức tạp ngay.**

**Bước 4 — Đánh giá đúng cách.** Với dữ liệu mất cân bằng, dùng **AUC** + **top-1 hit-rate theo đua**, KHÔNG dùng accuracy. Luôn chia train/test **theo cuộc đua**.

**Bước 5 — Thêm feature engineering** (winrate jockey/trainer) và xem chỉ số có tăng không. Nhớ chống leakage (tính winrate chỉ từ train).

**Bước 6 — Đổi xác suất sang odds** (chuẩn hóa theo đua → `1/p` → thêm margin).

**Bước 7 — Bọc bằng FastAPI**, test bằng `/docs`.

**Bước 8 — Agent 2**: viết công thức risk thuần Python, không cần train.

> Nguyên tắc xuyên suốt: **chạy được cái đơn giản trước, rồi cải tiến dần**. Mỗi bước phải chạy ra kết quả rồi mới sang bước sau.

**Model đang dùng, tóm gọn 1 câu:** *Logistic Regression (scikit-learn)*, đầu vào là các chỉ số phong độ ngựa + winrate nài/HLV, đầu ra là xác suất thắng → chuẩn hóa theo đua → odds.

---

## 12. Retrain & nâng cấp sau này

- **Retrain** (khi có thêm dữ liệu năm mới): thêm năm vào `YEARS` trong `train.py`, chạy lại `python ai/train.py`. File `model.pkl` được ghi đè, service tự dùng model mới ở lần khởi động sau. Không phải sửa code khác.
- **Nâng độ chính xác (bonus)** nếu dư thời gian:
  - Thêm lại feature `RPR` đã có; thử thêm feature từ bảng `races` (distance, class, condition).
  - Đổi `LogisticRegression` → `RandomForestClassifier` hoặc gradient boosting (LightGBM) — chỉ đổi 1 dòng trong Pipeline; đánh đổi là khó giải thích hơn.
- **Tích hợp Node** (nếu làm): backend gọi `POST /predict-odds` khi Admin tạo odds ban đầu, ghi kết quả vào bảng `Odds`, Admin duyệt trước khi công bố — khớp đúng vai trò "AI chỉ đề xuất" trong `AI_Feature.md`.
