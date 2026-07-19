const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.race.findUnique({
    where: { raceId: 23 },
    include: {
      entries: { include: { horse: true, jockey: true } },
      results: true,
      officialRaceResult: true
    }
  });
  console.log('race.status =', r.status);
  console.log('entries count =', r.entries.length);
  console.log('results count =', r.results.length);
  console.log('officialResult.matchStatus =', r.officialRaceResult?.matchStatus);
  console.log('finalResults =', JSON.stringify(r.officialRaceResult?.finalResults));
  console.log('--- entries ---');
  r.entries.forEach(e => console.log(JSON.stringify({ entryId: e.entryId, horseId: e.horseId, horseName: e.horse?.name, jockeyName: e.jockey?.fullName })));
  console.log('--- results ---');
  r.results.forEach(x => console.log(JSON.stringify({ horseId: x.horseId, finishPosition: x.finishPosition })));
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });