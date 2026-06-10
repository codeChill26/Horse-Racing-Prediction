const cron = require('node-cron');
const walletService = require('./wallet');

const EVERY_MONDAY_0000 = '0 0 * * 1';

function startWeeklyBonusJob() {
  const job = cron.schedule(EVERY_MONDAY_0000, async () => {
    console.log('[SCHEDULER] Running weekly bonus job...');
    try {
      const result = await walletService.creditWeeklyBonus();
      console.log(
        `[SCHEDULER] Weekly bonus complete: ${result.credited} credited, ${result.skipped} skipped, ${result.total} total spectators`
      );
    } catch (err) {
      console.error('[SCHEDULER] Weekly bonus failed:', err.message);
    }
  });

  console.log('[SCHEDULER] Weekly bonus cron-job registered: every Monday 00:00');
  return job;
}

function startScheduler() {
  const jobs = [];
  jobs.push(startWeeklyBonusJob());
  return jobs;
}

module.exports = { startScheduler, startWeeklyBonusJob };
