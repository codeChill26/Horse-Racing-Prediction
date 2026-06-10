# API Spec (for Frontend)

> Scope: document the APIs that FE needs to call.
>
> Excluded by request: **Auth APIs** and **JockeyInvitation / Invitations APIs** are NOT documented here.
>
> Backend code references are provided as “owner” pointers (controller/service/route files). They are **not** human names.

## 0) Environment / Base

- Base URL (dev): `http://localhost:3000`
- All request/response bodies are JSON unless noted.
- Common error shape:

```json
{ "error": "<message>" }
```

## 1) Authentication for protected endpoints (without documenting auth APIs)

Some endpoints require a valid access token:

- Header: `Authorization: Bearer <accessToken>`
- Middleware behavior (important for FE): token must be valid JWT **and** must still exist in Redis (otherwise returns 401).

Protected endpoints also check role:
- Admin-only: role code must be `ADMIN`
- Horse-owner-only: role code must be `HORSE_OWNER`

## 2) Modules & Endpoint Index

## 2.1 Responsibility / Ownership matrix (fill-in friendly)

| Module | FE owner (fill) | Backend owner (code) |
|---|---|---|
| Public Tournaments | TBD | `backend/src/routes/tournaments.js` + `backend/src/controllers/tournaments.controller.js` |
| Admin Tournaments | TBD | `backend/src/routes/admin/tournaments.js` + `backend/src/controllers/adminTournaments.controller.js` |
| Public Horses | TBD | `backend/src/routes/horses.js` + `backend/src/controllers/horses.controller.js` |
| Horse Owner Horses | TBD | `backend/src/routes/horses.js` + `backend/src/controllers/horses.controller.js` |
| Admin Horses | TBD | `backend/src/routes/admin/horses.js` + `backend/src/controllers/adminHorses.controller.js` |
| Race Entries (Submit) | TBD | `backend/src/routes/raceEntries.js` + `backend/src/controllers/raceEntries.controller.js` |
| Race Entries (Review) | TBD | `backend/src/routes/raceEntries.js` + `backend/src/controllers/raceEntries.controller.js` |
| Admin Races (Gate) | TBD | `backend/src/routes/admin/races.js` + `backend/src/controllers/raceEntries.controller.js` |

### Public (no login required)
- Tournaments
  - `GET /api/tournaments`
  - `GET /api/tournaments/:id`
- Horses
  - `GET /api/horses`
  - `GET /api/horses/:id`

### Horse Owner (requires `HORSE_OWNER` token)
- Horses
  - `GET /api/horses/mine`
  - `POST /api/horses`
- Race Entries
  - `POST /api/entries` (or `POST /api/races/:raceId/entries`)

### Admin (requires `ADMIN` token)
- Admin Users
  - `GET /api/admin/users`
  - `GET /api/admin/users/:id`
  - `POST /api/admin/users`
  - `PATCH /api/admin/users/:id`
  - `PATCH /api/admin/users/:id/toggle-active`
  - `PATCH /api/admin/users/:id/role`
  - `DELETE /api/admin/users/:id`
- Admin Tournaments
  - `GET /api/admin/tournaments`
  - `GET /api/admin/tournaments/:id`
  - `POST /api/admin/tournaments`
  - `PATCH /api/admin/tournaments/:id`
  - `PATCH /api/admin/tournaments/:id/status`
  - `DELETE /api/admin/tournaments/:id`
- Admin Horses
  - `GET /api/admin/horses`
  - `GET /api/admin/horses/:id`
  - `PATCH /api/admin/horses/:id/status`
- Race Entries (admin review)
  - `PUT /api/entries/:id/status`
- Admin Races (registration gate)
  - `PUT /api/admin/races/:id/registration-gate`

---

# 3) Detailed Specs

## A) Public Tournaments

**Feature/module**: Tournament listing/details (public)

**Owner (backend)**:
- Route: `backend/src/routes/tournaments.js`
- Controller: `backend/src/controllers/tournaments.controller.js`
- Service: `backend/src/services/tournaments.js`

### A1) List public tournaments
`GET /api/tournaments`

- Auth: none
- Returns only tournaments with status in: `OPEN`, `ONGOING`, `FINISHED`

**200 Response**

```json
{
  "tournaments": [
    {
      "tournamentId": 12,
      "name": "Spring Derby 2026",
      "description": "...",
      "status": "OPEN",
      "startAt": "2026-06-10T00:00:00.000Z",
      "endAt": "2026-06-20T00:00:00.000Z",
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```

### A2) Get public tournament by id
`GET /api/tournaments/:id`

- Auth: none
- Path params:
  - `id` (int > 0)

**200 Response**

```json
{
  "tournament": {
    "tournamentId": 12,
    "name": "Spring Derby 2026",
    "description": "...",
    "status": "OPEN",
    "startAt": "2026-06-10T00:00:00.000Z",
    "endAt": "2026-06-20T00:00:00.000Z",
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-01T10:00:00.000Z"
  }
}
```

**Errors**
- `400` `{ "error": "Invalid tournament id" }` if id is not positive integer
- `404` `{ "error": "Tournament not found" }` if not found or not in public statuses

---

## B) Admin Tournaments

**Feature/module**: Tournament management (admin)

**Owner (backend)**:
- Route: `backend/src/routes/admin/tournaments.js`
- Controller: `backend/src/controllers/adminTournaments.controller.js`
- Service: `backend/src/services/adminTournaments.js`
- DTO validator: `backend/src/dto/adminTournament.dto.js`

### B1) List tournaments (admin)
`GET /api/admin/tournaments?status=<STATUS>`

- Auth: Bearer token required
- Role: `ADMIN`
- Query:
  - `status` optional: `ALL | DRAFT | OPEN | ONGOING | FINISHED | CANCELLED`
    - omit or `ALL` => no filter (return all)

**200 Response**

```json
{
  "tournaments": [
    {
      "tournamentId": 1,
      "name": "T1",
      "description": null,
      "status": "DRAFT",
      "cancelReason": null,
      "startAt": null,
      "endAt": null,
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-01T10:00:00.000Z",
      "_count": { "races": 0 }
    }
  ]
}
```

**Errors**
- `401` if missing/invalid token
- `403` if non-admin
- `400` if `status` is invalid

### B2) Get tournament by id (admin)
`GET /api/admin/tournaments/:id`

- Auth: Bearer token required
- Role: `ADMIN`

**200 Response**

```json
{ "tournament": { "tournamentId": 1, "name": "T1", "status": "DRAFT", "_count": { "races": 0 } } }
```

**Errors**
- `400` invalid id
- `404` not found

### B3) Create tournament (admin)
`POST /api/admin/tournaments`

- Auth: Bearer token required
- Role: `ADMIN`
- Body:

```json
{
  "name": "Spring Derby 2026",
  "description": "Optional",
  "startAt": "2026-06-10T00:00:00.000Z",
  "endAt": "2026-06-20T00:00:00.000Z"
}
```

- Rules:
  - `name` required, non-empty
  - `startAt`/`endAt` optional, must be valid ISO datetime if present
  - if both present: `startAt <= endAt`
  - Created tournaments always start as `DRAFT`

**201 Response**

```json
{
  "message": "Tournament created successfully",
  "tournament": {
    "tournamentId": 123,
    "name": "Spring Derby 2026",
    "status": "DRAFT",
    "_count": { "races": 0 }
  }
}
```

### B4) Update tournament info (admin)
`PATCH /api/admin/tournaments/:id`

- Auth: Bearer token required
- Role: `ADMIN`
- Body: at least one field is required

```json
{
  "name": "Updated name",
  "description": "Updated description",
  "startAt": "2026-06-11T00:00:00.000Z",
  "endAt": "2026-06-22T00:00:00.000Z"
}
```

- Rules:
  - Cannot modify tournaments in `FINISHED` or `CANCELLED` (returns `409`)

**200 Response**

```json
{ "message": "Tournament updated successfully", "tournament": { "tournamentId": 123, "status": "OPEN" } }
```

**Errors**
- `409` when tournament is `FINISHED`/`CANCELLED`

### B5) Change tournament lifecycle status (admin)
`PATCH /api/admin/tournaments/:id/status`

- Auth: Bearer token required
- Role: `ADMIN`
- Body:

```json
{ "status": "OPEN" }
```

- Allowed transitions:
  - `DRAFT -> OPEN -> ONGOING -> FINISHED`
  - `DRAFT|OPEN|ONGOING -> CANCELLED` (requires `cancelReason`)

Example cancel:

```json
{ "status": "CANCELLED", "cancelReason": "Bad weather" }
```

**200 Response**

```json
{ "message": "Tournament status updated successfully", "tournament": { "tournamentId": 123, "status": "OPEN" } }
```

**Errors**
- `400` missing status
- `409` invalid transition (or trying to change status from FINISHED/CANCELLED)
- `400` cancelling without `cancelReason`

### B6) Delete / Cancel tournament (admin)
`DELETE /api/admin/tournaments/:id?reason=...`

- Auth: Bearer token required
- Role: `ADMIN`
- Behavior:
  - If tournament has **no races**: it is **hard deleted**
  - If tournament has races: it is changed to **CANCELLED** and requires a reason

**200 Responses**

Deleted:
```json
{ "message": "Tournament deleted successfully" }
```

Cancelled:
```json
{
  "message": "Tournament contains races; cancelled instead of deleting",
  "tournament": { "tournamentId": 123, "status": "CANCELLED", "cancelReason": "..." }
}
```

---

## C) Public Horses

**Feature/module**: Horse list/details (public)

**Owner (backend)**:
- Route: `backend/src/routes/horses.js`
- Controller: `backend/src/controllers/horses.controller.js`
- Service: `backend/src/services/horses.js`
- DTO validator: `backend/src/dto/horse.dto.js`

### C1) List approved horses
`GET /api/horses`

- Auth: none
- Returns only horses with status `APPROVED`
- Response items include `careerMetrics`

**200 Response**

```json
{
  "horses": [
    {
      "horseId": 10,
      "ownerId": 7,
      "name": "Storm",
      "breed": "Arabian",
      "dateOfBirth": "2020-01-01T00:00:00.000Z",
      "sex": "M",
      "color": "Brown",
      "status": "APPROVED",
      "rejectionReason": null,
      "approvedAt": "2026-06-02T10:00:00.000Z",
      "rejectedAt": null,
      "reviewedById": 1,
      "createdAt": "2026-06-01T10:00:00.000Z",
      "updatedAt": "2026-06-01T10:00:00.000Z",
      "careerMetrics": {
        "totalStarts": 3,
        "wins": 1,
        "winRate": 33.33,
        "avgFinishPosition": 2.33,
        "recentForm": [
          {
            "raceId": 5,
            "raceName": "Race 5",
            "tournamentId": 2,
            "tournamentName": "Spring Derby 2026",
            "scheduledAt": "2026-06-03T10:00:00.000Z",
            "finishPosition": 1
          }
        ],
        "recentFormText": "1-2-4"
      }
    }
  ]
}
```

### C2) Get public horse by id
`GET /api/horses/:id`

- Auth: none
- Only `APPROVED` horses are visible here

**Errors**
- `404` if horse not found or not approved

---

## D) Horse Owner Horses

**Feature/module**: Horse registration / my horses (horse owner)

**Owner (backend)**:
- Route: `backend/src/routes/horses.js`
- Controller: `backend/src/controllers/horses.controller.js`
- Service: `backend/src/services/horses.js`

### D1) List my horses
`GET /api/horses/mine`

- Auth: Bearer token required
- Role: `HORSE_OWNER`

**200 Response**

```json
{ "horses": [ { "horseId": 10, "status": "PENDING", "careerMetrics": { "totalStarts": 0, "winRate": 0 } } ] }
```

### D2) Create horse (submit for admin approval)
`POST /api/horses`

- Auth: Bearer token required
- Role: `HORSE_OWNER`
- Body:

```json
{
  "name": "Storm",
  "breed": "Arabian",
  "dateOfBirth": "2020-01-01",
  "sex": "M",
  "color": "Brown"
}
```

- Rules:
  - `name` required, non-empty
  - `dateOfBirth` if present must be parseable date string

**201 Response**

```json
{ "message": "Horse submitted for approval", "horse": { "horseId": 10, "status": "PENDING" } }
```

---

## E) Admin Horses (Review/Approval)

**Feature/module**: Admin reviews horse registrations

**Owner (backend)**:
- Route: `backend/src/routes/admin/horses.js`
- Controller: `backend/src/controllers/adminHorses.controller.js`
- Service: `backend/src/services/horses.js`

### E1) List horses for admin
`GET /api/admin/horses?status=PENDING`

- Auth: Bearer token required
- Role: `ADMIN`
- Query:
  - `status` optional: `PENDING | APPROVED | REJECTED | ALL`

**200 Response**

```json
{ "horses": [ { "horseId": 10, "status": "PENDING", "rejectionReason": null } ] }
```

Note: list items do **not** include `careerMetrics`.

### E2) Get horse by id (admin)
`GET /api/admin/horses/:id`

- Auth: Bearer token required
- Role: `ADMIN`

**200 Response** includes `careerMetrics`.

### E3) Review horse
`PATCH /api/admin/horses/:id/status`

- Auth: Bearer token required
- Role: `ADMIN`
- Body:

Approve:
```json
{ "status": "APPROVED" }
```

Reject:
```json
{ "status": "REJECTED", "reason": "Invalid documents" }
```

- Rules:
  - status must be `APPROVED` or `REJECTED`
  - if `REJECTED`, `reason` is required

**200 Response**

```json
{ "message": "Horse review updated successfully", "horse": { "horseId": 10, "status": "APPROVED" } }
```

---

## F) Race Entries (Horse Owner submission)

**Feature/module**: Submit a horse into a race

**Owner (backend)**:
- Route: `backend/src/routes/raceEntries.js`
- Controller: `backend/src/controllers/raceEntries.controller.js`
- Service: `backend/src/services/raceEntries.js`
- DTO validator: `backend/src/dto/raceEntry.dto.js`

### F1) Create entry
Primary path:
`POST /api/entries`

Alternative path:
`POST /api/races/:raceId/entries`

- Auth: Bearer token required
- Role: `HORSE_OWNER`
- Body (for `/api/entries`):

```json
{ "raceId": 1, "horseId": 10, "jockeyId": 21 }
```

- Body (for `/api/races/:raceId/entries`):

```json
{ "horseId": 10, "jockeyId": 21 }
```

- Rules enforced by backend:
  - race must exist and `registrationOpen` must be `true` (else `409`)
  - horse must exist, must belong to current owner (else `403`), and must be `APPROVED` (else `409`)
  - `jockeyId` optional; if provided, jockey must exist, have role `JOCKEY`, be active and profile-complete (else `404/409`)
  - uniqueness: a horse can only be registered once per race (else `409`)

**201 Response**

```json
{
  "message": "Race entry created successfully",
  "entry": {
    "entryId": 3,
    "raceId": 1,
    "horseId": 10,
    "jockeyId": 21,
    "status": "PENDING",
    "rejectionReason": null,
    "reviewedById": null,
    "reviewedAt": null,
    "createdAt": "2026-06-05T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:00:00.000Z",
    "horse": { "horseId": 10, "name": "Storm", "status": "APPROVED" },
    "race": { "raceId": 1, "name": "Race 1", "tournamentId": 123, "registrationOpen": true },
    "jockey": {
      "userId": 21,
      "fullName": "Jockey Demo",
      "email": "jockey@local.test",
      "isActive": true,
      "isProfileComplete": true,
      "role": { "code": "JOCKEY" }
    }
  }
}
```

**Common Errors**
- `401` missing/invalid token
- `403` non-horse-owner, or trying to register a horse you don’t own
- `404` race/horse/jockey not found
- `409` registration gate closed / horse not approved / jockey invalid / duplicate horse-per-race

---

## G) Race Entries (Admin review)

**Feature/module**: Admin approves/rejects entries

**Owner (backend)**:
- Route: `backend/src/routes/raceEntries.js`
- Controller: `backend/src/controllers/raceEntries.controller.js`
- Service: `backend/src/services/raceEntries.js`

### G1) Review entry
`PUT /api/entries/:id/status`

Note: because the same router is also mounted at `/api/races/:raceId/entries`, the alias path
`PUT /api/races/:raceId/entries/:id/status` will also hit this handler. FE should use the canonical
`/api/entries/:id/status`.

- Auth: Bearer token required
- Role: `ADMIN`
- Body:

Approve:
```json
{ "status": "APPROVED" }
```

Reject:
```json
{ "status": "REJECTED", "reason": "Invalid documents" }
```

- Rules:
  - status must be `APPROVED` or `REJECTED`
  - rejecting requires `reason`

**200 Response**

```json
{ "message": "Race entry status updated successfully", "entry": { "entryId": 3, "status": "APPROVED" } }
```

---

## H) Admin Races (Open/Close registration gate)

**Feature/module**: Admin controls whether entries can be submitted for a race

**Owner (backend)**:
- Route: `backend/src/routes/admin/races.js`
- Controller: `backend/src/controllers/raceEntries.controller.js` (shared)
- Service: `backend/src/services/raceEntries.js`

### H1) Set registration gate
`PUT /api/admin/races/:id/registration-gate`

- Auth: Bearer token required
- Role: `ADMIN`
- Body:

```json
{ "isOpen": true }
```

- Side effect:
  - Closing the gate (`isOpen=false`) auto-rejects all `PENDING` entries for that race with reason: "Registration gate closed by admin."

**200 Response**

```json
{
  "message": "Race registration gate closed successfully",
  "race": {
    "raceId": 1,
    "tournamentId": 123,
    "name": "Race 1",
    "scheduledAt": null,
    "registrationOpen": false,
    "registrationOpenedAt": "2026-06-05T09:00:00.000Z",
    "registrationClosedAt": "2026-06-05T10:00:00.000Z",
    "createdAt": "2026-06-01T10:00:00.000Z",
    "updatedAt": "2026-06-05T10:00:00.000Z"
  },
  "autoRejectedCount": 2
}
```

---

# 4) Test Data (dev)

## 4.1 Seeded accounts (from `backend/prisma/seed.js`)

These exist after running the seed script:

- Admin:
  - email: `admin@local.test`
  - password: `password123`
  - role: `ADMIN`

- Spectator:
  - email: `spectator@local.test`
  - password: `password123`
  - role: `SPECTATOR`

> Note: This doc does NOT detail auth endpoints. Use your existing auth docs / swagger to obtain `accessToken` for these accounts.

## 4.2 Create additional test users (recommended)

Because flows require `HORSE_OWNER` and optionally `JOCKEY`, create them via **Admin Users API**.

### Create Horse Owner
`POST /api/admin/users`

```json
{
  "email": "owner@local.test",
  "password": "password123",
  "fullName": "Owner Demo",
  "roleCode": "HORSE_OWNER"
}
```

### Create Jockey (profile-complete)
`POST /api/admin/users`

```json
{
  "email": "jockey@local.test",
  "password": "password123",
  "fullName": "Jockey Demo",
  "roleCode": "JOCKEY",
  "licenseNumber": "LIC-001",
  "weight": 53
}
```

## 4.3 Create a tournament (admin)

Use `POST /api/admin/tournaments` and capture returned `tournamentId`.

## 4.4 IMPORTANT: race creation is not exposed via API

There is currently **no HTTP endpoint** to create races in this backend (only a gate-control endpoint exists).

To test entry submission (`POST /api/entries`), you need a valid `raceId` in DB.

Options:
- Create a race directly in DB (via Prisma Studio / SQL) referencing an existing `tournamentId`.
- Or extend backend with an admin endpoint to create races (not included here since not in current codebase).

Minimal SQL example (Postgres):

```sql
INSERT INTO "Race" ("tournamentId", "name", "registrationOpen")
VALUES (123, 'Race 1', true)
RETURNING "raceId";
```

## 4.5 End-to-end happy-path (summary)

1) Admin creates `HORSE_OWNER` + `JOCKEY` users (section 4.2)
2) Admin creates tournament (section 4.3)
3) Insert 1 race into DB and set `registrationOpen=true` (section 4.4)
4) Horse owner submits horse: `POST /api/horses` -> gets `horseId`
5) Admin approves horse: `PATCH /api/admin/horses/:id/status` (status `APPROVED`)
6) Horse owner submits entry: `POST /api/entries` with `raceId`, `horseId`, optional `jockeyId`
7) Admin approves/rejects entry: `PUT /api/entries/:id/status`

