// backend/prisma/seed.js
require("dotenv").config();
const prisma = require("../src/config/prisma");

async function main() {
  console.log('Starting database seeding process...');

  // 1. Định nghĩa danh sách các vai trò hệ thống cốt lõi khớp chính xác với tầng DTO và DB
  const roles = [
    { name: 'Horse Owner', code: 'HORSE_OWNER' },
    { name: 'Jockey', code: 'JOCKEY' },
    { name: 'Spectator', code: 'SPECTATOR' },
    { name: 'Race Referee', code: 'RACE_REFEREE' },
    { name: 'Admin', code: 'ADMIN' }
  ];

  console.log('Inserting master data for Roles...');
  
  // 2. Sử dụng vòng lặp kết hợp upsert để tránh trùng lặp dữ liệu nếu chạy lệnh nhiều lần
  for (const role of roles) {
    const seededRole = await prisma.role.upsert({
      where: { code: role.code },
      update: {}, // Nếu đã tồn tại thì bỏ qua, không ghi đè dữ liệu cũ
      create: {
        name: role.name,
        code: role.code
      }
    });
    console.log(`Seeded role: ${seededRole.code}`);
  }

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error occurred during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ngắt kết nối Prisma Client an toàn sau khi hoàn thành tác vụ
    await prisma.$disconnect();
  });