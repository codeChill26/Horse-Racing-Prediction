# backend/Dockerfile

# Prisma + bcrypt thường ổn định hơn trên Debian-slim so với Alpine (musl)
FROM node:22-bookworm-slim

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Sao chép các tệp định nghĩa thư viện vào trước để tận dụng bộ nhớ đệm Layer Cache của Docker
COPY package*.json ./

# 4. Cài đặt các thư viện phụ thuộc (Dependencies) được khai báo trong package.json
RUN npm ci

# 5. Sao chép toàn bộ mã nguồn của ứng dụng vào bên trong Container
COPY . .

# 6. Prisma generate chỉ cần URL hợp lệ lúc build (.env bị .dockerignore).
# Runtime: DATABASE_URL / DIRECT_URL từ backend/.env (Supabase) qua docker-compose env_file.
ARG DIRECT_URL=postgresql://user:pass@localhost:5432/postgres
ENV DIRECT_URL=$DIRECT_URL

# 7. Khai báo mở cổng mạng nội bộ 3000 để Express có thể đón nhận các Request gửi tới
EXPOSE 3000

# 8. Lệnh mặc định để khởi động máy chủ Express Backend khi Container kích hoạt
CMD ["npm", "start"]