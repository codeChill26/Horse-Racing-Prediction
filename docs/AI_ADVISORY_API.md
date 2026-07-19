# AI Advisory API — Đặc tả cho Frontend

Đặc tả 2 endpoint gọi AI service để lấy **gợi ý** (odds ban đầu + đánh giá rủi ro) cho Admin.
Cả 2 đều **chỉ đề xuất** — không tự ghi đè bảng `Odds` chính thức, Admin xem xong tự quyết định
có áp dụng hay không.

## Kiến trúc gọi (quan trọng để hiểu luồng)

Frontend **không bao giờ gọi thẳng AI service** (port 8000). Luôn gọi qua Backend (port 3000);
Backend tự làm 1 request nội bộ khác (POST) sang AI service, ghép kết quả với dữ liệu DB rồi
mới trả về:

```
[Frontend]                     [Backend Node]                    [AI Service Python]
    │                                │                                   │
    │  GET /api/admin/races/:id/...  │                                   │
    │ ──────────────────────────────▶│                                   │
    │   (request duy nhất bạn gọi)   │  POST /predict-odds hoặc          │
    │                                │  POST /risk-score                 │
    │                                │ ──────────────────────────────────▶│
    │                                │ ◀──────────────────────────────────│
    │ ◀──────────────────────────────│                                   │
    │   JSON kết quả cuối cùng       │                                   │
```

---

## 1. Gợi ý Odds ban đầu (Agent 1 — AI Prediction)

### `GET /api/admin/races/:id/ai-odds`

- **Auth:** `Bearer <accessToken>`, role `ADMIN`
- **Mô tả:** Lấy xác suất thắng + odds gợi ý (từ model ML) cho toàn bộ ngựa đã APPROVED của một race.
- **Nguồn:** [`adminRaces.controller.js`](../backend/src/controllers/adminRaces.controller.js) `getAiOddsSuggestion` → [`aiPrediction.js`](../backend/src/services/aiPrediction.js) `getRaceOddsSuggestion`

### Path params

| Param | Kiểu | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `id` | integer dương | ✅ | `raceId` |

### Query params

| Param | Kiểu | Bắt buộc | Mặc định | Ghi chú |
|-------|------|----------|----------|---------|
| `margin` | float ≥ 0 | ❌ | `0.15` (do AI service tự áp nếu không truyền) | Biên lợi nhuận nhà cái (overround). `suggestedOdds = fairOdds / (1 + margin)` |

### Điều kiện tiên quyết

1. Race phải tồn tại.
2. Race phải có **ít nhất 1 `RaceEntry` ở trạng thái `APPROVED`** — nếu không sẽ lỗi 409.

### Response `200 OK`

Ví dụ thật (đã test trực tiếp, race có 5 entries APPROVED):

```json
{
  "raceId": 2,
  "raceName": "Chặng 1: Khởi động",
  "source": "AI_PREDICTION_ENGINE",
  "note": "Đây là gợi ý từ AI (chỉ tham khảo), chưa ghi vào bảng Odds chính thức.",
  "suggestions": [
    {
      "entryId": 6,
      "horseId": 18,
      "horseName": "Vautour",
      "jockeyName": "R Walsh",
      "rank": 1,
      "winProbability": 25.99,
      "fairOdds": 3.85,
      "suggestedOdds": 3.35
    },
    {
      "entryId": 9,
      "horseId": 21,
      "horseName": "Faugheen",
      "jockeyName": "Paul Townend",
      "rank": 2,
      "winProbability": 19.87,
      "fairOdds": 5.03,
      "suggestedOdds": 4.38
    }
  ]
}
```

### Field response

| Field | Kiểu | Ý nghĩa |
|-------|------|---------|
| `suggestions[].rank` | integer | Xếp hạng theo xác suất thắng, giảm dần (1 = khả năng thắng cao nhất) |
| `suggestions[].winProbability` | float | Xác suất thắng (%), đã chuẩn hóa để tổng các entry trong 1 race = 100% |
| `suggestions[].fairOdds` | float | Odds "công bằng" = `1 / winProbability` — chưa trừ margin |
| `suggestions[].suggestedOdds` | float | Odds đề xuất cuối cùng = `fairOdds / (1 + margin)` — con số nên dùng |
| `suggestions[].entryId` / `horseId` | integer \| null | `null` nếu AI trả về `horseName` không khớp được entry nào (hiếm, do khớp theo tên) |

### Errors

| Status | Khi nào | Message |
|--------|---------|---------|
| 400 | `id` không phải số nguyên dương | `Invalid race id` |
| 400 | `margin` không phải số hoặc âm | `margin must be a non-negative number` |
| 401 | Chưa đăng nhập / token hết hạn | — |
| 403 | Không phải role `ADMIN` | — |
| 404 | Race không tồn tại | `Race not found` |
| 409 | Race chưa có entry nào APPROVED | `Race has no APPROVED entries to predict.` |
| 502 | AI service không chạy / quá thời gian chờ / trả lỗi | `AI service không kết nối được/quá thời gian chờ tại ...` |

---

## 2. Đánh giá rủi ro (Agent 2 — AI Risk)

### `GET /api/admin/races/:id/risk-score`

- **Auth:** `Bearer <accessToken>`, role `ADMIN`
- **Mô tả:** Tính risk score dựa trên các cược `PENDING` hiện tại + odds đã treo, so với vốn nhà cái (`treasury`). Có thể gợi ý hạ odds cửa nào đang bị cược lệch.
- **Nguồn:** [`adminRaces.controller.js`](../backend/src/controllers/adminRaces.controller.js) `getRiskAssessment` → [`aiRisk.js`](../backend/src/services/aiRisk.js) `getRaceRiskAssessment`

### Path params

| Param | Kiểu | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `id` | integer dương | ✅ | `raceId` |

### Query params

| Param | Kiểu | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `treasury` | float ≥ 0 | ✅ | Vốn hiện có của nhà cái. Hệ thống **không tự lưu** giá trị này ở đâu — người gọi phải tự nhập mỗi lần. |

### Điều kiện tiên quyết (phải đủ **cả hai**)

1. Race đã **được áp odds** trước đó và sau đó **đóng cổng đăng ký** qua `PUT /api/admin/races/:id/registration-gate` (`isOpen:false`).
2. Tại thời điểm đóng cổng, hệ thống **không tự tính lại odds**; nếu race chưa có `Odds` từ trước thì `risk-score` vẫn trả 409.

> Race đang mở đăng ký, hoặc đã đóng nhưng không có ngựa nào được duyệt → luôn nhận lỗi 409 dưới đây.

### Response `200 OK`

Ví dụ minh họa (dựng lại từ demo trong [`ai/risk.py`](../ai/risk.py), 3 ngựa, treasury=10000, đúng công thức code đang chạy):

```json
{
  "raceId": 2,
  "raceName": "Chặng 1: Khởi động",
  "source": "AI_RISK_ENGINE",
  "note": "Đây là gợi ý từ AI (chỉ tham khảo), chưa ghi vào bảng Odds chính thức.",
  "riskScore": 1.0,
  "riskLevel": "CRITICAL",
  "totalPool": 10000.0,
  "worstCaseLiability": 10000.0,
  "treasury": 10000.0,
  "horses": [
    {
      "entryId": 6,
      "horseId": 18,
      "horseName": "Thunderbolt",
      "currentOdds": 2.5,
      "totalBet": 8000.0,
      "numBettors": 40,
      "poolShare": 80.0,
      "liabilityIfWin": 10000.0,
      "suggestedOdds": 2.25,
      "reason": "cửa này chiếm 80% pool -> hạ odds 10%"
    },
    {
      "entryId": 9,
      "horseId": 21,
      "horseName": "Silver Arrow",
      "currentOdds": 3.2,
      "totalBet": 1500.0,
      "numBettors": 12,
      "poolShare": 15.0,
      "liabilityIfWin": -5200.0,
      "suggestedOdds": 3.2,
      "reason": "giữ nguyên"
    }
  ]
}
```

### Field response

| Field | Kiểu | Ý nghĩa |
|-------|------|---------|
| `riskScore` | float | `worstCaseLiability / treasury` — kịch bản xấu nhất chiếm bao nhiêu % vốn |
| `riskLevel` | `LOW`\|`MEDIUM`\|`HIGH`\|`CRITICAL` | `≤10%`\|`≤25%`\|`≤50%`\|`>50%` treasury |
| `totalPool` | float | Tổng tiền cược `PENDING` của cả race (tất cả các cửa cộng lại) |
| `worstCaseLiability` | float | Số tiền phải trả nhiều nhất nếu đúng cửa gây lỗ lớn nhất thắng |
| `horses[].currentOdds` | float | Odds đang treo thật trong bảng `Odds` (không phải AI tính, là số hiện có trước khi gọi API này) |
| `horses[].totalBet` | float | Tổng tiền đã cược vào cửa này (chỉ tính vé `PENDING`) |
| `horses[].numBettors` | integer | Số người cược riêng biệt vào cửa này |
| `horses[].poolShare` | float (%) | Cửa này chiếm bao nhiêu % tổng pool |
| `horses[].liabilityIfWin` | float | `payout - totalPool` nếu cửa này thắng. Dương = nhà cái lỗ |
| `horses[].suggestedOdds` | float | Odds đề xuất mới. Chỉ hạ khi `poolShare > 40%` **và** `liabilityIfWin > 0`, tối đa hạ 10% mỗi lần |
| `horses[].reason` | string | Giải thích vì sao đề xuất (hoặc `"giữ nguyên"`) |

### Errors

| Status | Khi nào | Message |
|--------|---------|---------|
| 400 | `id` không phải số nguyên dương | `Invalid race id` |
| 400 | Thiếu `treasury` | `treasury query parameter is required` |
| 400 | `treasury` không phải số hoặc âm | `treasury must be a non-negative number` |
| 401 | Chưa đăng nhập / token hết hạn | — |
| 403 | Không phải role `ADMIN` | — |
| 404 | Race không tồn tại | `Race not found` |
| 409 | Race chưa có odds (chưa áp AI/admin odds trước khi đóng cổng) | `Race has no computed odds yet. Apply AI/admin odds before closing the registration gate.` |
| 502 | AI service không chạy / quá thời gian chờ / trả lỗi | `AI service không kết nối được/quá thời gian chờ tại ...` |

---

## 3. Áp dụng odds mới (Admin toàn quyền quyết định)

### `PATCH /api/admin/races/:id/odds`

- **Auth:** `Bearer <accessToken>`, role `ADMIN`
- **Mô tả:** Admin ghi đè odds thật cho **TOÀN BỘ** entry `APPROVED` của race trong 1 lần gọi
  duy nhất (không cho sửa từng entry riêng lẻ). Có thể dùng số AI gợi ý (`ai-odds`) làm giá trị
  khởi tạo rồi admin tự sửa tay trước khi gửi — quyết định cuối luôn là Admin.
- **Vì sao bắt buộc gửi đủ tất cả entry cùng lúc:** nếu chỉ sửa 1 con mà không đụng 4 con còn
  lại, tổng xác suất ngầm định (`Σ 1/oddsFinal`) của cả race sẽ lệch khỏi mức `100% + margin`
  ngay lập tức. Gửi cả bộ cùng lúc là cách duy nhất đảm bảo tính nhất quán.
- **Nguồn:** [`adminRaces.controller.js`](../backend/src/controllers/adminRaces.controller.js) `applyOddsSuggestions` → [`odds.js`](../backend/src/services/odds.js) `applyOddsSuggestions`

### Path params

| Param | Kiểu | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `id` | integer dương | ✅ | `raceId` |

### Request body

```json
{
  "entries": [
    { "entryId": 6, "oddsFinal": 3.35 },
    { "entryId": 9, "oddsFinal": 4.38 },
    { "entryId": 10, "oddsFinal": 7.88 },
    { "entryId": 8, "oddsFinal": 15.0 },
    { "entryId": 7, "oddsFinal": 17.51 }
  ]
}
```

| Field | Kiểu | Bắt buộc | Ghi chú |
|-------|------|----------|---------|
| `entries` | array | ✅ | Phải chứa **đúng** tất cả entry đang `APPROVED` của race — thiếu/thừa đều bị từ chối |
| `entries[].entryId` | integer dương | ✅ | Phải thuộc race này và đang `APPROVED` |
| `entries[].oddsFinal` | float | ✅ | Trong khoảng `1.2` – `20.0` |

### Điều kiện tiên quyết

1. Race phải tồn tại và đang ở trạng thái `SCHEDULED`.
2. Đã **đóng cổng đăng ký** (`registrationOpen = false`).
3. `entries` phải khớp **chính xác** số lượng entry `APPROVED` hiện có của race (không thiếu, không thừa, không lẫn entry của race khác).

### Response `200 OK`

```json
{
  "message": "Áp dụng odds thành công",
  "odds": [
    {
      "oddsId": 14,
      "raceId": 2,
      "entryId": 6,
      "oddsFinal": "3.35",
      "entry": { "horse": { "horseId": 18, "name": "Vautour" }, "jockey": { "fullName": "R Walsh" } }
    }
  ]
}
```

### Errors

| Status | Khi nào | Message |
|--------|---------|---------|
| 400 | `entryId`/`oddsFinal` sai kiểu hoặc thiếu | `Each entry must have a valid entryId` / `Odds phải là số dương (entry <id>)` |
| 400 | Thiếu/thừa entry so với số `APPROVED` thực tế | `Phải áp dụng odds cho đủ tất cả N entry APPROVED của race (nhận được M)` |
| 400 | `oddsFinal` ngoài khoảng `1.2`–`20.0` | `Odds phải trong khoảng 1.2 - 20 (entry <id>)` |
| 404 | Race không tồn tại | `Race not found` |
| 404 | Entry không thuộc race này | `Entry <id> không thuộc race này` |
| 409 | Race không ở trạng thái `SCHEDULED` | `Chỉ có thể sửa odds khi race đang ở trạng thái SCHEDULED` |
| 409 | Race đang mở đăng ký (chưa đóng cổng) | `Race đang mở đăng ký, chưa có odds để sửa. Đóng cổng đăng ký trước.` |

### Lưu ý quan trọng — khác với trước đây

Trước đây đóng cổng đăng ký (`PUT .../registration-gate`) sẽ **tự động** tính odds bằng công
thức rule-based (dựa trên phong độ lịch sử). Giờ **không còn tự động tính nữa** — đóng cổng chỉ
đổi trạng thái + auto-reject entry `PENDING`, **Admin phải tự áp odds** qua endpoint này (có thể
tham khảo gợi ý AI trước). Đây là lý do `risk-score` (mục 2) đổi điều kiện tiên quyết: không còn
nói "tự động tính khi đóng cổng" nữa, mà yêu cầu Admin đã áp odds thủ công trước đó.

---

## Gọi từ Frontend (ví dụ)

```js
async function getAiOdds(raceId, margin) {
  const url = margin != null
    ? `/api/admin/races/${raceId}/ai-odds?margin=${margin}`
    : `/api/admin/races/${raceId}/ai-odds`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) await readError(res, 'Không lấy được gợi ý odds từ AI');
  return res.json();
}

async function getRiskScore(raceId, treasury) {
  const res = await fetch(
    `/api/admin/races/${raceId}/risk-score?treasury=${treasury}`,
    { headers: authHeaders() }
  );
  if (!res.ok) await readError(res, 'Không lấy được đánh giá rủi ro từ AI');
  return res.json();
}
```

Cả hai đều là `GET` thuần, không có body — tham số truyền qua query string trên URL. Có thể
gắn thẳng vào `onClick` của nút bấm (không cần `<form>`), giống các repository khác trong
`frontend/src/repositories/`.
