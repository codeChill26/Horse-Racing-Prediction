const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.race.count();
  console.log('Total races:', count);
  const races = await prisma.race.findMany();
  console.log('Races:', races.map(r => r.raceId));
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
