# Betting API — Đặc tả đầy đủ

## Tổng quan luồng

```
[Spectator mở màn hình Race]
        │
        ▼
GET /api/races/:id/detail          ← Xem ngựa, jockey, career stats, odds
        │
        ▼
[Chọn loại cược + nhập số điểm]
        │
        ▼
POST /api/predictions              ← Đặt cược, khóa odds tại thời điểm này
        │
        ▼
GET  /api/predictions              ← Xem lịch sử vé cược (Pending → Won/Lost/Refunded)
PUT  /api/predictions/:id/cancel   ← Hủy vé (khi race còn SCHEDULED)
```

---

## 1. Xem thông tin trước khi cược

### `GET /api/races/:id/detail`

- **Auth:** Không yêu cầu (public)
- **Mô tả:** Trả về toàn bộ thông tin trận đấu gồm danh sách entries đã được duyệt, career stats ngựa/jockey/cặp đôi, và odds real-time.

**Response 200:**
```json
{
  "raceId": 1,
  "name": "Chung kết Cup mùa hè",
  "status": "SCHEDULED",
  "maxEntries": 8,
  "scheduledAt": "2026-07-01T10:00:00.000Z",
  "registrationOpen": true,
  "registrationDeadline": "2026-06-30T23:59:00.000Z",
  "tournament": {
    "tournamentId": 1,
    "name": "Summer Cup 2026",
    "status": "OPEN"
  },
  "entries": [
    {
      "entryId": 5,
      "horse": {
        "horseId": 2,
        "name": "Thunder",
        "imageUrl": "https://...",
        "careerStats": {
          "totalStarts": 10,
          "wins": 3,
          "winRate": 30.0,
          "avgPosition": 3.2
        }
      },
      "jockey": {
        "userId": 4,
        "fullName": "Nguyễn Văn A",
        "avatarUrl": null,
        "weight": 52.5,
        "careerStats": {
          "totalStarts": 25,
          "wins": 8,
          "winRate": 32.0,
          "avgPosition": 2.8
        }
      },
      "pairCareerStats": {
        "totalStarts": 5,
        "wins": 2,
        "winRate": 40.0
      },
      "oddsFinal": 3.5
    },
    {
      "entryId": 7,
      "horse": {
        "horseId": 3,
        "name": "Lightning",
        "imageUrl": null,
        "careerStats": {
          "totalStarts": 8,
          "wins": 1,
          "winRate": 12.5,
          "avgPosition": 4.1
        }
      },
      "jockey": null,
      "pairCareerStats": null,
      "oddsFinal": 8.2
    }
  ]
}
```

**Errors:**
| Status | Khi nào |
|--------|---------|
| 400 | `id` không phải số nguyên dương |
| 404 | Race không tồn tại |

---

## 2. Đặt cược

### `POST /api/predictions`

- **Auth:** `Bearer <accessToken>` (SPECTATOR role)
- **Mô tả:** Tạo một vé cược mới. Odds bị khóa ngay tại thời điểm gọi API.

**Request body:**
```json
{
  "raceId": 1,
  "betType": "WIN",
  "entryIds": [5],
  "betAmount": 50
}
```

### Các loại cược (`betType`)

| `betType` | `entryIds` | Điều kiện thắng |
|-----------|------------|-----------------|
| `WIN` | `[entryId]` | Entry được chọn **về nhất** |
| `PLACE` | `[entryId]` | Entry được chọn **về nhất hoặc nhì** |
| `SHOW` | `[entryId]` | Entry được chọn **lọt Top 3** |
| `QUINELLA` | `[e1, e2]` | 2 entry chiếm hạng 1 và 2 (**bất kỳ thứ tự**) |
| `EXACTA` | `[e1, e2]` | e1 = **hạng nhất**, e2 = **hạng nhì** (đúng thứ tự) |

### Công thức `lockedOdds`

| `betType` | `lockedOdds` |
|-----------|--------------|
| WIN / PLACE / SHOW | `oddsFinal` của entry được chọn |
| QUINELLA / EXACTA | `(oddsFinal[e1] + oddsFinal[e2]) / 2` (làm tròn 2 chữ số) |

> **Quan trọng:** Odds được khóa cứng tại thời điểm bấm "Xác nhận". Admin thay đổi odds sau đó không ảnh hưởng đến vé cược đã tạo.

**Response 201:**
```json
{
  "message": "Bet placed successfully",
  "prediction": {
    "predictionId": 1,
    "spectatorId": 3,
    "raceId": 1,
    "betType": "WIN",
    "entryId1": 5,
    "entryId2": null,
    "betAmount": 50,
    "lockedOdds": 3.5,
    "status": "PENDING",
    "payout": null,
    "settledAt": null,
    "createdAt": "2026-06-29T10:30:00.000Z",
    "pick1": {
      "entryId": 5,
      "horse": { "horseId": 2, "name": "Thunder" }
    },
    "pick2": null,
    "race": { "raceId": 1, "name": "Chung kết Cup mùa hè" }
  }
}
```

**Response 201 — QUINELLA/EXACTA:**
```json
{
  "message": "Bet placed successfully",
  "prediction": {
    "predictionId": 2,
    "betType": "QUINELLA",
    "entryId1": 5,
    "entryId2": 7,
    "betAmount": 100,
    "lockedOdds": 5.85,
    "status": "PENDING",
    "pick1": { "entryId": 5, "horse": { "horseId": 2, "name": "Thunder" } },
    "pick2": { "entryId": 7, "horse": { "horseId": 3, "name": "Lightning" } }
  }
}
```

### Validation đầy đủ

| # | Kiểm tra | Layer | HTTP | Error message |
|---|----------|-------|------|---------------|
| 1 | `raceId` là integer dương | DTO | 400 | `Invalid race id` |
| 2 | `betType` thuộc `[WIN, PLACE, SHOW, QUINELLA, EXACTA]` | DTO | 400 | `betType must be one of: WIN, PLACE, SHOW, QUINELLA, EXACTA` |
| 3 | `entryIds` là array | DTO | 400 | `entryIds must be an array of entry IDs` |
| 4 | WIN/PLACE/SHOW: đúng 1 entry | DTO | 400 | `WIN bet requires exactly 1 entry` |
| 5 | QUINELLA/EXACTA: đúng 2 entries | DTO | 400 | `QUINELLA bet requires exactly 2 entries` |
| 6 | 2 entries không được trùng nhau | DTO | 400 | `The 2 selected entries must be different` |
| 7 | `betAmount` là integer dương | DTO | 400 | `Invalid bet amount` |
| 8 | `betAmount >= 10` | DTO | 400 | `Minimum bet amount is 10 points` |
| 9 | Race tồn tại | Service | 404 | `Race not found` |
| 10 | Race status = `SCHEDULED` | Service | 409 | `Can only place bets on SCHEDULED races` |
| 11 | Spectator tồn tại | Service | 404 | `Spectator not found` |
| 12 | Spectator `isActive = true` | Service | 403 | `Account is not active. Cannot place bets.` |
| 13 | Tất cả entries thuộc race này | Service | 400 | `All entries must belong to the specified race` |
| 14 | Tất cả entries `status = APPROVED` | Service | 409 | `All selected entries must be in APPROVED status` |
| 15 | Wallet tồn tại | Service | 404 | `Wallet not found. Spectator must have a wallet.` |
| 16 | Wallet `isFrozen = 0` | Service | 403 | `Your wallet is frozen. Cannot place bets.` |
| 17 | `betAmount <= 50% balance` | Service | 400 | `Bet amount exceeds 50% of current balance. Max allowed: {n}` |
| 18 | Odds đã được tính cho tất cả entries | Service | 409 | `Odds not calculated for all selected entries yet` |
| 19 | Balance không âm sau khi trừ (race condition guard) | Transaction | 400 | `Insufficient balance` |

---

## 3. Xem danh sách vé cược

### `GET /api/predictions`

- **Auth:** `Bearer <accessToken>`
- **Mô tả:** Trả về tất cả vé cược của user hiện tại, sắp xếp mới nhất trước.

**Response 200:**
```json
{
  "predictions": [
    {
      "predictionId": 1,
      "spectatorId": 3,
      "raceId": 1,
      "betType": "WIN",
      "entryId1": 5,
      "entryId2": null,
      "betAmount": 50,
      "lockedOdds": 3.5,
      "status": "PENDING",
      "payout": null,
      "settledAt": null,
      "createdAt": "2026-06-29T10:30:00.000Z",
      "race": { "raceId": 1, "name": "Chung kết Cup mùa hè", "status": "SCHEDULED" },
      "pick1": { "entryId": 5, "horse": { "horseId": 2, "name": "Thunder" } },
      "pick2": null
    }
  ]
}
```

**Errors:**
| Status | Khi nào |
|--------|---------|
| 401 | Chưa đăng nhập |

---

## 4. Xem chi tiết một vé cược

### `GET /api/predictions/:id`

- **Auth:** `Bearer <accessToken>` (chỉ owner mới xem được)
- **Mô tả:** Trả về chi tiết đầy đủ của một vé cược.

**Response 200:**
```json
{
  "prediction": {
    "predictionId": 1,
    "spectatorId": 3,
    "raceId": 1,
    "betType": "QUINELLA",
    "entryId1": 5,
    "entryId2": 7,
    "betAmount": 100,
    "lockedOdds": 5.85,
    "status": "WON",
    "payout": 585,
    "settledAt": "2026-07-01T12:00:00.000Z",
    "createdAt": "2026-06-29T10:30:00.000Z",
    "race": {
      "raceId": 1,
      "name": "Chung kết Cup mùa hè",
      "status": "FINISHED",
      "publishedAt": "2026-07-01T12:00:00.000Z"
    },
    "pick1": { "entryId": 5, "horse": { "horseId": 2, "name": "Thunder" } },
    "pick2": { "entryId": 7, "horse": { "horseId": 3, "name": "Lightning" } }
  }
}
```

**Errors:**
| Status | Khi nào |
|--------|---------|
| 400 | `id` không hợp lệ |
| 401 | Chưa đăng nhập |
| 403 | Vé cược không thuộc user này |
| 404 | Không tìm thấy vé cược |

---

## 5. Hủy vé cược

### `PUT /api/predictions/:id/cancel`

- **Auth:** `Bearer <accessToken>` (SPECTATOR role)
- **Mô tả:** Hủy một vé cược PENDING và hoàn trả 100% điểm cược.

**Điều kiện:**
- Vé cược phải ở trạng thái `PENDING`
- Race phải còn ở trạng thái `SCHEDULED` (chưa bắt đầu)

**Response 200:**
```json
{
  "message": "Prediction cancelled successfully",
  "prediction": {
    "predictionId": 1,
    "status": "REFUNDED",
    "betAmount": 50
  }
}
```

**Errors:**
| Status | Khi nào |
|--------|---------|
| 400 | `id` không hợp lệ |
| 401 | Chưa đăng nhập |
| 403 | Vé không thuộc user này |
| 404 | Không tìm thấy vé |
| 409 | Vé không ở trạng thái `PENDING` |
| 409 | Race không còn `SCHEDULED` (đã bắt đầu) |

---

## Trạng thái vé cược (`PredictionStatus`)

| Status | Ý nghĩa |
|--------|---------|
| `PENDING` | Chờ kết quả trận đấu |
| `WON` | Thắng toàn phần |
| `PARTIAL_WON` | Thắng một phần |
| `LOST` | Thua |
| `REFUNDED` | Đã hủy và hoàn tiền |

```
PENDING ──(hủy thủ công)──→ REFUNDED
PENDING ──(admin settle)──→ WON | PARTIAL_WON | LOST
```

---

## Wallet Transactions liên quan

| `type` | Ý nghĩa | `amount` |
|--------|---------|----------|
| `BET_PLACED` | Trừ điểm khi đặt cược | âm (`-betAmount`) |
| `BET_WIN` | Cộng điểm khi thắng | dương (`+payout`) |
| `BET_REFUND` | Hoàn tiền khi hủy | dương (`+betAmount`) |

---

## Sơ đồ dữ liệu (các bảng liên quan)

```
User (userId, isActive)
  │
  ├── PointWallet (walletId, userId, balance, isFrozen)
  │     └── WalletTransaction (transactionId, walletId, amount, balanceAfter, type, referenceType)
  │
  └── Race (raceId, status)
        ├── RaceEntry (entryId, raceId, horseId, jockeyId, status=APPROVED)
        │     └── Odds (oddsId, entryId, raceId, oddsFinal)
        ├── RaceResult (resultId, raceId, horseId, finishPosition)
        └── Prediction (predictionId, spectatorId, raceId,
                        betType, entryId1, entryId2?,
                        betAmount, lockedOdds,
                        status, payout, settledAt)
```

---

## Frontend Integration

### Repository (`bettingRepository.js`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `getOpenRaces()` | `GET /api/races/open` | Danh sách race đang mở |
| `getRaceDetails(raceId)` | `GET /api/races/:id/detail` | Chi tiết race + entries + odds |
| `placeBet({ raceId, betType, entryIds, betAmount })` | `POST /api/predictions` | Đặt cược |
| `getMyBets()` | `GET /api/predictions` | Lịch sử vé cược |
| `getBetDetails(predictionId)` | `GET /api/predictions/:id` | Chi tiết vé cược |
| `cancelBet(predictionId)` | `PUT /api/predictions/:id/cancel` | Hủy vé cược |

### Service (`bettingService.js`)

`placeBet` nhận thêm `walletBalance` để validate 50% trước khi gọi API:
```js
await bettingService.placeBet({
  raceId: 1,
  betType: 'WIN',          // WIN | PLACE | SHOW | QUINELLA | EXACTA
  entryIds: [5],            // WIN/PLACE/SHOW: [entryId]; QUINELLA/EXACTA: [e1, e2]
  betAmount: 50,
  walletBalance: 1000,      // để validate max 50% client-side
})
```

### Component (`BettingModal.jsx`)

Props:
```js
<BettingModal
  race={race}               // object race (phải có race.raceId và race.status)
  entries={entries}         // array từ GET /api/races/:id/detail → entries[]
  userBalance={1000}        // số PTS hiện tại
  onClose={() => {}}
  onPlaced={(prediction) => {}}  // callback nhận prediction object sau khi đặt thành công
/>
```
