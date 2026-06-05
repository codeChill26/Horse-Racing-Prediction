# Hướng dẫn Supabase + Prisma 7 — Dự án Horse Racing Prediction

Tài liệu này mô tả **cách đã cấu hình database trên Supabase**, **vì sao trước đó hay lỗi**, và **cách chia sẻ DB cho cả team** dùng chung một môi trường.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Vì sao bạn sửa mãi không được?](#2-vì-sao-bạn-sửa-mãi-không-được)
3. [Kiến trúc kết nối Supabase](#3-kiến-trúc-kết-nối-supabase)
4. [Các file đã thay đổi](#4-các-file-đã-thay-đổi)
5. [Các bước đã thực hiện (lần deploy đầu)](#5-các-bước-đã-thực-hiện-lần-deploy-đầu)
6. [Hướng dẫn cho thành viên mới trong team](#6-hướng-dẫn-cho-thành-viên-mới-trong-team)
7. [Chia sẻ database cho cả team](#7-chia-sẻ-database-cho-cả-team)
8. [Quy trình làm việc khi có thay đổi schema](#8-quy-trình-làm-việc-khi-có-thay-đổi-schema)
9. [Lệnh thường dùng](#9-lệnh-thường-dùng)
10. [Xử lý lỗi thường gặp](#10-xử-lý-lỗi-thường-gặp)

---

## 1. Tổng quan

| Thành phần | Vai trò |
|------------|---------|
| **Supabase** | PostgreSQL trên cloud — DB dùng chung cho team |
| **Prisma** | ORM + migration + seed |
| **`DATABASE_URL`** | Kết nối qua **pooler** (port 6543) — backend chạy app |
| **`DIRECT_URL`** | Kết nối **trực tiếp** (port 5432) — Prisma migrate/seed CLI |

Database hiện có các bảng chính: `User`, `Role`, `PointWallet`, `WalletTransaction`, `PasswordResetOtp`, `RefreshToken`.

Migration đã apply:

- `20260524070350_init`
- `20260524083208_add_refresh_token_table`

Seed mặc định đã chèn 5 role: `HORSE_OWNER`, `JOCKEY`, `SPECTATOR`, `RACE_REFEREE`, `ADMIN`.

---

## 2. Vì sao bạn sửa mãi không được?

Dự án dùng **Prisma ORM v7**. Phiên bản này **đổi cách cấu hình** so với Prisma 5/6. Nếu chỉ sửa `.env` hoặc `schema.prisma` theo tài liệu cũ sẽ gặp lỗi.

### Lỗi 1: `url` trong `schema.prisma` không còn hợp lệ

**Triệu chứng:**

```text
Error code: P1012
error: The datasource property `url` is no longer supported in schema files.
Move connection URLs for Migrate to `prisma.config.ts` ...
```

**Nguyên nhân:** Prisma 7 bắt URL kết nối đặt trong `prisma.config.ts`, không đặt trong `datasource db { url = ... }` nữa.

**Cách sửa:** Trong `prisma/schema.prisma` chỉ giữ:

```prisma
datasource db {
  provider = "postgresql"
}
```

URL đặt trong `backend/prisma.config.ts`.

---

### Lỗi 2: `prisma.config.ts` đặt sai thư mục

**Triệu chứng:** CLI không load `.env`, migrate không chạy hoặc báo thiếu biến môi trường.

**Nguyên nhân:** File `prisma.config.ts` phải nằm **cùng cấp với `package.json` của backend** (tức `backend/prisma.config.ts`), không phải ở root repo.

**Cách sửa:** Xóa `prisma.config.ts` ở root (nếu có), chỉ giữ `backend/prisma.config.ts`.

---

### Lỗi 3: Dùng pooler (port 6543) để chạy migration

**Triệu chứng:** Migrate treo, lỗi transaction, hoặc migration không apply đúng.

**Nguyên nhân:** Supabase **Transaction pooler** (PgBouncer) không phù hợp cho một số lệnh DDL/migration của Prisma.

**Cách sửa:** Trong `prisma.config.ts` dùng **`DIRECT_URL`** (port **5432**), không dùng `DATABASE_URL` pooler.

---

### Lỗi 4: `new PrismaClient()` không tham số (Prisma 7)

**Triệu chứng khi seed hoặc chạy app:**

```text
PrismaClientInitializationError: `PrismaClient` needs to be constructed with a non-empty, valid `PrismaClientOptions`
```

**Nguyên nhân:** Prisma 7 yêu cầu **driver adapter** (ví dụ `@prisma/adapter-pg`) khi tạo client.

**Cách sửa:** Cài `@prisma/adapter-pg` + `pg`, khởi tạo client trong `src/config/prisma.js` (xem mục 4).

---

### Lỗi 5: Chạy lệnh Prisma không đúng thư mục

Mọi lệnh `npx prisma ...` phải chạy trong:

```text
backend/
```

(vì `package.json` và `prisma.config.ts` nằm ở đó)

---

## 3. Kiến trúc kết nối Supabase

```text
┌─────────────────────────────────────────────────────────────┐
│                     Supabase Project                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                       │   │
│  │   User | Role | PointWallet | RefreshToken | ...      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ▲                              ▲
         │ DIRECT_URL                   │ DATABASE_URL
         │ port 5432                    │ port 6543 + pgbouncer
         │ (Session / Direct)           │ (Transaction pooler)
         │                              │
┌────────┴────────┐            ┌────────┴────────┐
│  Prisma CLI     │            │  Express Backend │
│  migrate deploy │            │  (npm start)     │
│  db seed        │            │  src/config/     │
│  prisma studio  │            │  prisma.js       │
└─────────────────┘            └──────────────────┘
```

| Biến | Port | Dùng cho |
|------|------|----------|
| `DIRECT_URL` | 5432 | `prisma migrate deploy`, `prisma db seed`, `prisma studio` |
| `DATABASE_URL` | 6543 | Backend runtime (`PrismaClient` qua adapter) |

Lấy 2 URL này trên Supabase:

1. Vào project → **Connect** (hoặc **Project Settings → Database**)
2. Chọn **ORM** → **Prisma**
3. Copy **Transaction pooler** → `DATABASE_URL`
4. Copy **Session pooler** hoặc **Direct connection** → `DIRECT_URL`

> **Gợi ý:** Nếu `DIRECT_URL` dùng host `db.xxx.supabase.co` thay vì `pooler.supabase.com` vẫn được, miễn là port **5432** và user/password đúng.

---

## 4. Các file đã thay đổi

### `backend/prisma.config.ts` (file mới — quan trọng)

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: env("DIRECT_URL"),  // migrate phải dùng direct, không pooler
  },
});
```

### `backend/prisma/schema.prisma`

- **Đã bỏ** dòng `url = env("DATABASE_URL")` trong `datasource db`
- Giữ `provider = "postgresql"`

### `backend/src/config/prisma.js`

```js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

module.exports = prisma;
```

### `backend/prisma/seed.js`

- Dùng chung `require("../src/config/prisma")` thay vì `new PrismaClient()` trực tiếp

### `backend/package.json`

Thêm script:

```json
"db:migrate": "prisma migrate deploy",
"db:seed": "prisma db seed",
"db:push": "prisma db push"
```

Thêm dependency: `@prisma/adapter-pg`, `pg`

### `backend/.env.example`

Mẫu `DATABASE_URL` + `DIRECT_URL` cho Supabase (không chứa mật khẩu thật).

### Đã xóa

- `prisma.config.ts` ở **root repo** (sai vị trí)

---

## 5. Các bước đã thực hiện (lần deploy đầu)

Chạy trong thư mục `backend/`:

```bash
# 1. Cài dependency (nếu chưa)
npm install

# 2. Đảm bảo .env có DATABASE_URL và DIRECT_URL

# 3. Apply toàn bộ migration lên Supabase
npm run db:migrate
# hoặc: npx prisma migrate deploy

# 4. Seed dữ liệu Role
npm run db:seed
# hoặc: npx prisma db seed

# 5. (Tuỳ chọn) Sinh lại Prisma Client sau khi đổi schema
npx prisma generate
```

Kết quả mong đợi:

```text
All migrations have been successfully applied.
Seeded role: HORSE_OWNER
...
Database seeding completed successfully!
```

---

## 6. Hướng dẫn cho thành viên mới trong team

### Bước 1: Clone repo

```bash
git clone <url-repo>
cd HorsesRacingPrediction_PRM/backend
npm install
```

### Bước 2: Tạo file `.env`

```bash
cp .env.example .env
```

Nhờ người quản lý Supabase (hoặc lead) gửi **nội dung `.env` thật** qua kênh bảo mật (xem mục 7). **Không** commit file `.env` lên Git.

### Bước 3: Kiểm tra kết nối

```bash
npx prisma migrate status
```

Nếu báo *"Database schema is up to date"* → OK, không cần migrate lại.

### Bước 4: Chạy backend

```bash
npm start
```

### Bước 5: (Tuỳ chọn) Xem dữ liệu

```bash
npx prisma studio
```

Hoặc dùng **Supabase Dashboard → Table Editor**.

---

## 7. Chia sẻ database cho cả team

Có **hai lớp** cần chia sẻ: quyền trên Supabase và chuỗi kết nối trong `.env`.

### 7.1. Mô hình khuyến nghị: Một Supabase project — cả team dùng chung

Phù hợp đồ án / dev: mọi người trỏ vào **cùng một database**, dữ liệu đồng bộ.

```text
Team
 ├── Dev A  ──► .env (cùng DATABASE_URL / DIRECT_URL)
 ├── Dev B  ──► .env (cùng)
 └── Dev C  ──► .env (cùng)
         │
         ▼
   Supabase Project (horse-racing-dev)
```

**Ưu điểm:** Đơn giản, test API/auth cùng dữ liệu.  
**Nhược điểm:** Ai cũng có thể xóa/sửa dữ liệu — cần thống nhất quy ước, tránh seed/migrate lung tung trên production.

---

### 7.2. Cách A — Chia sẻ connection string (nhanh nhất)

**Người setup (bạn):**

1. Vào [Supabase Dashboard](https://supabase.com/dashboard) → chọn project
2. **Project Settings → Database** (hoặc nút **Connect**)
3. Copy 2 URI Prisma:
   - Transaction pooler → `DATABASE_URL`
   - Direct / Session → `DIRECT_URL`
4. Gửi cho team qua **một trong các kênh an toàn**:
   - Discord/Telegram **kênh riêng** (chỉ member team)
   - Password manager team (1Password, Bitwarden Collections)
   - `.env` mẫu đã điền qua **Google Drive / SharePoint** (quyền chỉ xem với email FPT)
   - Biến môi trường trên máy CI (GitHub Secrets) nếu deploy

**Mẫu tin nhắn gửi team:**

```env
# backend/.env — KHÔNG commit file này lên Git
DATABASE_URL="postgresql://postgres.xxxxx:PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
# ... các biến khác trong .env.example
```

**Mỗi thành viên:**

```bash
cd backend
cp .env.example .env
# Dán nội dung team lead gửi vào .env
npm install
npx prisma migrate status   # xác nhận đã sync schema
npm start
```

---

### 7.3. Cách B — Mời thành viên vào Supabase project (khuyến nghị cho team lớn)

1. Supabase → **Project Settings → Team**
2. **Invite member** bằng email
3. Role gợi ý:
   - **Developer** — dev hàng ngày, xem DB, không nên xóa project
   - **Owner** — chỉ 1–2 người (lead)

Mỗi người tự vào Dashboard → **Connect → Prisma** để copy `DATABASE_URL` / `DIRECT_URL` vào `.env` local.

**Ưu điểm:** Không phải gửi password qua chat nhiều lần; có thể revoke quyền khi member rời nhóm.

---

### 7.4. Cách C — Nhiều môi trường (nâng cao)

| Môi trường | Supabase project | Ai dùng |
|------------|------------------|---------|
| `dev` | `horse-racing-dev` | Cả team khi code local |
| `staging` | `horse-racing-staging` | Test trước demo |
| `prod` | `horse-racing-prod` | Deploy thật |

Mỗi môi trường có bộ `DATABASE_URL` / `DIRECT_URL` riêng. File `.env` local chỉ trỏ `dev`; CI/CD dùng GitHub Secrets cho `staging`/`prod`.

---

### 7.5. Những điều KHÔNG được làm

| Việc | Lý do |
|------|--------|
| Commit `.env` lên Git | Lộ password DB, JWT secret |
| Gửi password DB vào group chat công khai | Rủi ro bảo mật |
| Mỗi người tự `prisma migrate dev` trên DB chung mà không commit migration | Schema lệch, conflict |
| Dùng `db push` thay migrate trên DB team | Khó đồng bộ, dễ ghi đè |
| Chạy `migrate reset` trên DB chung | **Xóa toàn bộ dữ liệu** |

File `.env` đã nằm trong `.gitignore` — giữ nguyên như vậy.

---

### 7.6. Checklist cho team lead khi onboard member mới

- [ ] Mời vào Supabase project **hoặc** gửi `.env` qua kênh bảo mật
- [ ] Gửi link file tài liệu này (`backend/docs/SUPABASE_SETUP.md`)
- [ ] Nhắc chạy lệnh trong thư mục `backend/`
- [ ] Xác nhận `npx prisma migrate status` → schema up to date
- [ ] Không cần chạy lại migrate/seed nếu DB đã setup (trừ khi có migration mới)

---

## 8. Quy trình làm việc khi có thay đổi schema

Chỉ **một người** (hoặc một PR) tạo migration, rồi cả team pull code và deploy.

### Người sửa schema

```bash
cd backend

# 1. Sửa prisma/schema.prisma

# 2. Tạo migration mới (local, cần DIRECT_URL)
npx prisma migrate dev --name ten_migration_ngan_gon

# 3. Commit và push:
#    - prisma/schema.prisma
#    - prisma/migrations/<timestamp>_ten_migration/
#    - (không commit .env)

git add prisma/
git commit -m "feat(db): add ..."
git push
```

### Các thành viên còn lại (sau khi pull)

```bash
cd backend
git pull
npm install
npm run db:migrate    # apply migration mới lên Supabase chung
# Chỉ seed lại nếu seed script có thay đổi:
npm run db:seed
```

### Quy ước team

1. **Luôn** dùng `prisma migrate dev` + commit folder `migrations/`
2. **Không** dùng `db push` trên database team (trừ prototype cá nhân)
3. Thông báo trên group trước khi chạy lệnh có thể ảnh hưởng dữ liệu
4. Backup/export quan trọng trước demo lớn (Supabase → Database → Backups)

---

## 9. Lệnh thường dùng

Tất cả chạy trong `backend/`:

| Lệnh | Mô tả |
|------|--------|
| `npm run db:migrate` | Apply migration lên Supabase (`DIRECT_URL`) |
| `npm run db:seed` | Chạy `prisma/seed.js` |
| `npx prisma migrate status` | Xem migration đã apply chưa |
| `npx prisma generate` | Sinh lại `@prisma/client` sau đổi schema |
| `npx prisma studio` | UI xem/sửa bảng (cẩn thận trên DB chung) |
| `npm start` | Chạy Express API |

---

## 10. Xử lý lỗi thường gặp

### `P1012` — url không được trong schema

→ Bỏ `url` trong `schema.prisma`, cấu hình URL trong `prisma.config.ts`.

### `Can't reach database server`

→ Kiểm tra password, IP allowlist Supabase, VPN/firewall. Thử ping host trong connection string.

### Migrate lỗi khi dùng `DATABASE_URL` (port 6543)

→ Đổi `prisma.config.ts` sang `env("DIRECT_URL")`.

### Seed / app báo `PrismaClient` needs valid options

→ Cài `@prisma/adapter-pg` và `pg`, dùng `src/config/prisma.js` như mục 4.

### `SSL certificate` / `P1010` denied access

→ Thêm vào adapter (chỉ khi dev, không khuyến nghị production):

```js
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

### Schema team khác nhau

```bash
npx prisma migrate status
git pull
npm run db:migrate
```

---

## Tóm tắt một dòng

**Prisma 7 + Supabase = `prisma.config.ts` (DIRECT_URL) + schema không có `url` + PrismaClient dùng adapter pg (DATABASE_URL pooler) + migrate/seed chạy trong `backend/`.**

Team dùng chung DB bằng cách **cùng một Supabase project** và **chia sẻ `.env` an toàn** hoặc **mời member vào Supabase**, đồng bộ schema qua **Git migrations** + `npm run db:migrate`.

---

*Tài liệu tạo: tháng 5/2026 — Horse Racing Prediction PRM393*
