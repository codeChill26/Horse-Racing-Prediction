-- Align shared Supabase DB with Prisma schema (idempotent)

ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "sex" TEXT;
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Horse" ADD COLUMN IF NOT EXISTS "reviewedById" INTEGER;

ALTER TABLE "Race" ADD COLUMN IF NOT EXISTS "registrationOpen" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Race" ADD COLUMN IF NOT EXISTS "registrationOpenedAt" TIMESTAMP(3);
ALTER TABLE "Race" ADD COLUMN IF NOT EXISTS "registrationClosedAt" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "RaceEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "RaceEntry" ADD COLUMN IF NOT EXISTS "status" "RaceEntryStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "RaceEntry" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "RaceEntry" ADD COLUMN IF NOT EXISTS "reviewedById" INTEGER;
ALTER TABLE "RaceEntry" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "RaceEntry" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "RaceEntry_jockeyId_idx" ON "RaceEntry"("jockeyId");
CREATE INDEX IF NOT EXISTS "RaceEntry_status_idx" ON "RaceEntry"("status");

DO $$ BEGIN
  ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_jockeyId_fkey"
    FOREIGN KEY ("jockeyId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "RaceEntry" ADD CONSTRAINT "RaceEntry_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Horse" ADD CONSTRAINT "Horse_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "RaceEntry_raceId_jockeyId_key"
  ON "RaceEntry"("raceId", "jockeyId");
