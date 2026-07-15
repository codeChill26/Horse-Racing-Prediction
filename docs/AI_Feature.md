# AI Sub-Agent Architecture

Hệ AI gồm **2 sub-agent** phục vụ qua một FastAPI service độc lập (thư mục `ai/`),
được backend Node gọi qua HTTP. Model chỉ **đề xuất** — Admin luôn là người quyết định.

- **Agent 1 — Prediction** = Machine Learning (Logistic Regression, scikit-learn).
- **Agent 2 — Risk Management** = Rule-based (công thức nghiệp vụ, KHÔNG học máy).

> ⚠️ Dataset train (`docs/horseracing_dataset/`, ~133MB, đua ngựa UK/Ireland 2016–2020)
> **KHÔNG push lên GitHub** (đã thêm vào `.gitignore`). Chỉ cần khi train lại local;
> model đã train sẵn ở `ai/models/model.pkl` — đủ để chạy service.

---

## AI Sub-Agent 1 — Prediction Engine

### Mục tiêu
Dự đoán xác suất chiến thắng của từng ngựa **trước khi mở cược**.

### Thuật toán & huấn luyện
- **Logistic Regression** (scikit-learn), pipeline: impute median (+ cờ missing) → scale → logistic (`class_weight="balanced"`).
- Train từ `docs/horseracing_dataset/` (2016–2020). Chia train/test **theo cuộc đua** (`rid`) để tránh leakage.
- Kết quả: AUC ~0.81, top-1 hit-rate ~49% (đoán trúng con thắng ~49% số đua — tốt hơn nhiều so với đoán bừa).
- File: `ai/train.py` → sinh `ai/models/model.pkl`; `ai/predict.py` chuyển xác suất → odds.

### Input (contract `HorseIn`, mỗi ngựa 1 object)
| Field | Nguồn DB | Ghi chú |
|---|---|---|
| `horseName` | `Horse.name` | |
| `OR` | `Horse.officialRating` | Official Rating (nullable → model impute) |
| `RPR` | `Horse.racingPostRating` | Racing Post Rating (nullable) |
| `age` | tính từ `Horse.birthYear` | tuổi tại năm đua |
| `weightLb` | `RaceEntry.weightLb` | cân mang, theo từng lượt đua |
| `saddle` | `RaceEntry.saddleNumber` | số ô xuất phát (draw) |
| `jockeyName` | `RaceEntry.jockey.fullName` | để tra `jockey_winrate` |

Feature model thực dùng: `OR, RPR, age, weightLb, saddle, runners` + `jockey_winrate, trainer_winrate` (tính lúc train).
- **Đã loại feature leak**: `TR` (tốc độ đo sau đua), `decimalPrice/price/isFav` (odds thị trường).
- **`trainerName` đã bỏ khỏi input**: app không có khái niệm "Trainer" nên `trainer_winrate` luôn dùng winrate trung bình chung. (`runners` tự tính = số ngựa trong request.)

### Output
- `win_probability` (%): chuẩn hóa theo từng đua để **tổng = 100%** (mỗi đua đúng 1 con thắng).
- `fair_odds` = `1 / probability` (odds công bằng, nhà cái huề vốn).
- `suggested_odds` = `fair_odds / (1 + margin)` — có trừ biên lợi nhuận nhà cái. `margin` mặc định **0.15** (15%).
- `rank`: xếp hạng theo xác suất giảm dần.

> ⚠️ Nếu chỉ gửi **1 ngựa** → xác suất luôn 100% (tự nó chiếm toàn bộ), `fair_odds=1`.
> Kết quả chỉ có ý nghĩa khi so sánh **nhiều ngựa trong cùng cuộc đua**.

### Vai trò
- Chỉ hoạt động **trước khi mở cược**, đề xuất odds ban đầu.
- Admin xem đề xuất rồi tự quyết — **KHÔNG** tự ghi vào bảng `Odds`.

---

## AI Sub-Agent 2 — Risk Management Engine

### Mục tiêu
Theo dõi thị trường cược và quản lý rủi ro cho nhà cái. **Rule-based** (không train) vì app còn mới, chưa có lịch sử cược để học.

### Input (contract `RiskRequest`)
- `treasury`: vốn hiện có của nhà cái.
- Mỗi ngựa: `current_odds`, `total_bet`, `num_bettors`.

### Công thức
- `pool` = tổng tiền cược. Với mỗi con: `payout = total_bet × odds`, `liability = payout − pool` (dương = nhà cái lỗ nếu con này thắng).
- `risk_score = max_liability / treasury` — so kịch bản xấu nhất với vốn.
  - `treasury ≤ 0` → `risk_score = 999` (mốc hữu hạn thay cho vô cực, vì JSON không có `Infinity`).
- `risk_level`: LOW (≤10%) → MEDIUM (≤25%) → HIGH (≤50%) → CRITICAL.
- Nếu 1 cửa chiếm > 40% pool và đang lỗ → đề xuất **hạ odds** cửa đó (tối đa 10%).
- File: `ai/risk.py`.

### Output
- `risk_score`, `risk_level`, `total_pool`, `worst_case_liability`, và per-horse `liability_if_win` + `suggested_odds`.

### Vai trò
- Chỉ hoạt động **sau khi mở cược**, đưa đề xuất điều chỉnh odds.
- Admin quyết định áp dụng hay không. **Không** ảnh hưởng các vé đã đặt trước khi odds đổi.

---

## Rating động: cập nhật OR/RPR sau mỗi cuộc đua (rule-based)

OR/RPR là dữ liệu "sống", thay đổi theo thành tích. Ngoài đời do handicapper chấm bằng công thức, **không phải ML** → ở đây dùng luật đơn giản.

- **Snapshot**: khi duyệt entry vào đua, chép OR/RPR hiện tại vào `RaceEntry.officialRatingSnapshot` / `racingPostRatingSnapshot`. `Horse.officialRating/racingPostRating` là giá trị *hiện tại* (bị cập nhật sau đua); snapshot giữ *lịch sử* để không làm sai lệch các lượt đua đã qua (giống `Prediction.lockedOdds`).
- **Cập nhật sau đua** (`backend/src/services/ratingUpdate.js`): khi kết quả thành chính thức (2 trọng tài khớp → `AUTO_MATCHED`, hoặc Admin xử xung đột → `RESOLVED`), cộng/trừ OR & RPR theo **vị trí về đích**:

  | Vị trí | Delta |
  |---|---|
  | Nhất | +3 |
  | Nhì | +1 |
  | Nửa trên còn lại | 0 |
  | Nửa dưới | −2 |
  | DNF / DQ | −3 |

  Rating kẹp trong `[40, 180]`.

---

## Endpoints (FastAPI — `ai/service/main.py`)

| Method | Path | Agent |
|---|---|---|
| POST | `/predict-odds` | Agent 1 — xác suất + odds ban đầu |
| POST | `/risk-score` | Agent 2 — risk score + odds đề xuất |
| GET | `/health` | kiểm tra service sống |
| GET | `/docs` | Swagger UI |

### Tích hợp phía backend Node
- `backend/src/services/aiPrediction.js` gọi `POST {AI_SERVICE_URL}/predict-odds`, gom entry **APPROVED** của một race, map DB → contract AI, khớp ngược kết quả theo `horseName`.
- Endpoint admin: `GET /api/admin/races/:id/ai-odds?margin=` (adminOnly). Chỉ đề xuất, **không** ghi bảng `Odds`.
- `backend/src/services/aiRisk.js` gọi `POST {AI_SERVICE_URL}/risk-score`, lấy odds hiện tại từ bảng `Odds` + tổng hợp exposure (`total_bet`, `num_bettors`) từ các `Prediction` còn `PENDING` của race (vé QUINELLA/EXACTA cộng dồn stake vào cả 2 entry đã chọn), khớp ngược kết quả theo `horseName`.
- Endpoint admin: `GET /api/admin/races/:id/risk-score?treasury=` (adminOnly). `treasury` là tham số bắt buộc (app chưa có khái niệm "vốn nhà cái" trong DB nên Admin tự cung cấp). Trả 409 nếu race chưa có `Odds` được tính (Odds tự tính khi đóng cổng đăng ký). Chỉ đề xuất, **không** ghi bảng `Odds`.
- Env: `AI_SERVICE_URL` (default `http://localhost:8000`; trong Docker: `http://ai_service:8000`), `AI_TIMEOUT_MS` (default 20000, để rộng cho cold-start nạp `model.pkl`).

---

## Chạy

```bash
# Train lại model (cần dataset trong docs/horseracing_dataset/):
python ai/train.py

# Chạy AI service:
uvicorn ai.service.main:app --reload --port 8000
# -> mở http://localhost:8000/docs

# Hoặc qua Docker (cả stack):
docker compose --env-file backend/.env up -d --build
```
