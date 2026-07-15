# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Horse Racing Prediction — a role-based tournament + betting platform. Monorepo with three clients over one API:

- `backend/` — Express + Prisma (PostgreSQL) + Redis + Socket.IO REST API (the source of truth).
- `frontend/` — React 19 + Vite + Tailwind v4 web app.
- `mobile/` — Flutter app (Android/iOS/desktop).
- `docs/` — API contracts consumed by the clients (`API_FOR_FRONTEND.md`, `BETTING_API.md`, `SOCKET_GUIDE.md`, `SUPABASE_SETUP.md`, `AI_Feature.md`). `ai/` is currently empty.

Much of the backend code and comments are in Vietnamese; follow the existing language/style when editing nearby code.

## Common commands

### Backend (`backend/`)
- `npm start` — run the server (`bin/www`, port 3000). Also boots Socket.IO and the cron scheduler.
- `npm test` — Jest (Node env). Tests live in `backend/tests/**/*.test.js`.
- Run a single test file: `npx jest tests/wallet.service.test.js`
- Run tests matching a name: `npx jest -t "place bet"`
- `npm run test:watch` — watch mode.
- `npm run db:migrate` — `prisma migrate deploy`.
- `npm run db:seed` — seed roles + dev users (`prisma/seed.js`).
- `npm run db:push` — push schema without a migration.
- After changing `prisma/schema.prisma`, run `npx prisma generate` (also run automatically in the Docker build).

### Frontend (`frontend/`)
- `npm run dev` — Vite dev server. Proxies `/api` → `http://localhost:3000` (see `vite.config.js`), so run the backend alongside.
- `npm run build`, `npm run preview`, `npm run lint` (ESLint).

### Mobile (`mobile/`)
- `flutter run`. Base URL resolves per platform in `lib/config/api_config.dart` (Android emulator uses `10.0.2.2`); override with `--dart-define=API_BASE_URL=...`.

### Full stack via Docker (from repo root)
- `docker compose --env-file backend/.env up -d --build` — backend + Redis (and Postgres only with `--profile local-db`).
- `docker exec -it horse_racing_backend npx prisma migrate deploy` then `... npx prisma db seed`.
- Swagger UI: `http://localhost:3000/api-docs`.

### Root convenience scripts
- `npm start` / `npm run backend` → backend; `npm run frontend` → frontend dev server.

## Backend architecture

Strict layered flow — keep responsibilities in their layer:

```
routes/ → middlewares/ (auth, role guards) → controllers/ → services/ → config/prisma.js
```

- **routes/** wire URLs to controllers and attach middleware. Registered in `app.js`. Admin routes under `routes/admin/`, owner-scoped under `routes/owner/`.
- **middlewares/** — `auth.js` verifies the JWT **and** checks the token still exists in Redis (`accessToken:<sub>:<token>`); logout/revocation deletes that key, so a valid signature alone is not enough. Role gates: `adminOnly.js`, `horseOwnerOnly.js`, `spectatorOnly.js`. `req.user.sub` is the userId (string) — services take `Number(req.user.sub)`.
- **controllers/** — thin: parse/validate request, call a service, map errors to HTTP. The convention is `res.status(error.status || 400).json({ error: error.message })`; services throw `Error` objects carrying a `.status` property (see the `httpError()` helper pattern).
- **services/** — all business logic and the only place that touches Prisma. Also emit socket events from here.
- **dto/** — request-shape validation/normalization helpers used by controllers/services.
- **config/** — `prisma.js` (single PrismaClient using the `@prisma/adapter-pg` pg adapter), `redis.js`, `mailer.js` (nodemailer for OTP emails).

### Cross-cutting pieces
- **Prisma client** is a singleton exported from `src/config/prisma.js`; always import that, don't `new PrismaClient()`.
- **Redis** backs access-token session state (bearer auth revocation) — it is not just a cache. Auth breaks if Redis is down.
- **Socket.IO** (`src/socket/index.js`) exposes the `/notifications` namespace, JWT-authenticated on handshake. Clients auto-join `user:<id>`, admins join `admin`, and can `subscribe:race`/`unsubscribe:race` for `race:<id>`. Emit from services via `src/socket/emitter.js` helpers (`emitToUser`, `emitToAdmin`, `emitToRace`, `emitToAll`) — they no-op safely when the socket isn't initialized (e.g. in tests). See `docs/SOCKET_GUIDE.md`.
- **Scheduler** (`src/services/scheduler.js`, `node-cron`) is started from `bin/www`. Currently a weekly bonus job (Mon 00:00) crediting spectator wallets.
- **OpenAPI/Swagger** spec is built in `src/openapi.js` and served at `/api-docs`.

### Domain model (Prisma `schema.prisma`)
Roles (seeded): `ADMIN`, `RACE_REFEREE`, `HORSE_OWNER`, `JOCKEY`, `SPECTATOR`. Core flows:

- **Tournaments → Races → RaceEntries**: owners register horses into races; entries move `PENDING → APPROVED/REJECTED`. Jockeys are assigned via `JockeyInvitation`.
- **Betting**: spectators fund a `PointWallet` (integer points) and place `Prediction`s with a `BetType` (WIN/PLACE/SHOW/QUINELLA/EXACTA) at `lockedOdds`. `Odds` are computed per entry (`services/odds.js`). Bets only on `SCHEDULED` races; bet sizing rules enforced in `services/predictions.js`. See `docs/BETTING_API.md`.
- **Wallet integrity**: `PointWallet.rowVersion` (binary) is used for optimistic locking to prevent race conditions on balance updates. Every change writes a `WalletTransaction` row with `balanceAfter` and a `type` (`BET_PLACED`, `BET_WIN`, `WEEKLY_BONUS`, `ADMIN_ADJUSTMENT`, etc.). Preserve this ledger pattern.
- **Blind double-entry results** (Flow 4): two referees (`refereeAId`/`refereeBId`) each submit results independently into append-only `RefereeSubmission`; `OfficialRaceResult.matchStatus` tracks `AUTO_MATCHED`/`CONFLICTED`, and an admin resolves conflicts (`resolvedById` + required `resolveReason`).

## Frontend architecture

React Router (v7) SPA. Structure: `pages/` and role-specific `components/{admin,horseOwner,jockey,spectator}/` with per-role layouts; `api/` holds `fetch` wrappers hitting the proxied `/api/*` endpoints. The auth API pattern (`src/api/auth.js`): call `fetch`, on `!res.ok` throw `Error(data?.error || data?.message || fallback)` — mirror this. Auth token is passed as `Authorization: Bearer <accessToken>`. `RequireRole.jsx` gates routes by role. Error/UI copy is often Vietnamese.

## Configuration

Backend reads `backend/.env` (see `backend/.env.example`): `DATABASE_URL` (Supabase transaction pooler, port 6543) + `DIRECT_URL` (direct, port 5432, for migrations), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_*` (Gmail app password for OTP), `REDIS_URL`. Docker Compose overrides `REDIS_URL` to the in-network `redis_cache`. Supabase setup details in `docs/SUPABASE_SETUP.md`.
