# Luồng Hệ Thống Tổng Quan — Horse Racing Platform

> Document này mô tả toàn bộ luồng hoạt động của hệ thống từ lúc tạo Tournament đến khi settlement xong. Dành cho Mobile/FE developers implement theo đúng thứ tự.

---

## Mục lục

1. [Tổng quan các Role](#1-tổng-quan-các-role)
2. [Bảng trạng thái Race](#2-bảng-trạng-thái-race)
3. [Bảng trạng thái Entry](#3-bảng-trạng-thái-entry)
4. [Bảng trạng thái Prediction](#4-bảng-trạng-thái-prediction)
5. [Luồng chi tiết từng giai đoạn](#5-luồng-chi-tiết-từng-giai-đoạn)
6. [Sơ đồ trạng thái Race](#6-sơ-đồ-trạng-thái-race)
7. [Socket Events](#7-socket-events)

---

## 1. Tổng quan các Role

| Role | Mã code | Quyền hạn chính |
|------|---------|-----------------|
| Quản trị viên | `ADMIN` | Tạo tournament, tạo race, phân công trọng tài, duyệt entries, publish kết quả |
| Trọng tài | `RACE_REFEREE` | Start race, nộp kết quả blind |
| Chủ ngựa | `HORSE_OWNER` | Đăng ký ngựa vào race, mời kỵ sĩ |
| Kỵ sĩ | `JOCKEY` | Nhận/từ chối lời mời |
| Khán giả | `SPECTATOR` | Đặt cược, xem lịch sử |

---

## 2. Bảng trạng thái Race

### `RaceStatus` enum

```typescript
enum RaceStatus {
  SCHEDULED      // Chờ bắt đầu
  IN_PROGRESS    // Đang diễn ra
  PENDING_RESULT // Chờ công bố kết quả
  PAUSED         // Tạm dừng (kết quả trọng tài lệch)
  FINISHED       // Đã kết thúc
  CANCELLED      // Đã hủy
}
```

### Quy tắc đặt cược

| Race Status | Đặt cược được? | Hủy cược được? |
|-------------|----------------|----------------|
| `SCHEDULED` | ✅ Được | ✅ Được |
| `IN_PROGRESS` | ❌ Không | ❌ Không |
| `PENDING_RESULT` | ❌ Không | ❌ Không |
| `PAUSED` | ❌ Không | ❌ Không |
| `FINISHED` | ❌ Không | ❌ Không |
| `CANCELLED` | ❌ Không | ❌ Không |

> **QUAN TRỌNG:** Đặt cược chỉ khi `race.status === 'SCHEDULED'` và `race.registrationOpen === false`

### Hành động theo từng Status

| Status | Ai làm gì | API endpoint |
|--------|------------|--------------|
| `SCHEDULED` | Admin: phân công trọng tài, đóng cổng đăng ký | `POST /api/admin/races/:id/assign-referees` |
| `SCHEDULED` | Referee (A hoặc B): startRace | `POST /api/referee/races/:id/start` |
| `IN_PROGRESS` | Referee (A hoặc B): nộp kết quả blind | `POST /api/referee/races/:id/submit` |
| `PENDING_RESULT` | Admin: publish kết quả (kích hoạt settlement) | `POST /api/admin/settlement/:raceId/publish` |
| `PENDING_RESULT` | Admin: resolve conflict (nếu CONFLICTED) | `POST /api/admin/races/:id/resolve-conflict` |
| `PAUSED` | Admin: unlock để trọng tài nộp lại | `POST /api/admin/races/:id/unlock` |
| `FINISHED` | Admin: unpublish (hoàn tác) | `POST /api/admin/settlement/:raceId/unpublish` |

---

## 3. Bảng trạng thái Entry

### `RaceEntryStatus` enum

```typescript
enum RaceEntryStatus {
  PENDING     // Chờ duyệt
  APPROVED    // Đã duyệt
  REJECTED    // Từ chối
  DQ          // Disqualified (không xếp hạng)
}
```

### Hành động theo từng Status

| Status | Ai làm gì | API endpoint |
|--------|------------|--------------|
| `PENDING` | Admin: duyệt hoặc từ chối | `PUT /api/entries/:id/status` |
| `PENDING` | Admin: bulk review | `POST /api/admin/races/:id/entries/bulk-review` |
| `APPROVED` | Chủ ngựa: confirm jockey | `PATCH /api/owner/entries/:id/confirm-jockey` |

### Điều kiện để Entry được đặt cược

Entry phải thỏa mãn **TẤT CẢ** điều kiện:
- ✅ `entry.status === 'APPROVED'`
- ✅ `entry.jockey !== null` (đã có kỵ sĩ)
- ✅ `race.status === 'SCHEDULED'`
- ✅ `race.registrationOpen === false`

---

## 4. Bảng trạng thái Prediction

### `PredictionStatus` enum

```typescript
enum PredictionStatus {
  PENDING      // Chờ kết quả
  WON          // Thắng toàn phần
  PARTIAL_WON  // Thắng một phần
  LOST         // Thua
  REFUNDED     // Đã hủy, hoàn tiền
}
```

### Luồng trạng thái Prediction

```
┌──────────┐     hủy thủ công      ┌───────────┐
│ PENDING  │ ──────────────────────►│ REFUNDED  │
└────┬─────┘                        └───────────┘
     │
     │ Admin publish (settlement)
     │
     ▼
┌─────────┐   hoặc   ┌──────────────┐   hoặc   ┌───────┐
│   WON   │◄─────────│ PARTIAL_WON  │◄─────────│ LOST  │
└─────────┘          └──────────────┘          └───────┘
```

---

## 5. Luồng chi tiết từng giai đoạn

### GIAI ĐOẠN 1: Chuẩn bị Tournament (ADMIN)

```
ADMIN                        HỆ THỐNG
  │
  ├── Xem danh sách tournaments
  │     GET /api/admin/tournaments
  │
  ├── Tạo Tournament (DRAFT)
  │     POST /api/admin/tournaments
  │     → { status: 'DRAFT' }
  │
  ├── Đổi status → OPEN
  │     PATCH /api/admin/tournaments/:id/status
  │     → { status: 'OPEN' }
  │
  └── Tạo Race
        POST /api/admin/races (internal)
        → { status: 'SCHEDULED', registrationOpen: false }
```

### GIAI ĐOẠN 2: Mở đăng ký & Chủ ngựa đăng ký

```
ADMIN                        CHỦ NGỰA                    HỆ THỐNG
  │
  ├── Mở cổng đăng ký
  │     PUT /api/admin/races/:id/registration-gate
  │     → { registrationOpen: true }
  │
  │                         ├── Xem race mở đăng ký
  │                         │     GET /api/races?registrationOpen=true
  │                         │
  │                         ├── Xem ngựa của mình (đã APPROVED)
  │                         │     GET /api/horses/mine
  │                         │
  │                         └── Đăng ký ngựa vào race
  │                               POST /api/entries
  │                               → { entry.status: 'PENDING' }
  │
  └── Duyệt ngựa (APPROVED/REJECTED)
        PATCH /api/admin/horses/:id/status
        → { horse.status: 'APPROVED' }
```

### GIAI ĐOẠN 3: Duyệt Entry & Mời Kỵ sĩ

```
ADMIN                        CHỦ NGỰA                    KỴ SĨ
  │
  ├── Duyệt Entry
  │     PUT /api/entries/:id/status
  │     → { entry.status: 'APPROVED' }
  │
  │                         ├── Mời kỵ sĩ
  │                         │     POST /api/invitations
  │                         │     → { status: 'PENDING' }
  │                         │
  │                         │                    ├── Xem lời mời
  │                         │                    │     GET /api/invitations/received
  │                         │                    │
  │                         │                    ├── ACCEPT
  │                         │                    │     PATCH /api/invitations/:id/respond
  │                         │                    │     → { status: 'ACCEPTED' }
  │                         │                    │
  │                         │                    └── DECLINE (tùy chọn)
  │                         │                          → { status: 'DECLINED' }
  │                         │
  │                         └── Confirm jockey
  │                               PATCH /api/owner/entries/:id/confirm-jockey
  │                               → Entry có jockeyId
```

### GIAI ĐOẠN 4: Đóng cổng đăng ký & Phân công trọng tài

```
ADMIN
  │
  ├── Xem danh sách races
  │     GET /api/admin/races
  │     Query params: ?status=SCHEDULED,PAUSED,...
  │
  ├── Đóng cổng đăng ký
  │     PUT /api/admin/races/:id/registration-gate
  │     → { registrationOpen: false }
  │
  ├── Phân công 2 trọng tài
  │     POST /api/admin/races/:id/assign-referees
  │     → { refereeAId: X, refereeBId: Y }
  │
  ├── (Tùy chọn) Xem gợi ý AI odds
  │     GET /api/admin/races/:id/ai-odds
  │     → { suggestions: [{ entryId, winProbability, fairOdds, suggestedOdds }] }
  │
  └── (Tùy chọn) Xem đánh giá rủi ro
        GET /api/admin/races/:id/risk-score?treasury=10000
        → { riskScore, riskLevel, totalPool, worstCaseLiability }
```

### GIAI ĐOẠN 5: Khán giả đặt cược ⚠️ QUAN TRỌNG

```
KHÁN GIẢ (SPECTATOR)                                    HỆ THỐNG
  │                                                          │
  ├── Nạp tiền vào ví (nếu cần)                            │
  │     POST /api/wallet/deposit                            │
  │                                                          │
  ├── Xem race để đặt cược                                  │
  │     GET /api/races/:id/detail                           │
  │                                                          │
  │     ⚠️ KIỂM TRA:                                        │
  │     - race.status === 'SCHEDULED' ← BẮT BUỘC           │
  │     - race.registrationOpen === false ← BẮT BUỘC       │
  │     - Entry cần đặt có oddsFinal                        │
  │                                                          │
  ├── Xem odds                                              │
  │     GET /api/odds?raceId=x                              │
  │                                                          │
  └── Đặt cược                                              │
        POST /api/predictions                                │
        Body: {                                              │
          raceId: 1,                                         │
          betType: 'WIN',         // WIN|PLACE|SHOW|QUINELLA|EXACTA │
          entryIds: [5],          // entryId(s)              │
          betAmount: 100                                        │
        }                                                     │
        → { prediction.status: 'PENDING', lockedOdds: X }    │
                                                              │
        ĐIỀU KIỆN ĐẶT CƯỢC:                                  │
        ✅ race.status === 'SCHEDULED'                        │
        ✅ race.registrationOpen === false                    │
        ✅ Entry đã APPROVED                                   │
        ✅ Entry có oddsFinal                                 │
        ✅ Wallet balance đủ (>= betAmount)                   │
        ✅ betAmount >= 10 điểm                              │
        ✅ betAmount <= 50% balance                           │
                                                              │
  ├── Xem lịch sử vé cược                                    │
  │     GET /api/predictions                                 │
  │                                                          │
  └── Hủy vé (nếu chưa start)                              │
        PUT /api/predictions/:id/cancel                      │
        ⚠️ Chỉ khi prediction.status === 'PENDING'           │
        ⚠️ Và race.status === 'SCHEDULED'                    │
```

### GIAI ĐOẠN 6: Trọng tài bắt đầu Race
1. SCHEDULED → IN_PROGRESS — Referee bấm Start
2. IN_PROGRESS → FINISHED — Auto (khi 2 TT submit khớp)
3. IN_PROGRESS → PAUSED — Auto (khi 2 TT submit lệch)
4. SCHEDULED/IN_PROGRESS → CANCELLED — Cancel Tournament (cascade)
5. PAUSED → FINISHED — Admin Resolve Conflict
6. FINISHED → PENDING_RESULT — Admin Rollback (Unpublish)
```
TRỌNG TÀI (A hoặc B)                                    HỆ THỐNG
  │                                                          │
  ├── Xem race được phân công                               │
  │     GET /api/referee/races                              │
  │                                                          │
  │     Chỉ thấy races có:                                  │
  │     - refereeAId === currentUser hoặc                   │
  │     - refereeBId === currentUser                        │
  │                                                          │
  └── Gọi startRace                                        │
        POST /api/referee/races/:id/start                   │
        → { race.status: 'IN_PROGRESS' }                   │
                                                              │
        ĐIỀU KIỆN:                                           │
        ✅ race.status === 'SCHEDULED' ← BẮT BUỘC           │
        ✅ Có đủ 2 trọng tài được gán                        │
        ✅ Người gọi là refereeAId hoặc refereeBId          │
                                                              │
        ⚠️ SAU BƯỚC NÀY: CỔNG CƯỢC ĐÓNG HOÀN TOÀN         │
           - Khán giả không thể đặt cược mới                 │
           - Khán giả không thể hủy vé                       │
```

### GIAI ĐOẠN 7: Trọng tài nộp kết quả Blind

```
TRỌNG TÀI A                       TRỌNG TÀI B               HỆ THỐNG
  │                                   │                         │
  ├── Nộp kết quả blind               │                         │
  │     POST /api/referee/races/:id/submit                     │
  │     Body: {                                                │
  │       rawResults: [                                        │
  │         { entryId: 1, rank: 1 },                           │
  │         { entryId: 3, rank: 2 },                           │
  │         { entryId: 5, rank: 3 }                           │
  │       ]                                                    │
  │     }                                                      │
  │     → { status: 'PENDING_PARTNER' }                       │
  │     ⚠️ Chỉ nộp ĐƯỢC 1 LẦN (append-only)                 │
  │                                   │                         │
  │                                   ├── Nộp kết quả blind    │
  │                                   │     (tương tự)         │
  │                                   │                         │
  │                                   │          ┌────────────┴──────┐
  │                                   │          │ AUTO-MATCH ENGINE │
  │                                   │          └────────────┬──────┘
  │                                   │                   │        │
  │                                   │         ┌────────┴────────┐│
  │                                   │         │ JSON khớp 100%?  ││
  │                                   │         └────────┬────────┘│
  │                                   │                  │         │
  │                                   │        ┌─────────┴─────────┐│
  │                                   │        │                   ││
  │                                   │      CÓ                 KHÔNG│
  │                                   │        │                   ││
  │                                   │        ▼                   ▼
  │                                   │  ┌───────────┐      ┌───────────┐
  │                                   │  │AUTO_MATCHED│      │ CONFLICTED │
  │                                   │  └─────┬─────┘      └─────┬─────┘
  │                                   │        │                   │
  │                                   │        ▼                   ▼
  │                                   │  ┌───────────┐      ┌───────────┐
  │                                   │  │PENDING_   │      │  PAUSED   │
  │                                   │  │RESULT     │      │ (Chờ admin)│
  │                                   │  └───────────┘      └───────────┘
  │                                   │                              │
  │                                   │         ADMIN xử lý ─────────┘
```

### GIAI ĐOẠN 8: Admin xử lý Conflict (nếu có)

```
ADMIN                              HỆ THỐNG
  │
  ├── Xem danh sách races
  │     GET /api/admin/races?status=PAUSED
  │
  ├── Xem chi tiết race (bao gồm conflict)
  │     GET /api/admin/races/:id
  │     → Thấy cả 2 submission của trọng tài
  │
  ├── Xem chi tiết conflict
  │     GET /api/admin/races/:id/review-conflict
  │     → { submissions: [A: [...], B: [...] ], differences: [...] }
  │
  ├── Tùy chọn 1: Resolve thủ công
  │     POST /api/admin/races/:id/resolve-conflict
  │     Body: {
  │       finalResults: [...],
  │       resolveReason: 'Admin xác nhận...'
  │     }
  │     → { matchStatus: 'RESOLVED', race.status: 'PENDING_RESULT' }
  │
  └── Tùy chọn 2: Unlock để nộp lại
        POST /api/admin/races/:id/unlock
        → { race.status: 'SCHEDULED' }
        ⚠️ SAU KHI UNLOCK: Cổng cược MỞ LẠI!
           Khán giả có thể đặt/hủy cược
```

### GIAI ĐOẠN 9: Admin Publish kết quả ⚠️ SETTLEMENT ENGINE

```
ADMIN                              HỆ THỐNG
  │                                    │
  └── Publish kết quả                   │
        POST /api/admin/settlement/:raceId/publish
        → { race.status: 'FINISHED' }
                                     │
                                     │ SETTLEMENT ENGINE CHẠY:
                                     │
                                     ├─ 1. Tính tổng pool cược
                                     │
                                     ├─ 2. So sánh mỗi prediction với finalResults
                                     │
                                     ├─ 3. Cập nhật prediction.status:
                                     │     • WON (thắng toàn phần)
                                     │     • PARTIAL_WON (thắng một phần - PLACE/SHOW)
                                     │     • LOST (thua)
                                     │
                                     ├─ 4. Trừ 10% house margin → HOUSE_REVENUE
                                     │
                                     ├─ 5. Cộng tiền thắng vào wallet spectator
                                     │     → WalletTransaction.type: 'BET_WIN'
                                     │
                                     ├─ 6. Cân đối treasure pool (nếu thặng dư/thâm hụt)
                                     │
                                     └─ 7. Broadcast kết quả qua Socket.IO
                                           → 'race:finished'

        ĐIỀU KIỆN:
        ✅ race.status === 'PENDING_RESULT' ← BẮT BUỘC
        ✅ Có officialRaceResult với finalResults
```

### GIAI ĐOẠN 10: Unpublish (hoàn tác) - Tùy chọn

```
ADMIN                              HỆ THỐNG
  │                                    │
  └── Unpublish kết quả                 │
        POST /api/admin/settlement/:raceId/unpublish
        → { race.status: 'PENDING_RESULT' }
                                     │
                                     │ ROLLBACK ENGINE CHẠY:
                                     │
                                     ├─ 1. Thu hồi tiền thắng từ wallet spectator
                                     │     → WalletTransaction.type: 'BET_WIN_REVERSAL'
                                     │
                                     ├─ 2. Hoàn tác house margin
                                     │     → WalletTransaction.type: 'ADMIN_ADJUSTMENT'
                                     │
                                     ├─ 3. Hoàn tác treasure pool
                                     │
                                     ├─ 4. Đưa prediction.status về PENDING
                                     │
                                     └─ 5. Xóa RaceResult records

        ĐIỀU KIỆN:
        ✅ race.status === 'FINISHED' ← BẮT BUỘC

        ⚠️ SAU KHI UNPUBLISH:
           Admin có thể chỉnh sửa finalResults
           Rồi publish lại
```

---

## 6. Sơ đồ trạng thái Race

```
                              ┌──────────────────────┐
                              │       DRAFT         │ (Tournament)
                              │  (Tournament only)   │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │        OPEN         │ (Tournament)
                              └──────────┬───────────┘
                                         │
                                         ▼
                    ┌────────────────────────────────────┐
                    │           SCHEDULED               │
                    │  • Admin phân công trọng tài      │
                    │  • Admin đóng cổng ĐK            │
                    │  • ⚠️ KHÁN GIẢ ĐẶT CƯỢC ĐƯỢC   │
                    └──────────────┬────────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                │    Referee A     │     Referee B    │
                │   startRace()    │   startRace()    │
                │                  │                  │
                ▼                  │                  │
     ┌─────────────────────┐       │                  │
     │    IN_PROGRESS       │◄──────┴──────────────────┘
     │  • Cổng cược ĐÓNG   │     (Ai cũng gọi được)
     │  • Không đặt/hủy    │
     │    cược nữa         │
     └──────────┬──────────┘
                │
                │ Cả 2 referee nộp kết quả blind
                │
                ▼
    ┌───────────────────────────────────────┐
    │          AUTO-MATCH ENGINE             │
    └───────────────────────┬───────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
    ┌─────┴─────┐                       ┌────┴────┐
    │  MATCHED  │                       │CONFLICTED│
    │ (khớp)    │                       │  (lệch) │
    └─────┬─────┘                       └────┬────┘
          │                                  │
          ▼                                  ▼
┌─────────────────┐              ┌───────────────────┐
│ PENDING_RESULT  │              │      PAUSED       │
│ (chờ publish)  │              │ (Admin xử lý)     │
└────────┬────────┘              └─────────┬─────────┘
         │                                 │
         │                        ┌────────┴────────┐
         │                        │                 │
         │               Admin resolve          Admin unlock
         │                 thủ công           (nộp lại)
         │                        │                 │
         │                        └────────┬────────┘
         │                                 │
         │                                 ▼
         │                        ┌─────────────────┐
         │                        │   SCHEDULED     │
         │                        │ (cổng cược MỞ) │
         │                        └─────────────────┘
         │
         ▼
┌─────────────────┐
│    FINISHED     │◄──────────────────────────────┐
│ (settlement xong)│                               │
└────────┬────────┘                                │
         │                                        │
         │ Admin unpublish                        │
         │ (hoàn tác)                            │
         ▼                                        │
┌─────────────────┐                               │
│ PENDING_RESULT  │───────────────────────────────┘
│ (cho phép sửa) │
└─────────────────┘
```

---

## 7. Socket Events

### Namespace: `/notifications` (JWT-authenticated)

| Event | Dir | Payload | Khi nào |
|-------|-----|---------|---------|
| `race:updated` | Server → Client | `{ raceId, status, registrationOpen }` | Race status thay đổi |
| `race:started` | Server → Client | `{ raceId }` | Race chuyển sang IN_PROGRESS |
| `race:finished` | Server → Client | `{ raceId, finalResults }` | Settlement xong |
| `entry:status_changed` | Server → Client | `{ entryId, raceId, oldStatus, newStatus }` | Entry được duyệt/từ chối |
| `prediction:settled` | Server → Client | `{ predictionId, status, payout }` | 1 vé cược được settle |
| `violation:created` | Server → Admin | `{ violation }` | Trọng tài báo vi phạm |

### Subscribe/Unsubscribe

```javascript
// Subscribe nhận thông báo 1 race
socket.emit('subscribe:race', { raceId: 1 });

// Unsubscribe
socket.emit('unsubscribe:race', { raceId: 1 });
```

---

## Tổng kết: Checklist cho Mobile

### ✅ Trước khi hiển thị nút "Đặt cược"
```javascript
if (race.status !== 'SCHEDULED') return disabled = true;
if (race.registrationOpen !== false) return disabled = true;
if (!entry.oddsFinal) return disabled = true;
```

### ✅ Trước khi cho phép hủy cược
```javascript
if (prediction.status !== 'PENDING') return disabled = true;
if (prediction.race.status !== 'SCHEDULED') return disabled = true;
```

### ✅ Trước khi trọng tài startRace
```javascript
if (race.status !== 'SCHEDULED') return error = 'Race chưa ở trạng thái SCHEDULED';
if (!race.refereeAId || !race.refereeBId) return error = 'Chưa phân công đủ 2 trọng tài';
if (currentUser.userId !== race.refereeAId && currentUser.userId !== race.refereeBId) {
  return error = 'Bạn không phải trọng tài của race này';
}
```

### ✅ Trước khi trọng tài nộp kết quả
```javascript
if (race.status !== 'IN_PROGRESS') return error = 'Race chưa bắt đầu';
if (daNop()) return error = 'Bạn đã nộp kết quả trước đó';
```

### ✅ Trước khi Admin publish
```javascript
if (race.status !== 'PENDING_RESULT') return error = 'Race chưa ở PENDING_RESULT';
if (!race.officialRaceResult) return error = 'Chưa có kết quả để publish';
```
