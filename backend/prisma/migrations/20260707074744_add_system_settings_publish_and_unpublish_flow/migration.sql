/*
  Warnings:

  - The `status` column on the `JockeyInvitation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[ownerId,name]` on the table `Horse` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RaceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'PENDING_RESULT', 'PAUSED', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionMatchStatus" AS ENUM ('PENDING', 'AUTO_MATCHED', 'CONFLICTED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('PENDING', 'WON', 'PARTIAL_WON', 'LOST', 'REFUNDED');

-- CreateEnum
CREATE TYPE "BetType" AS ENUM ('WIN', 'PLACE', 'SHOW', 'QUINELLA', 'EXACTA');

-- AlterEnum
ALTER TYPE "HorseStatus" ADD VALUE 'INACTIVE';

-- DropForeignKey
ALTER TABLE "WalletTransaction" DROP CONSTRAINT "WalletTransaction_walletId_fkey";

-- DropIndex
DROP INDEX "JockeyInvitation_status_idx";

-- AlterTable
ALTER TABLE "Horse" ADD COLUMN     "birthYear" INTEGER,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "JockeyInvitation" DROP COLUMN "status",
ADD COLUMN     "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "maxEntries" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "refereeAId" INTEGER,
ADD COLUMN     "refereeBId" INTEGER,
ADD COLUMN     "registrationDeadline" TIMESTAMP(3),
ADD COLUMN     "status" "RaceStatus" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "RaceEntry" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "WalletTransaction" ALTER COLUMN "walletId" DROP NOT NULL;

-- DropEnum
DROP TYPE "JockeyInvitationStatus";

-- CreateTable
CREATE TABLE "Odds" (
    "oddsId" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,
    "horseStrength" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "jockeyStrength" DECIMAL(65,30),
    "totalStrength" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "oddsRaw" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "oddsFinal" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Odds_pkey" PRIMARY KEY ("oddsId")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "predictionId" SERIAL NOT NULL,
    "spectatorId" INTEGER NOT NULL,
    "raceId" INTEGER NOT NULL,
    "betType" "BetType" NOT NULL,
    "entryId1" INTEGER NOT NULL,
    "entryId2" INTEGER,
    "betAmount" INTEGER NOT NULL,
    "lockedOdds" DECIMAL(65,30) NOT NULL DEFAULT 1.0,
    "status" "PredictionStatus" NOT NULL DEFAULT 'PENDING',
    "payout" INTEGER,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("predictionId")
);

-- CreateTable
CREATE TABLE "RefereeSubmission" (
    "submissionId" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "refereeId" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawResults" JSONB NOT NULL,

    CONSTRAINT "RefereeSubmission_pkey" PRIMARY KEY ("submissionId")
);

-- CreateTable
CREATE TABLE "OfficialRaceResult" (
    "officialResultId" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "matchStatus" "SubmissionMatchStatus" NOT NULL DEFAULT 'PENDING',
    "finalResults" JSONB NOT NULL,
    "resolvedById" INTEGER,
    "resolveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialRaceResult_pkey" PRIMARY KEY ("officialResultId")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Odds_entryId_key" ON "Odds"("entryId");

-- CreateIndex
CREATE INDEX "Odds_raceId_idx" ON "Odds"("raceId");

-- CreateIndex
CREATE INDEX "Prediction_spectatorId_idx" ON "Prediction"("spectatorId");

-- CreateIndex
CREATE INDEX "Prediction_raceId_idx" ON "Prediction"("raceId");

-- CreateIndex
CREATE INDEX "Prediction_status_idx" ON "Prediction"("status");

-- CreateIndex
CREATE INDEX "RefereeSubmission_raceId_idx" ON "RefereeSubmission"("raceId");

-- CreateIndex
CREATE UNIQUE INDEX "RefereeSubmission_raceId_refereeId_key" ON "RefereeSubmission"("raceId", "refereeId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialRaceResult_raceId_key" ON "OfficialRaceResult"("raceId");

-- CreateIndex
CREATE UNIQUE INDEX "Horse_ownerId_name_key" ON "Horse"("ownerId", "name");

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "PointWallet"("walletId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_refereeAId_fkey" FOREIGN KEY ("refereeAId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_refereeBId_fkey" FOREIGN KEY ("refereeBId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odds" ADD CONSTRAINT "Odds_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odds" ADD CONSTRAINT "Odds_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "RaceEntry"("entryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_spectatorId_fkey" FOREIGN KEY ("spectatorId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_entryId1_fkey" FOREIGN KEY ("entryId1") REFERENCES "RaceEntry"("entryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_entryId2_fkey" FOREIGN KEY ("entryId2") REFERENCES "RaceEntry"("entryId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeSubmission" ADD CONSTRAINT "RefereeSubmission_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefereeSubmission" ADD CONSTRAINT "RefereeSubmission_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialRaceResult" ADD CONSTRAINT "OfficialRaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;
