# backend/Dockerfile

# Prisma + bcrypt thường ổn định hơn trên Debian-slim so với Alpine (musl)
<<<<<<< Updated upstream
FROM node:20-bookworm-slim
=======
FROM node:22-bookworm-slim

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
>>>>>>> Stashed changes

WORKDIR /app

# 3. Sao chép các tệp định nghĩa thư viện vào trước để tận dụng bộ nhớ đệm Layer Cache của Docker
COPY package*.json ./

# 4. Cài đặt các thư viện phụ thuộc (Dependencies) được khai báo trong package.json
RUN npm ci

# 5. Sao chép toàn bộ mã nguồn của ứng dụng vào bên trong Container
COPY . .

# 6. Prisma generate chỉ cần URL hợp lệ lúc build (.env bị .dockerignore). Runtime dùng env_file từ compose.
ARG DIRECT_URL=postgresql://postgres:12345@postgres_db:5432/horse_racing
ENV DIRECT_URL=$DIRECT_URL
RUN npx prisma generate

# 7. Khai báo mở cổng mạng nội bộ 3000 để Express có thể đón nhận các Request gửi tới
EXPOSE 3000

# 8. Lệnh mặc định để khởi động máy chủ Express Backend khi Container kích hoạt
CMD ["npm", "start"]