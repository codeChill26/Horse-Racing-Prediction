// backend/prisma/seed.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../src/config/prisma');

const DEV_PASSWORD = 'password123';

const DEV_USERS = [
  {
    email: 'admin@local.test',
    fullName: 'Admin Demo',
    phoneNumber: '0900000000',
    roleCode: 'ADMIN',
  },
  {
    email: 'spectator@local.test',
    fullName: 'Spectator Demo',
    phoneNumber: '0900000001',
    roleCode: 'SPECTATOR',
  },
];

async function seedRoles() {
  const roles = [
    { name: 'Horse Owner', code: 'HORSE_OWNER' },
    { name: 'Jockey', code: 'JOCKEY' },
    { name: 'Spectator', code: 'SPECTATOR' },
    { name: 'Race Referee', code: 'RACE_REFEREE' },
    { name: 'Admin', code: 'ADMIN' },
  ];

  console.log('Inserting master data for Roles...');

  for (const role of roles) {
    const seededRole = await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: {
        name: role.name,
        code: role.code,
      },
    });
    console.log(`Seeded role: ${seededRole.code}`);
  }
}

async function seedDevUsers() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  for (const user of DEV_USERS) {
    const role = await prisma.role.findUnique({ where: { code: user.roleCode } });
    if (!role) {
      console.warn(`Skip user ${user.email}: role ${user.roleCode} not found`);
      continue;
    }

    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        isActive: true,
        lockedUntil: null,
      },
      create: {
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        roleId: role.roleId,
        isActive: true,
        isProfileComplete: true,
      },
    });

    if (user.roleCode === 'SPECTATOR') {
      await prisma.pointWallet.upsert({
        where: { userId: created.userId },
        update: {},
        create: {
          userId: created.userId,
          balance: 100,
          isFrozen: 0,
        },
      });
    }

    console.log(`Seeded user: ${user.email} (${user.roleCode}) — password: ${DEV_PASSWORD}`);
  }
}

async function main() {
  console.log('Starting database seeding process...');
  await seedRoles();
  await seedDevUsers();
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error occurred during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
