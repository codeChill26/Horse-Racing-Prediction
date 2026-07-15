# Luồng Hệ Thống Chi Tiết — API Endpoints & Validation Rules

> Document này mô tả chi tiết từng API endpoint trong luồng hệ thống, kèm theo validation rules và response examples. Dành cho Mobile/FE developers implement chính xác.

---

## Mục lục

1. [Luồng Tournament](#1-luồng-tournament)
2. [Luồng Race & Registration](#2-luồng-race--registration)
3. [Luồng Horse & Entry](#3-luồng-horse--entry)
4. [Luồng Jockey Invitation](#4-luồng-jockey-invitation)
5. [Luồng Betting (Spectator)](#5-luồng-betting-spectator)
6. [Luồng Referee](#6-luồng-referee)
7. [Luồng Settlement (Admin)](#7-luồng-settlement-admin)
8. [Bảng tổng hợp Status Transitions](#8-bảng-tổng-hợp-status-transitions)

---

## 1. Luồng Tournament

### 1.1 Tạo Tournament

```
POST /api/admin/tournaments
Role: ADMIN
```

**Request Body:**
```json
{
  "name": "Summer Cup 2026",
  "description": "Giải đấu mùa hè",
  "startAt": "2026-07-01T00:00:00.000Z",
  "endAt": "2026-07-15T00:00:00.000Z"
}
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | `name` required, non-empty | 400 |
| 2 | `startAt`/`endAt` optional, valid ISO datetime | 400 |
| 3 | If both: `startAt <= endAt` | 400 |

**Response 201:**
```json
{
  "message": "Tournament created successfully",
  "tournament": {
    "tournamentId": 1,
    "name": "Summer Cup 2026",
    "status": "DRAFT",
    "_count": { "races": 0 }
  }
}
```

### 1.2 Đổi Status Tournament

```
PATCH /api/admin/tournaments/:id/status
Role: ADMIN
```

**Request Body:**
```json
{ "status": "OPEN" }
```

**Allowed Transitions:**
```
DRAFT → OPEN → ONGOING → FINISHED
DRAFT | OPEN | ONGOING → CANCELLED (requires cancelReason)
```

**Response 200:**
```json
{
  "message": "Tournament status updated successfully",
  "tournament": {
    "tournamentId": 1,
    "status": "OPEN"
  }
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 400 | Missing status |
| 409 | Invalid transition |
| 400 | Cancelling without `cancelReason` |

---

## 2. Luồng Race & Registration

### 2.1 Tạo Race (Internal)

```
POST /api/admin/races (internal only - no public API)
```

**Response:**
```json
{
  "raceId": 1,
  "name": "Race 1",
  "status": "SCHEDULED",
  "registrationOpen": false,
  "registrationOpenedAt": null,
  "registrationClosedAt": null
}
```

### 2.2 Mở/Đóng Cổng Đăng Ký

```
PUT /api/admin/races/:id/registration-gate
Role: ADMIN
```

**Request Body:**
```json
{ "isOpen": true }   // Mở cổng
{ "isOpen": false }  // Đóng cổng
```

**Side Effect:**
- Đóng cổng (`isOpen=false`) sẽ auto-reject tất cả `PENDING` entries với reason: "Registration gate closed by admin."

**Response 200:**
```json
{
  "message": "Race registration gate closed successfully",
  "race": {
    "raceId": 1,
    "registrationOpen": false,
    "registrationOpenedAt": "2026-06-05T09:00:00.000Z",
    "registrationClosedAt": "2026-06-05T10:00:00.000Z"
  },
  "autoRejectedCount": 2
}
```

### 2.3 Phân Công Trọng Tài

```
POST /api/admin/races/:id/referees
Role: ADMIN
```

**Request Body:**
```json
{
  "refereeAId": 5,
  "refereeBId": 6
}
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | `refereeAId !== refereeBId` | 400 "Hai trọng tài phải là hai người khác nhau" |
| 2 | Cả 2 referee tồn tại | 404 |
| 3 | Cả 2 có role `RACE_REFEREE` | 400 |

**Response 200:**
```json
{
  "raceId": 1,
  "refereeA": { "fullName": "Trọng tài A", "email": "refa@test.com" },
  "refereeB": { "fullName": "Trọng tài B", "email": "refb@test.com" }
}
```

---

## 3. Luồng Horse & Entry

### 3.1 Chủ Ngựa Tạo Horse (Chờ Admin Duyệt)

```
POST /api/horses
Role: HORSE_OWNER
```

**Request Body:**
```json
{
  "name": "Thunder",
  "breed": "Arabian",
  "dateOfBirth": "2020-01-01",
  "sex": "M",
  "color": "Brown"
}
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | `name` required, non-empty | 400 |
| 2 | `dateOfBirth` valid date string | 400 |

**Response 201:**
```json
{
  "message": "Horse submitted for approval",
  "horse": {
    "horseId": 1,
    "name": "Thunder",
    "status": "PENDING"
  }
}
```

### 3.2 Admin Duyệt Horse

```
PATCH /api/admin/horses/:id/status
Role: ADMIN
```

**Request Body:**
```json
{ "status": "APPROVED" }
{ "status": "REJECTED", "reason": "Invalid documents" }
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | status must be `APPROVED` or `REJECTED` | 400 |
| 2 | If `REJECTED`, `reason` is required | 400 |

**Response 200:**
```json
{
  "message": "Horse review updated successfully",
  "horse": {
    "horseId": 1,
    "status": "APPROVED"
  }
}
```

### 3.3 Chủ Ngựa Đăng Ký Entry

```
POST /api/entries
Role: HORSE_OWNER
```

**Request Body:**
```json
{
  "raceId": 1,
  "horseId": 10,
  "jockeyId": 21
}
```

**Validation:**
| # | Rule | Error | Layer |
|---|------|-------|-------|
| 1 | Race tồn tại | 404 | Service |
| 2 | `race.registrationOpen === true` | 409 "registration gate closed" | Service |
| 3 | Horse tồn tại | 404 | Service |
| 4 | Horse thuộc về owner hiện tại | 403 | Service |
| 5 | Horse `status === 'APPROVED'` | 409 "horse not approved" | Service |
| 6 | Jockey tồn tại, role `JOCKEY`, active, profile-complete | 404/409 | Service |
| 7 | Unique: horse đã đăng ký race này chưa | 409 | Service |

**Response 201:**
```json
{
  "message": "Race entry created successfully",
  "entry": {
    "entryId": 1,
    "raceId": 1,
    "horseId": 10,
    "jockeyId": 21,
    "status": "PENDING"
  }
}
```

### 3.4 Admin Duyệt Entry

```
PUT /api/entries/:id/status
Role: ADMIN
```

**Request Body:**
```json
{ "status": "APPROVED" }
{ "status": "REJECTED", "reason": "Over capacity" }
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | status must be `APPROVED` or `REJECTED` | 400 |
| 2 | If `REJECTED`, `reason` is required | 400 |

**Response 200:**
```json
{
  "message": "Race entry status updated successfully",
  "entry": {
    "entryId": 1,
    "status": "APPROVED"
  }
}
```

### 3.5 Bulk Review Entries

```
POST /api/admin/races/:id/entries/bulk-review
Role: ADMIN
```

**Request Body:**
```json
{
  "reviews": [
    { "entryId": 1, "status": "APPROVED" },
    { "entryId": 2, "status": "REJECTED", "reason": "Over capacity" },
    { "entryId": 3, "status": "APPROVED" }
  ]
}
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Entry phải thuộc race này | - |
| 2 | Entry phải ở status `PENDING` | - |
| 3 | Nếu APPROVED mà race đầy → skip với warning | - |

**Response 200:**
```json
{
  "results": [
    { "entryId": 1, "status": "APPROVED" },
    { "entryId": 2, "status": "REJECTED" },
    { "entryId": 3, "status": "APPROVED" }
  ],
  "updated": 3
}
```

---

## 4. Luồng Jockey Invitation

### 4.1 Tìm Kiếm Kỵ Sĩ

```
GET /api/invitations/jockeys?name=Nguyen
Role: AUTHENTICATED
```

**Query Params:**
- `name` (optional): Tìm theo tên

**Validation:**
- Chỉ trả về jockey có: `isActive === true` AND `isProfileComplete === true`

**Response 200:**
```json
{
  "jockeys": [
    {
      "userId": 21,
      "fullName": "Nguyễn Văn A",
      "email": "jockey@test.com",
      "licenseNumber": "LIC-001",
      "weight": 52.5,
      "careerStats": {
        "totalStarts": 10,
        "wins": 3,
        "winRate": 30.0
      }
    }
  ]
}
```

### 4.2 Gửi Lời Mời Kỵ Sĩ

```
POST /api/invitations
Role: HORSE_OWNER
```

**Request Body:**
```json
{
  "raceId": 1,
  "horseId": 10,
  "jockeyId": 21
}
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Race tồn tại | 404 |
| 2 | `race.registrationOpen === true` | 409 "registration gate is closed" |
| 3 | Lời mời chưa tồn tại (unique constraint) | 409 |

**Side Effect:**
- Gửi socket event `invitation:received` tới jockey

**Response 201:**
```json
{
  "invitation": {
    "invitationId": 1,
    "raceId": 1,
    "horseId": 10,
    "jockeyId": 21,
    "status": "PENDING"
  }
}
```

### 4.3 Xem Lời Mời

```
GET /api/invitations
Role: AUTHENTICATED
```

**Behavior:**
- Nếu role = `JOCKEY`: Trả về inbox (lời mời nhận được)
- Nếu role = `HORSE_OWNER`: Trả về outbox (lời mời đã gửi)

**Query Params:**
- `status` (optional): `PENDING | ACCEPTED | DECLINED | CANCELLED | EXPIRED`

### 4.4 Kỵ Sĩ Phản Hồi Lời Mời

```
PUT /api/invitations/:id/respond
Role: JOCKEY
```

**Request Body:**
```json
{ "status": "ACCEPTED" }
{ "status": "DECLINED", "declineReason": "Bận việc" }
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Invitation tồn tại | 404 |
| 2 | Jockey là người nhận lời mời | 403 |
| 3 | Invitation status === `PENDING` | 409 |

**Side Effect:**
- Gửi socket event `invitation:accepted` hoặc `invitation:declined` tới owner

### 4.5 Confirm Jockey (Tạo Entry)

```
POST /api/invitations/:id/confirm
Role: HORSE_OWNER
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Invitation tồn tại | 404 |
| 2 | Owner là người gửi lời mời | 403 |
| 3 | Invitation status === `ACCEPTED` | 409 |
| 4 | `race.registrationOpen === true` | 409 "registration gate closed" |
| 5 | Race chưa đầy (approved < maxEntries) | 409 |
| 6 | Jockey chưa confirm cho ngựa khác trong race này | 409 |

**Side Effect (Transaction):**
1. Tạo `RaceEntry` với `horseId` + `jockeyId`
2. Cancel tất cả lời mời KHÁC của cùng ngựa trong race đó
3. Gửi socket event `invitation:confirmed`

**Response 200:**
```json
{
  "entry": {
    "entryId": 1,
    "raceId": 1,
    "horseId": 10,
    "jockeyId": 21,
    "status": "PENDING"
  }
}
```

---

## 5. Luồng Betting (Spectator)

### 5.1 Xem Race Để Đặt Cược

```
GET /api/races/:id/detail
Auth: None (public)
```

**Response 200:**
```json
{
  "raceId": 1,
  "name": "Chung kết Cup mùa hè",
  "status": "SCHEDULED",
  "registrationOpen": false,
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
        "careerStats": { "totalStarts": 10, "wins": 3, "winRate": 30.0 }
      },
      "jockey": {
        "userId": 4,
        "fullName": "Nguyễn Văn A",
        "careerStats": { "totalStarts": 25, "wins": 8, "winRate": 32.0 }
      },
      "pairCareerStats": { "totalStarts": 5, "wins": 2, "winRate": 40.0 },
      "oddsFinal": 3.5
    }
  ]
}
```

### 5.2 Đặt Cược

```
POST /api/predictions
Role: SPECTATOR
```

**Request Body:**
```json
{
  "raceId": 1,
  "betType": "WIN",
  "entryIds": [5],
  "betAmount": 50
}
```

**BetTypes:**
| betType | entryIds | Điều kiện thắng |
|---------|----------|------------------|
| `WIN` | `[entryId]` | Entry về nhất |
| `PLACE` | `[entryId]` | Entry về nhất hoặc nhì |
| `SHOW` | `[entryId]` | Entry lọt Top 3 |
| `QUINELLA` | `[e1, e2]` | 2 entry chiếm hạng 1 và 2 (bất kỳ thứ tự) |
| `EXACTA` | `[e1, e2]` | e1 = hạng nhất, e2 = hạng nhì (đúng thứ tự) |

**Validation đầy đủ:**
| # | Rule | Error |
|---|------|-------|
| 1 | `raceId` là integer dương | 400 |
| 2 | `betType` in `[WIN, PLACE, SHOW, QUINELLA, EXACTA]` | 400 |
| 3 | `entryIds` là array | 400 |
| 4 | WIN/PLACE/SHOW: đúng 1 entry | 400 |
| 5 | QUINELLA/EXACTA: đúng 2 entries, khác nhau | 400 |
| 6 | `betAmount` integer dương | 400 |
| 7 | `betAmount >= 10` | 400 |
| 8 | Race tồn tại | 404 |
| 9 | **Race status === `SCHEDULED`** | 409 |
| 10 | Spectator tồn tại, `isActive === true` | 404/403 |
| 11 | Tất cả entries thuộc race này | 400 |
| 12 | **Tất cả entries `status === 'APPROVED'`** | 409 |
| 13 | Wallet tồn tại, `isFrozen === 0` | 404/403 |
| 14 | `betAmount <= 50% balance` | 400 |
| 15 | **Odds đã được tính cho tất cả entries** | 409 |

**LockedOdds Calculation:**
| betType | Formula |
|---------|---------|
| WIN / PLACE / SHOW | `oddsFinal` của entry |
| QUINELLA / EXACTA | `(oddsFinal[e1] + oddsFinal[e2]) / 2` |

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
    "betAmount": 50,
    "lockedOdds": 3.5,
    "status": "PENDING",
    "createdAt": "2026-06-29T10:30:00.000Z"
  }
}
```

### 5.3 Xem Lịch Sử Vé Cược

```
GET /api/predictions
Role: SPECTATOR
```

**Response 200:**
```json
{
  "predictions": [
    {
      "predictionId": 1,
      "raceId": 1,
      "race": { "raceId": 1, "name": "Chung kết", "status": "FINISHED" },
      "betType": "WIN",
      "betAmount": 50,
      "lockedOdds": 3.5,
      "status": "WON",
      "payout": 175,
      "createdAt": "2026-06-29T10:30:00.000Z"
    }
  ]
}
```

### 5.4 Hủy Vé Cược

```
PUT /api/predictions/:id/cancel
Role: SPECTATOR
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Prediction tồn tại | 404 |
| 2 | Prediction thuộc user hiện tại | 403 |
| 3 | **Prediction status === `PENDING`** | 409 |
| 4 | **Race status === `SCHEDULED`** | 409 |

**Side Effect:**
- Hoàn trả 100% `betAmount` vào wallet
- Tạo `WalletTransaction.type: 'BET_REFUND'`

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

---

## 6. Luồng Referee

### 6.1 Xem Race Được Phân Công

```
GET /api/referee/me/races
Role: RACE_REFEREE
```

**Query Params:**
- `status` (optional): Filter theo race status
- `date` (optional): Filter theo ngày

**Response 200:**
```json
{
  "races": [
    {
      "raceId": 1,
      "name": "Race 1",
      "tournamentName": "Summer Cup 2026",
      "status": "SCHEDULED",
      "scheduledStartTime": "2026-07-01T10:00:00.000Z",
      "assignedRole": "Referee A",
      "legs": [
        {
          "legId": 1,
          "status": "AwaitingSubmission",
          "mySubmissionStatus": "NotSubmitted",
          "horses": [
            { "horseId": 1, "horseName": "Thunder", "jockeyName": "Jockey A" }
          ]
        }
      ]
    }
  ]
}
```

### 6.2 Start Race

```
POST /api/referee/races/:id/start
Role: RACE_REFEREE
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Race tồn tại | 404 |
| 2 | **Race status === `SCHEDULED`** | 409 "Trận đấu chỉ có thể bắt đầu khi ở trạng thái SCHEDULED" |
| 3 | Có đủ 2 trọng tài (`refereeAId && refereeBId`) | 409 "Chưa được cấu hình phân công đủ 2 trọng tài" |
| 4 | User là `refereeAId` hoặc `refereeBId` | 403 "Bạn không có quyền kích hoạt trận đấu này" |

**Side Effect:**
- Race status → `IN_PROGRESS`

**Response 200:**
```json
{
  "raceId": 1,
  "status": "IN_PROGRESS",
  "startedAt": "2026-07-01T10:05:00.000Z"
}
```

### 6.3 Nộp Kết Quả Blind

```
POST /api/referee/races/:id/submit
Role: RACE_REFEREE
```

**Request Body:**
```json
{
  "rawResults": [
    { "entryId": 1, "rank": 1 },
    { "entryId": 3, "rank": 2 },
    { "entryId": 5, "rank": 3 }
  ]
}
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Race tồn tại | 404 |
| 2 | **Race status === `IN_PROGRESS`** | 409 "Cổng nhập kết quả chỉ mở khi trận đấu đang ở trạng thái IN_PROGRESS" |
| 3 | User là trọng tài được phân công | 403 |
| 4 | **Chưa từng submit cho race này (append-only)** | 409 "Bạn đã nộp kết quả trước đó" |

**Auto-Match Logic (khi cả 2 đã nộp):**
```javascript
// Sort by entryId để so sánh chính xác
sortedA = [...submissionA.rawResults].sort((a, b) => a.entryId - b.entryId);
sortedB = [...submissionB.rawResults].sort((a, b) => a.entryId - b.entryId);

if (JSON.stringify(sortedA) === JSON.stringify(sortedB)) {
  // KHỚP 100% → AUTO_MATCHED
  race.status = 'PENDING_RESULT';
} else {
  // LỆCH → CONFLICTED
  race.status = 'PAUSED';
}
```

**Response 200 (chỉ 1 người nộp):**
```json
{
  "status": "PENDING_PARTNER",
  "message": "Nộp kết quả thành công. Đang chờ trọng tài thứ hai hoàn thành Blind Submission."
}
```

**Response 200 (cả 2 nộp, khớp):**
```json
{
  "status": "AUTO_MATCHED",
  "message": "Kết quả trùng khớp 100%! Trận đấu chuyển sang PENDING_RESULT chờ Admin duyệt."
}
```

**Response 200 (cả 2 nộp, lệch):**
```json
{
  "status": "CONFLICTED",
  "message": "Phát hiện sai lệch dữ liệu! Trận đấu đã chuyển sang trạng thái PAUSED để Admin can thiệp."
}
```

### 6.4 Xem Chi Tiết Race

```
GET /api/referee/me/races/:raceId
Role: RACE_REFEREE
```

### 6.5 Xem Lịch Sử Nộp Kết Quả

```
GET /api/referee/me/submissions
Role: RACE_REFEREE
```

### 6.6 Xem Danh Sách Conflict

```
GET /api/referee/me/conflicts
Role: RACE_REFEREE
```

Trả về danh sách race có `matchStatus === 'CONFLICTED'`

### 6.7 Xem Profile Trọng Tài

```
GET /api/referee/me/profile
Role: RACE_REFEREE
```

---

## 7. Luồng Settlement (Admin)

### 7.1 Publish Kết Quả

```
POST /api/admin/races/:raceId/publish
Role: ADMIN
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Race tồn tại | 404 |
| 2 | **Race status === `PENDING_RESULT`** | 400 |
| 3 | Có `officialRaceResult` với `finalResults` | 400 |

**Settlement Engine Flow:**
```
1. Tính tổng pool cược (sum betAmount của tất cả predictions)
2. Quét mỗi prediction, so sánh với finalResults:
   - WIN: entryId1 === rank1 → WON
   - PLACE: entryId1 === rank1 || rank2 → PARTIAL_WON
   - SHOW: entryId1 === rank1 || rank2 || rank3 → PARTIAL_WON
   - QUINELLA: {entry1, entry2} === {rank1, rank2} → WON
   - EXACTA: entryId1===rank1 && entryId2===rank2 → WON
   - Others → LOST
3. Tính payout:
   - WIN: betAmount * lockedOdds
   - PLACE: betAmount * lockedOdds * 0.7
   - SHOW: betAmount * lockedOdds * 0.5
   - QUINELLA: betAmount * lockedOdds * 1.5
   - EXACTA: betAmount * lockedOdds * 2.0
4. Trừ 10% house margin → HOUSE_REVENUE
5. Cộng payout vào wallet spectator thắng
6. Cân đối treasure pool
7. Race status → FINISHED
```

**Response 200:**
```json
{
  "success": true,
  "message": "Công bố kết quả trận đấu và quyết toán tiền thưởng thành công trọn vẹn.",
  "data": {
    "raceId": 1,
    "status": "FINISHED",
    "totalPool": 5000,
    "houseMargin": 500,
    "actualTotalPayout": 3500,
    "treasureBalanceChange": 1000,
    "walletIncrements": {
      "3": 175,
      "7": 3325
    },
    "publishedAt": "2026-07-01T12:00:00.000Z"
  }
}
```

**Socket Events:**
- `WALLET_UPDATED` → từng spectator thắng
- `RACE_FINISHED` → toàn sàn

### 7.2 Unpublish Kết Quả (Rollback)

```
POST /api/admin/races/:raceId/unpublish
Role: ADMIN
```

**Validation:**
| # | Rule | Error |
|---|------|-------|
| 1 | Race tồn tại | 404 |
| 2 | **Race status === `FINISHED`** | 400 |

**Rollback Engine Flow:**
```
1. Thu hồi payout từ wallet spectator (type: 'BET_WIN_REVERSAL')
2. Hoàn tác house margin (type: 'ADMIN_ADJUSTMENT')
3. Hoàn tác treasure pool
4. Đưa prediction.status về PENDING
5. Xóa RaceResult records
6. Race status → PENDING_RESULT
```

**Response 200:**
```json
{
  "success": true,
  "message": "Thu hồi kết quả trận đấu thành công.",
  "data": {
    "raceId": 1,
    "status": "PENDING_RESULT",
    "recalledTotalPayout": 3500,
    "affectedWinnersCount": 2
  }
}
```

**Socket Events:**
- `WALLET_UPDATED` → từng spectator bị thu hồi
- `RACE_UNPUBLISHED` → toàn sàn

---

## 8. Bảng Tổng Hợp Status Transitions

### 8.1 RaceStatus

```
DRAFT (Tournament)
   ↓
OPEN (Tournament)
   ↓
┌─────────────────────────────────────────────────────────────┐
│                      SCHEDULED                              │
│  • Admin đóng cổng ĐK (registrationOpen = false)          │
│  • Admin phân công 2 trọng tài                             │
│  • ⚠️ KHÁN GIẢ ĐẶT CƯỢC ĐƯỢC                             │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
        Referee A/B                    Admin unlock
        startRace()                   (sau conflict)
              │                             │
              ▼                             │
    ┌─────────────────────┐                │
    │    IN_PROGRESS      │                │
    │  • Cổng cược ĐÓNG   │                │
    │  • Không đặt/hủy     │                │
    └──────────┬──────────┘                │
               │                           │
               │ Cả 2 referee nộp blind    │
               ▼                           │
    ┌──────────────────────────────────┐  │
    │       AUTO-MATCH ENGINE           │  │
    └──────────────────┬───────────────┘  │
                       │                  │
         ┌─────────────┴─────────────┐      │
         │                           │      │
    ┌────┴────┐              ┌─────┴────┐  │
    │ MATCHED │              │CONFLICTED│  │
    └────┬────┘              └────┬─────┘  │
         │                        │         │
         ▼                        │         │
  ┌─────────────┐                 │         │
  │PENDING_     │                 │         │
  │RESULT       │                 │         │
  └──────┬──────┘                 │         │
         │                        │         │
         │                        ▼         │
         │               ┌─────────────┐    │
         │               │   PAUSED    │    │
         │               └──────┬──────┘    │
         │                      │           │
         │         Admin resolve│           │
         │         hoặc unlock  │           │
         │                      │           │
         │◄─────────────────────┘           │
         │                                    │
         ▼                                    │
  ┌─────────────┐                             │
  │  FINISHED   │◄────────────────────────────┘
  │ (settled)   │     Admin unpublish
  └─────────────┘
```

### 8.2 PredictionStatus

```
PENDING ──(hủy thủ công)──→ REFUNDED
   │
   │ Admin publish (settlement)
   ▼
WON | PARTIAL_WON | LOST
```

### 8.3 RaceEntryStatus

```
PENDING ──(admin duyệt)──→ APPROVED
   │
   │ (hoặc reject)
   ▼
REJECTED
```

### 8.4 InvitationStatus

```
PENDING ──(jockey accept)──→ ACCEPTED ──(owner confirm)──→ Tạo Entry
   │
   │ (jockey decline)
   ▼
DECLINED

PENDING/ACCEPTED ──(owner confirm khác)──→ CANCELLED
```

---

## 9. Socket Events Tổng Hợp

| Event | Direction | Payload | Trigger |
|-------|-----------|---------|---------|
| `race:updated` | Server → Client | `{ raceId, status, registrationOpen }` | Race thay đổi |
| `race:started` | Server → Client | `{ raceId }` | Race → IN_PROGRESS |
| `race:finished` | Server → Client | `{ raceId, finalResults }` | Settlement xong |
| `invitation:received` | Server → Jockey | `{ invitation }` | Owner gửi lời mời |
| `invitation:accepted` | Server → Owner | `{ invitation }` | Jockey accept |
| `invitation:declined` | Server → Owner | `{ invitation }` | Jockey decline |
| `invitation:confirmed` | Server → Jockey | `{ invitationId, entry }` | Owner confirm |
| `entry:status_changed` | Server → Client | `{ entryId, raceId, oldStatus, newStatus }` | Entry duyệt/từ chối |
| `entry:created` | Server → Admin | `{ entry }` | Entry mới tạo |
| `WALLET_UPDATED` | Server → User | `{ type, message, addedAmount }` | Wallet thay đổi |
| `violation:created` | Server → Admin | `{ violation }` | Trọng tài báo vi phạm |

---

## 10. Quick Reference Checklist

### Đặt Cược
```javascript
// Frontend check trước khi show nút "Đặt cược"
canBet = race.status === 'SCHEDULED' 
      && race.registrationOpen === false 
      && entry.status === 'APPROVED' 
      && entry.oddsFinal !== null;
```

### Hủy Cược
```javascript
canCancel = prediction.status === 'PENDING' 
         && prediction.race.status === 'SCHEDULED';
```

### Start Race (Referee)
```javascript
canStart = race.status === 'SCHEDULED'
        && race.refereeAId !== null
        && race.refereeBId !== null
        && (user.userId === race.refereeAId 
         || user.userId === race.refereeBId);
```

### Submit Result (Referee)
```javascript
canSubmit = race.status === 'IN_PROGRESS'
         && !hasAlreadySubmitted;
```

### Publish Result (Admin)
```javascript
canPublish = race.status === 'PENDING_RESULT'
          && race.officialRaceResult !== null;
```

### Unpublish Result (Admin)
```javascript
canUnpublish = race.status === 'FINISHED';
```
