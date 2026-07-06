// backend/prisma/seedHorses.js
//
// Seed thêm ngựa demo cho AI Prediction Engine, RẢI cho nhiều chủ (HORSE_OWNER):
//   - 5 con CÓ THẬT lấy từ dataset lịch sử (docs/horseracing_dataset), giữ nguyên
//     OR/RPR/tuổi thật -> jockey/trainer khớp bảng winrate model đã học.
//   - 2 con MỚI (mùa 2026) do app tự tạo.
//
// birthYear đặt sao cho tuổi HIỆN TẠI (2026) = tuổi trong dataset, để bộ 3
// (OR, RPR, age) vẫn là một hồ sơ đua hợp lệ mà model từng thấy.
//
// Mỗi con gán 1 chủ cụ thể qua ownerEmail (không hardcode 1 chủ như bản trước).
// Vì 7 con này có thể đã tồn tại dưới chủ cũ, ta TÌM THEO TÊN rồi cập nhật ownerId
// (thay vì upsert theo (ownerId,name) — sẽ tạo bản sao khi đổi chủ).
//
// Chạy:  node prisma/seedHorses.js   (cần DATABASE_URL trong .env / môi trường)

require('dotenv').config();
const prisma = require('../src/config/prisma');

const CURRENT_YEAR = 2026;

// Rải 7 con cho 3 HORSE_OWNER. [tên, OR, RPR, tuổi-2026, giới tính, màu, làMới2026]
const OWNER_HORSES = [
  {
    email: 'owner@example.com',
    horses: [
      ['Altior', 175, 173, 10, 'Gelding', 'Bay', false],
      ['Al Boum Photo', 175, 176, 8, 'Gelding', 'Bay', false],
      ['Min', 170, 173, 9, 'Gelding', 'Bay', false],
    ],
  },
  {
    email: 'owner.tran@example.com',
    horses: [
      ['Paisley Park', 169, 162, 8, 'Gelding', 'Bay', false],
      ['Delta Work', 169, 173, 7, 'Gelding', 'Brown', false],
    ],
  },
  {
    email: 'ngua@example.com',
    horses: [
      ['Thần Mã', 122, 126, 5, 'Stallion', 'Chestnut', true],
      ['Phi Vân', 110, 112, 4, 'Mare', 'Grey', true],
    ],
  },
];

async function saveHorse(ownerId, [name, or, rpr, age, sex, color, isNew]) {
  const birthYear = CURRENT_YEAR - age;
  const data = {
    breed: 'Thoroughbred',
    birthYear,
    sex,
    color,
    officialRating: or,
    racingPostRating: rpr,
    status: 'APPROVED', // duyệt sẵn để dùng ngay trong demo
    approvedAt: new Date(),
  };

  // Tìm theo tên (các tên này là duy nhất trong DB) để DI CHUYỂN chủ nếu đã tồn tại.
  const existing = await prisma.horse.findFirst({ where: { name }, select: { horseId: true } });
  const horse = existing
    ? await prisma.horse.update({ where: { horseId: existing.horseId }, data: { ownerId, ...data } })
    : await prisma.horse.create({ data: { ownerId, name, ...data } });

  console.log(
    `  ${isNew ? '[MỚI 2026]' : '[LỊCH SỬ] '} ${name.padEnd(16)} ` +
      `OR=${or} RPR=${rpr} -> horseId=${horse.horseId} (ownerId=${ownerId})`
  );
}

async function main() {
  for (const grp of OWNER_HORSES) {
    const owner = await prisma.user.findUnique({
      where: { email: grp.email },
      select: { userId: true, role: { select: { code: true } } },
    });
    if (!owner) throw new Error(`Không tìm thấy owner ${grp.email}. Seed user trước.`);
    if (owner.role.code !== 'HORSE_OWNER') {
      throw new Error(`${grp.email} không phải HORSE_OWNER (đang là ${owner.role.code}).`);
    }
    console.log(`\nChủ ${grp.email} (userId=${owner.userId}):`);
    for (const h of grp.horses) await saveHorse(owner.userId, h);
  }

  const total = await prisma.horse.count();
  console.log(`\nXong. Tổng số ngựa trong DB: ${total}`);
}

main()
  .catch((e) => {
    console.error('Lỗi seed ngựa:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
