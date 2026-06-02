CREATE TYPE "HorseStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "Horse" (
    "horseId" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "sex" TEXT,
    "color" TEXT,
    "status" "HorseStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "reviewedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Horse_pkey" PRIMARY KEY ("horseId")
);

CREATE TABLE "RaceEntry" (
    "entryId" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "horseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceEntry_pkey" PRIMARY KEY ("entryId")
);

CREATE TABLE "RaceResult" (
    "resultId" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "horseId" INTEGER NOT NULL,
    "finishPosition" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("resultId")
);

CREATE INDEX "Horse_ownerId_idx" ON "Horse"("ownerId");
CREATE INDEX "Horse_status_idx" ON "Horse"("status");
CREATE UNIQUE INDEX "RaceEntry_raceId_horseId_key" ON "RaceEntry"("raceId", "horseId");
CREATE INDEX "RaceEntry_horseId_idx" ON "RaceEntry"("horseId");
CREATE UNIQUE INDEX "RaceResult_raceId_horseId_key" ON "RaceResult"("raceId", "horseId");
CREATE INDEX "RaceResult_horseId_idx" ON "RaceResult"("horseId");

ALTER TABLE "Horse" ADD CONSTRAINT "Horse_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Horse" ADD CONSTRAINT "Horse_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("horseId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RaceResult" ADD CONSTRAINT "RaceResult_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("horseId") ON DELETE RESTRICT ON UPDATE CASCADE;
