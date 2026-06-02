-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'OPEN', 'ONGOING', 'FINISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Tournament" (
    "tournamentId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "cancelReason" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("tournamentId")
);

-- CreateTable
CREATE TABLE "Race" (
    "raceId" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("raceId")
);

-- CreateIndex
CREATE INDEX "Race_tournamentId_idx" ON "Race"("tournamentId");

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("tournamentId") ON DELETE RESTRICT ON UPDATE CASCADE;
