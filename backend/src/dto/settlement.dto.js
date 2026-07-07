// backend/src/dto/settlement.dto.js

class SettlementResultDto {
  constructor(report) {
    this.raceId = report.raceId;
    this.status = report.status;
    this.financialSummary = {
      totalPoolBet: report.totalPool,
      houseMarginCollected: report.houseMargin,
      netPoolForPayout: report.totalPool - report.houseMargin,
      actualTotalPayout: report.actualTotalPayout,
      treasureBalanceChange: report.treasureBalanceChange
    };
    this.winnersCount = Object.keys(report.walletIncrements).length;
    this.publishedAt = report.publishedAt;
  }
}

module.exports = { SettlementResultDto };