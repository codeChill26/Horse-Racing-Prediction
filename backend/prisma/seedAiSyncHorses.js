// backend/prisma/seedAiSyncHorses.js
//
// Seed để ĐỒNG BỘ jockey_winrate của AI Prediction Engine (Agent 1) với DB thật.
// Vấn đề gốc: aiPrediction.js tra winrate của jockey bằng cách khớp CHÍNH XÁC
// RaceEntry.jockey.fullName với bảng jockey_winrate đã học trong model.pkl (tên
// jockey Anh/Ireland thật, ví dụ "R Walsh"). App chưa từng có jockey nào trùng
// tên -> mọi dự đoán đều rơi về jockey_global (mức trung bình chung), coi như
// chưa dùng được jockey_winrate thật.
//
// Script này thêm:
//   1) 5 ngựa HOÀN TOÀN MỚI — tự sáng tác, chưa có lịch sử đua, chưa gán jockey.
//   2) 5 ngựa LẤY TỪ tập dữ liệu train của AI (docs/horseracing_dataset), giữ
//      nguyên OR/RPR/tuổi thật, và gán ĐÚNG jockey thật đã từng cưỡi con ngựa đó
//      trong dataset (chọn jockey có mẫu lớn, n>=1500 lượt cưỡi, để việc khớp
//      tên có ý nghĩa thống kê thật). 5 ngựa này được duyệt (APPROVED) thẳng
//      vào 1 race SCHEDULED đang mở đăng ký để kiểm chứng ngay qua AI odds.
//
// birthYear đặt sao cho tuổi HIỆN TẠI (2026) = tuổi trong dataset, để bộ 3
// (OR, RPR, age) vẫn là một hồ sơ đua hợp lệ mà model từng thấy — cùng quy ước
// với seedHorses.js.
//
// Kiểm chứng sau khi chạy:
//   GET /api/admin/races/2/ai-odds  (adminOnly) -> 5 entry "dataset" sẽ có
//   jockeyStrength/winProbability tính từ jockey_winrate THẬT, không còn là
//   mức trung bình chung.
//
// Chạy:  node prisma/seedAiSyncHorses.js   (cần DATABASE_URL trong .env / môi trường)

require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');

const DEV_PASSWORD = 'password123';
const OWNER_EMAIL = 'owner@local.test'; // HORSE_OWNER thật duy nhất hiện có trong DB
const TARGET_RACE_ID = 2; // "Chặng 1: Khởi động" - SCHEDULED, còn mở đăng ký, 0/8 entries
const CURRENT_YEAR = 2026;

// ---- Nhóm 1: 5 ngựa HOÀN TOÀN MỚI (tự sáng tác, không liên quan dataset) ----
// [tên, OR, RPR, tuổi-2026, giới tính, màu]
const NEW_HORSES = [
  ['Hỏa Long', 98, 101, 4, 'Stallion', 'Chestnut'],
  ['Sấm Sét', 92, 95, 3, 'Gelding', 'Black'],
  ['Bạch Vân', 105, 108, 5, 'Mare', 'Grey'],
  ['Tuyết Sơn', 88, 90, 3, 'Stallion', 'White'],
  ['Hắc Phong', 100, 104, 4, 'Gelding', 'Black'],
];

// ---- Nhóm 2: 5 ngựa CÓ THẬT lấy từ dataset, kèm ĐÚNG jockey đã cưỡi nó ----
// [tên ngựa, OR, RPR, tuổi-2026, giới tính, màu, tên jockey (khớp model.pkl), email jockey, weightLb demo, saddle]
const REAL_HORSES = [
  ['Vautour', 176, 175, 7, 'Gelding', 'Bay', 'R Walsh', 'r.walsh@local.test', 128, 1],
  ['Cracksman', 130, 119, 4, 'Stallion', 'Bay', 'Frankie Dettori', 'frankie.dettori@local.test', 126, 2],
  ['Sprinter Sacre', 175, 171, 10, 'Gelding', 'Bay', 'Nico de Boinville', 'nico.deboinville@local.test', 132, 3],
  ['Faugheen', 172, 171, 9, 'Gelding', 'Bay', 'Paul Townend', 'paul.townend@local.test', 130, 4],
  ['Ghaiyyath', 127, 126, 5, 'Stallion', 'Bay', 'William Buick', 'william.buick@local.test', 124, 5],
];

async function getOwnerId() {
  const owner = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
    select: { userId: true, role: { select: { code: true } } },
  });
  if (!owner) throw new Error(`Không tìm thấy owner ${OWNER_EMAIL}. Seed user trước.`);
  if (owner.role.code !== 'HORSE_OWNER') {
    throw new Error(`${OWNER_EMAIL} không phải HORSE_OWNER (đang là ${owner.role.code}).`);
  }
  return owner.userId;
}

async function saveHorse(ownerId, [name, or, rpr, age, sex, color]) {
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

  const existing = await prisma.horse.findFirst({ where: { name }, select: { horseId: true } });
  return existing
    ? prisma.horse.update({ where: { horseId: existing.horseId }, data: { ownerId, ...data } })
    : prisma.horse.create({ data: { ownerId, name, ...data } });
}

async function saveJockey(fullName, email) {
  const roleJockey = await prisma.role.findUnique({ where: { code: 'JOCKEY' } });
  if (!roleJockey) throw new Error('Role JOCKEY chưa được seed. Chạy npm run db:seed trước.');

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: { fullName, roleId: roleJockey.roleId, isActive: true },
    create: {
      email,
      passwordHash,
      fullName,
      roleId: roleJockey.roleId,
      isActive: true,
      isProfileComplete: true,
    },
  });
}

// Mô phỏng ĐÚNG hiệu ứng của raceEntriesService.reviewEntry() khi APPROVED:
// chốt snapshot rating tại thời điểm duyệt, set reviewedBy/reviewedAt.
async function saveEntry(raceId, horse, jockeyId, reviewerId, weightLb, saddleNumber) {
  const existing = await prisma.raceEntry.findFirst({
    where: { raceId, horseId: horse.horseId },
    select: { entryId: true },
  });
  const data = {
    raceId,
    horseId: horse.horseId,
    jockeyId,
    status: 'APPROVED',
    reviewedById: reviewerId,
    reviewedAt: new Date(),
    weightLb,
    saddleNumber,
    officialRatingSnapshot: horse.officialRating,
    racingPostRatingSnapshot: horse.racingPostRating,
  };

  return existing
    ? prisma.raceEntry.update({ where: { entryId: existing.entryId }, data })
    : prisma.raceEntry.create({ data });
}

async function main() {
  const ownerId = await getOwnerId();

  const race = await prisma.race.findUnique({
    where: { raceId: TARGET_RACE_ID },
    select: { raceId: true, name: true, maxEntries: true },
  });
  if (!race) throw new Error(`Không tìm thấy race #${TARGET_RACE_ID} để gán entry demo.`);

  const admin = await prisma.user.findFirst({
    where: { role: { code: 'ADMIN' } },
    select: { userId: true },
  });
  if (!admin) throw new Error('Không tìm thấy user ADMIN nào trong DB.');

  console.log(`\n=== 1) 5 ngựa HOÀN TOÀN MỚI (chủ ${OWNER_EMAIL}) ===`);
  for (const h of NEW_HORSES) {
    const horse = await saveHorse(ownerId, h);
    console.log(`  [MỚI]     ${h[0].padEnd(16)} OR=${h[1]} RPR=${h[2]} -> horseId=${horse.horseId}`);
  }

  console.log(`\n=== 2) 5 ngựa THẬT từ dataset + jockey thật -> đăng ký vào race #${race.raceId} (${race.name}) ===`);
  for (const [name, or, rpr, age, sex, color, jockeyName, jockeyEmail, weightLb, saddle] of REAL_HORSES) {
    const horse = await saveHorse(ownerId, [name, or, rpr, age, sex, color]);
    const jockey = await saveJockey(jockeyName, jockeyEmail);
    const entry = await saveEntry(race.raceId, horse, jockey.userId, admin.userId, weightLb, saddle);
    console.log(
      `  [DATASET] ${name.padEnd(16)} OR=${or} RPR=${rpr} jockey="${jockeyName}" ` +
        `-> horseId=${horse.horseId} jockeyId=${jockey.userId} entryId=${entry.entryId}`
    );
  }

  const totalHorses = await prisma.horse.count();
  const totalJockeys = await prisma.user.count({ where: { role: { code: 'JOCKEY' } } });
  console.log(`\nXong. Tổng ngựa trong DB: ${totalHorses} | Tổng jockey: ${totalJockeys}`);
  console.log(
    `Kiểm chứng: GET /api/admin/races/${race.raceId}/ai-odds (adminOnly) -> 5 entry dataset ` +
      `sẽ dùng jockey_winrate THẬT thay vì mức trung bình chung.`
  );
}

main()
  .catch((e) => {
    console.error('Lỗi seed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
