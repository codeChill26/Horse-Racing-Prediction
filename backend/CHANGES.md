# Betting Flow — Full API Specification

## Mục lục
1. [Xem thông tin trước khi cược (Read Data)](#1-xem-thông-tin-trước-khi-cược)
2. [Đặt cược (Place Bet)](#2-đặt-cược)
3. [Danh sách + Chi tiết cược (My Predictions)](#3-danh-sách--chi-tiết-cược)
4. [Hủy cược (Cancel)](#4-hủy-cược)
5. [Admin: Publish / Unpublish kết quả](#5-admin-publish--unpublish)
6. [Validation Checklist](#6-validation-checklist)
7. [Persistence Diagram](#7-persistence-diagram)

---

## 1. Xem thông tin trước khi cược

### `GET /api/races/:id/detail` (Public — không cần auth)

Trả về toàn bộ thông tin trận đấu + danh sách ngựa/jockey + odds real-time + lịch sử thi đấu.

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
      "jockey": {
        "userId": 5,
        "fullName": "Trần Thị B",
        "avatarUrl": null,
        "weight": 50.0,
        "careerStats": {
          "totalStarts": 15,
          "wins": 3,
          "winRate": 20.0,
          "avgPosition": 3.5
        }
      },
      "pairCareerStats": null,
      "oddsFinal": 8.2
    }
  ]
}
```

### `GET /api/races/open` (Public)
Danh sách các trận đấu đang mở đăng ký (registrationOpen = true).

### `GET /api/tournaments/:id/races` (Public)
Danh sách các trận đấu trong một giải đấu.

---

## 2. Đặt cược

### `POST /api/predictions` (Auth + Spectator only)

#### Request body:
```json
{
  "raceId": 1,
  "betType": "WIN",
  "entryIds": [5],
  "betAmount": 50
}
```

#### Các loại cược (betType):

| betType | entryIds | Ý nghĩa | Ví dụ thắng |
|---------|----------|---------|-------------|
| `WIN` | `[entryId]` | Chọn 1 ngựa **về nhất** | entryId 5 = hạng 1 |
| `PLACE` | `[entryId]` | Chọn 1 ngựa **về nhất hoặc nhì** | entryId 5 = hạng 1 hoặc 2 |
| `SHOW` | `[entryId]` | Chọn 1 ngựa **lọt vào Top 3** | entryId 5 = hạng 1/2/3 |
| `QUINELLA` | `[e1, e2]` | Chọn 2 ngựa **về nhất + nhì** (không cần đúng thứ tự) | e1=1st, e2=2nd HOẶC e1=2nd, e2=1st |
| `EXACTA` | `[e1, e2]` | Chọn 2 ngựa **chỉ định rõ** con nào nhất, con nào nhì | e1=1st, e2=2nd |

#### Luồng xử lý (Backend):

```
Request
  │
  ├── DTO Validation
  │   ├── spectactorId: parsePositiveInt
  │   ├── raceId: parsePositiveInt
  │   ├── betType: must be one of [WIN, PLACE, SHOW, QUINELLA, EXACTA]
  │   ├── entryIds: must be array
  │   │   ├── WIN/PLACE/SHOW → length === 1
  │   │   └── QUINELLA/EXACTA → length === 2, entries khác nhau
  │   └── betAmount: parsePositiveInt, >= 10
  │
  └── Service Logic (PredictionsService.placeBet)
      │
      ├── (1) Race tồn tại? → status === 'SCHEDULED'?
      ├── (2) Spectator tồn tại? → isActive === true?
      ├── (3) Tất cả entryIds thuộc raceId này? → status === 'APPROVED'?
      ├── (4) Wallet tồn tại? → isFrozen === 0?
      ├── (5) betAmount >= 10? ≤ 50% balance hiện tại?
      ├── (6) Odds đã được tính cho tất cả entries? → đọc oddsFinal từ Odds table
      │
      └── $transaction (atomic)
          ├── (7) Trừ điểm: wallet.balance -= betAmount
          ├── (8) Nếu balance < 0 → ROLLBACK
          ├── (9) Tạo WalletTransaction type='BET_PLACED', amount = -betAmount
          └── (10) Tạo Prediction record
               ├── betType, entryId1, entryId2 (nếu có)
               ├── lockedOdds = oddsFinal (WIN/PLACE/SHOW) hoặc avg(oddsFinal) (QUINELLA/EXACTA)
               └── status = 'PENDING'
```

#### Odds locking (`lockedOdds`):

| betType | lockedOdds |
|---------|------------|
| WIN | `oddsFinal` của entry được chọn |
| PLACE | `oddsFinal` của entry được chọn |
| SHOW | `oddsFinal` của entry được chọn |
| QUINELLA | `(oddsFinal[e1] + oddsFinal[e2]) / 2` |
| EXACTA | `(oddsFinal[e1] + oddsFinal[e2]) / 2` |

**Quan trọng**: Odds bị khóa tại thời điểm bấm nút "Đặt cược". Dù sau đó Admin có điều chỉnh odds, vé cược cũ vẫn giữ nguyên `lockedOdds`.

#### Response 201:
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
    "createdAt": "2026-06-18T10:30:00.000Z",
    "pick1": {
      "entryId": 5,
      "horse": { "horseId": 2, "name": "Thunder" }
    },
    "pick2": null,
    "race": { "raceId": 1, "name": "Chung kết Cup mùa hè" }
  }
}
```

---

## 3. Danh sách + Chi tiết cược

### `GET /api/predictions` (Auth required)
Liệt kê tất cả vé cược của user hiện tại, mới nhất trước.

### `GET /api/predictions/:id` (Auth required)
Chi tiết một vé cược (chỉ owner mới xem được).

**Response — Pick2 null (WIN/PLACE/SHOW):**
```json
{
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
    "createdAt": "...",
    "race": { "raceId": 1, "name": "...", "status": "SCHEDULED", "publishedAt": null },
    "pick1": { "entryId": 5, "horse": { "horseId": 2, "name": "Thunder" } },
    "pick2": null
  }
}
```

**Response — Pick2 có dữ liệu (QUINELLA/EXACTA):**
```json
{
  "prediction": {
    "predictionId": 2,
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
    "createdAt": "...",
    "race": { "raceId": 1, "name": "...", "status": "FINISHED", "publishedAt": "..." },
    "pick1": { "entryId": 5, "horse": { "horseId": 2, "name": "Thunder" } },
    "pick2": { "entryId": 7, "horse": { "horseId": 3, "name": "Lightning" } }
  }
}
```

---

## 4. Hủy cược

### `PUT /api/predictions/:id/cancel` (Auth + Spectator only)

**Điều kiện:**
- Vé cược phải ở trạng thái `PENDING`
- Trận đấu phải còn `SCHEDULED` (chưa bắt đầu)

**Luồng:**
```
$transaction
  ├── wallet.balance += betAmount (hoàn tiền 100%)
  ├── Tạo WalletTransaction type='BET_REFUND'
  └── Prediction.status = 'REFUNDED'
```

**Response 200:**
```json
{
  "message": "Prediction cancelled successfully",
  "prediction": {
    "predictionId": 1,
    "status": "REFUNDED",
    ...
  }
}
```

---

## 5. Đã xoá: Publish / Unpublish endpoints

**Xoá hoàn toàn:** `POST /api/admin/races/:id/publish` và `POST /api/admin/races/:id/unpublish`

**Các file đã update:**
| File | Thay đổi |
|------|----------|
| `src/routes/admin/races.js` | Xoá 2 route + import `predictionsController` |
| `src/controllers/predictions.controller.js` | Xoá `publishRaceResults`, `unpublishRaceResults` + exports |
| `src/services/predictions.js` | Xoá `publishResults()`, `unpublishResults()` methods + import `emitToAll` |
| `src/dto/prediction.dto.js` | Xoá `validatePublishResults`, `validateUnpublishResults` |
| `src/openapi.js` | Xoá 2 path entries |

**Tác dụng**: Code gọn lại. Settlement sẽ được implement sau.

---

## 6. Validation Checklist

| # | Check | Vị trí | HTTP Status | Error Message |
|---|-------|--------|-------------|---------------|
| 1 | `raceId` là integer dương | DTO | 400 | `Invalid race id` |
| 2 | `betType` là 1 trong 5 loại | DTO | 400 | `betType must be one of: WIN, PLACE, SHOW, QUINELLA, EXACTA` |
| 3 | `entryIds` là array | DTO | 400 | `entryIds must be an array of entry IDs` |
| 4 | WIN/PLACE/SHOW: đúng 1 entry | DTO | 400 | `WIN bet requires exactly 1 entry` |
| 5 | QUINELLA/EXACTA: đúng 2 entries | DTO | 400 | `QUINELLA bet requires exactly 2 entries` |
| 6 | 2 entries không được trùng | DTO | 400 | `The 2 selected entries must be different` |
| 7 | `betAmount` là integer dương | DTO | 400 | `Invalid bet amount` |
| 8 | `betAmount` >= 10 | DTO | 400 | `Minimum bet amount is 10 points` |
| 9 | Race tồn tại | Service | 404 | `Race not found` |
| 10 | Race status = SCHEDULED | Service | 409 | `Can only place bets on SCHEDULED races` |
| 11 | Spectator tồn tại + isActive | Service | 404/403 | `Spectator not found` / `Account is not active` |
| 12 | Entry thuộc race này | Service | 400 | `All entries must belong to the specified race` |
| 13 | Entry status = APPROVED | Service | 409 | `All selected entries must be in APPROVED status` |
| 14 | Wallet tồn tại | Service | 404 | `Wallet not found` |
| 15 | Wallet không frozen | Service | 403 | `Your wallet is frozen. Cannot place bets.` |
| 16 | betAmount <= 50% balance | Service | 400 | `Bet amount exceeds 50% of current balance` |
| 17 | Odds đã được tính | Service | 409 | `Odds not calculated for all selected entries yet` |
| 18 | Balance không âm sau trừ | Transaction | 400 | `Insufficient balance` |

---

## 7. Persistence Diagram

### Tables involved:

```
User (userId, isActive)
  │
  ├── PointWallet (walletId, userId, balance, isFrozen)
  │     └── WalletTransaction (transactionId, walletId, amount, balanceAfter, type, referenceType)
  │
  ├── Race (raceId, status, publishedAt)
  │     ├── RaceEntry (entryId, raceId, horseId, jockeyId, status)
  │     │     └── Odds (oddsId, entryId, raceId, oddsFinal)
  │     ├── RaceResult (resultId, raceId, horseId, finishPosition)
  │     └── Prediction (predictionId, spectatorId, raceId, betType, entryId1, entryId2?,
  │                     betAmount, lockedOdds, status, payout, settledAt)
  │
  └── Horse (horseId, ...)
```

### WalletTransaction types:

| type | Ý nghĩa | amount |
|------|---------|--------|
| `BET_PLACED` | Trừ điểm khi đặt cược | âm (`-betAmount`) |
| `BET_WIN` | Cộng điểm khi thắng | dương (`payout`) |
| `BET_REFUND` | Hoàn tiền (hủy/unpublish) | dương (`betAmount`) |
| `ADMIN_ADJUSTMENT` | Admin điều chỉnh | +/- |
| `WEEKLY_BONUS` | Thưởng hàng tuần | +100 |
| `INITIAL_BONUS` | Thưởng tạo tài khoản | +100 |

### Prediction status transitions:

```
PENDING ──(cancel)───→ REFUNDED
```

---

## 8. Tổng kết thay đổi code

| File | Thay đổi |
|------|----------|
| `prisma/schema.prisma` | Thêm enum `BetType`, sửa `Prediction` (betType, entryId2?, lockedOdds, xoá entryId3/pick3) |
| `src/dto/prediction.dto.js` | `validatePlaceBet` nhận betType + entryIds linh hoạt theo loại; xoá `validatePublishResults`, `validateUnpublishResults` |
| `src/services/predictions.js` | Viết lại: 5 bet types, odds locking, check isActive; xoá `publishResults()`, `unpublishResults()`, import `emitToAll` |
| `src/controllers/predictions.controller.js` | Truyền betType từ DTO → Service; xoá `publishRaceResults`, `unpublishRaceResults` |
| `src/services/owner.js` | Thêm `getRaceDetail` + 3 helpers career stats |
| `src/controllers/owner.controller.js` | Thêm `getRaceDetail` handler |
| `src/routes/races.js` | Thêm `GET /:id/detail` |
| `src/routes/admin/races.js` | Xoá 2 route publish/unpublish + import `predictionsController` |
| `src/openapi.js` | Cập nhật schemas + endpoint description; xoá 2 path entries publish/unpublish |
