# Horse Racing Prediction System - Backend Deployment Guide

Tài liệu này hướng dẫn chi tiết cho toàn bộ thành viên trong nhóm (**all team project member**) cách cài đặt, cấu hình và khởi chạy nhanh hệ thống Backend ExpressJS + Prisma + PostgreSQL + Redis Cache bằng môi trường Docker hóa.

---

## 🛠️ Các công cụ yêu cầu cài đặt trước

Mọi người cần đảm bảo máy cá nhân đã cài sẵn:

1. **Docker Desktop** (Bắt buộc phải bật trước khi chạy dự án).
2. **Postman** (Dùng để import collection và thực hiện test API).
3. **Swagger UI** (Đã tích hợp sẵn ở Backend để test nhanh trên trình duyệt).

---

## 🚀 Quy trình 3 bước triển khai nhanh bằng Docker Compose

Mọi người mở cửa sổ Terminal (PowerShell hoặc Git Bash) tại thư mục gốc của dự án (nơi có chứa tệp `docker-compose.yml`) và thực hiện tuần tự các lệnh sau:

### Bước 1: Khởi động hệ thống Container tập trung

Chạy lệnh sau để Docker tự động tải Image, build ứng dụng Express từ `Dockerfile` và kích hoạt ngầm cả 3 dịch vụ (`backend_app`, `postgres_db`, `redis_cache`):

docker-compose up -d --build

### Bước 2: Đồng bộ cấu trúc bảng và khởi tạo dữ liệu mẫu

Sau khi các container đã báo trạng thái Started xanh, chạy lệnh dưới đây để đẩy cấu trúc tệp lược đồ schema.prisma xuống database PostgreSQL cô lập bên trong Docker:

docker exec -it horse_racing_backend npx prisma migrate deploy

### Bước 3: Nạp dữ liệu Master Data (Seed)

Chạy lệnh này để kích hoạt tệp prisma/seed.js, tự động nạp sẵn các vai trò HORSE_OWNER, JOCKEY, và SPECTATOR vào hệ thống:

docker exec -it horse_racing_backend npx prisma db seed

### Thông tin cấu hình Endpoints

### Swagger UI

Sau khi chạy Docker Compose (backend port 3000), mở:

http://localhost:3000/api-docs

Lưu ý: Các API cần đăng nhập sẽ yêu cầu header `Authorization: Bearer <accessToken>`.

POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET /api/auth/profile
PUT /api/auth/profile

---

## 🔁 CI/CD với GitHub Actions + Vercel + Render

Workflow đã được thêm tại:

`/home/runner/work/Horse-Racing-Prediction/Horse-Racing-Prediction/.github/workflows/ci-cd.yml`

### Luồng chạy

- **Pull Request vào `main`**: chạy check frontend + backend.
- **Push vào `main`**: chạy check frontend + backend, sau đó deploy.

### Các bước kiểm tra (CI)

- **Frontend**
  - `npm ci`
  - `npm run lint`
  - `npm run build`
- **Backend**
  - `npm ci`
  - `npx prisma generate`
  - `npm test`

### Các bước deploy (CD)

- Deploy FE qua **Vercel Deploy Hook**
- Deploy BE qua **Render Deploy Hook**

### Secrets cần thêm trong GitHub repository

Vào **Settings → Secrets and variables → Actions** và tạo:

- `VERCEL_DEPLOY_HOOK_URL`: URL deploy hook của project frontend trên Vercel.
- `RENDER_DEPLOY_HOOK_URL`: URL deploy hook của service backend trên Render.
