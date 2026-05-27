# backend/Dockerfile

# Prisma + bcrypt thường ổn định hơn trên Debian-slim so với Alpine (musl)
FROM node:20-bookworm-slim

# 2. Tạo và chỉ định thư mục làm việc mặc định bên trong Container
WORKDIR /app

# 3. Sao chép các tệp định nghĩa thư viện vào trước để tận dụng bộ nhớ đệm Layer Cache của Docker
COPY package*.json ./

# 4. Cài đặt các thư viện phụ thuộc (Dependencies) được khai báo trong package.json
RUN npm ci

# 5. Sao chép toàn bộ mã nguồn của ứng dụng vào bên trong Container
COPY . .

# 6. CRITICAL (BẮT BUỘC): Tạo mã nguồn Prisma Client tương thích trực tiếp với môi trường Linux của Container.
# Điều này khắc phục triệt để lỗi lệch Engine (PrismaClientInitializationError) khi chạy trên máy cá nhân Windows.
RUN npx prisma generate

# 7. Khai báo mở cổng mạng nội bộ 3000 để Express có thể đón nhận các Request gửi tới
EXPOSE 3000

# 8. Lệnh mặc định để khởi động máy chủ Express Backend khi Container kích hoạt
CMD ["npm", "start"]