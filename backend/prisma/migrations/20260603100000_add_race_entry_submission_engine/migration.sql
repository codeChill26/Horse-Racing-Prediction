CREATE TYPE "RaceEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Race"
ADD COLUMN "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "registrationOpenedAt" TIMESTAMP(3),
ADD COLUMN "registrationClosedAt" TIMESTAMP(3);

ALTER TABLE "RaceEntry"
ADD COLUMN "jockeyId" INTEGER,
ADD COLUMN "status" "RaceEntryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "reviewedById" INTEGER,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "RaceEntry_jockeyId_idx" ON "RaceEntry"("jockeyId");
CREATE INDEX "RaceEntry_status_idx" ON "RaceEntry"("status");

ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_jockeyId_fkey" FOREIGN KEY ("jockeyId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
