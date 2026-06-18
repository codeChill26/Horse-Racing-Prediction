-- Repair Horse columns if an older/partial schema was applied
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "breed" TEXT;
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "sex" TEXT;
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "color" TEXT;
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "reviewedById" INTEGER;
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Jockey invitation flow
CREATE TYPE "JockeyInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

CREATE TABLE "JockeyInvitation" (
    "invitationId" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "jockeyId" INTEGER NOT NULL,
    "horseId" INTEGER NOT NULL,
    "raceId" INTEGER NOT NULL,
    "status" "JockeyInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JockeyInvitation_pkey" PRIMARY KEY ("invitationId")
);

CREATE UNIQUE INDEX "JockeyInvitation_jockeyId_horseId_raceId_key"
    ON "JockeyInvitation"("jockeyId", "horseId", "raceId");
CREATE INDEX "JockeyInvitation_ownerId_idx" ON "JockeyInvitation"("ownerId");
CREATE INDEX "JockeyInvitation_jockeyId_idx" ON "JockeyInvitation"("jockeyId");
CREATE INDEX "JockeyInvitation_status_idx" ON "JockeyInvitation"("status");

ALTER TABLE "JockeyInvitation" ADD CONSTRAINT "JockeyInvitation_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JockeyInvitation" ADD CONSTRAINT "JockeyInvitation_jockeyId_fkey"
    FOREIGN KEY ("jockeyId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JockeyInvitation" ADD CONSTRAINT "JockeyInvitation_horseId_fkey"
    FOREIGN KEY ("horseId") REFERENCES "Horse"("horseId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JockeyInvitation" ADD CONSTRAINT "JockeyInvitation_raceId_fkey"
    FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One jockey per race (when jockeyId is set)
CREATE UNIQUE INDEX IF NOT EXISTS "RaceEntry_raceId_jockeyId_key"
    ON "RaceEntry"("raceId", "jockeyId");
