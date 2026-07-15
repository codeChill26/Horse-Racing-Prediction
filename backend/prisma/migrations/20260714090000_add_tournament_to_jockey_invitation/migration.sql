-- Add tournamentId to JockeyInvitation for tournament-based invites
-- Step 1: First add the column WITHOUT the FK constraint
ALTER TABLE "JockeyInvitation" ADD COLUMN IF NOT EXISTS "tournamentId" INTEGER;

-- Step 2: Update existing records with correct tournamentId from their race's tournament
UPDATE "JockeyInvitation" ji
SET "tournamentId" = r."tournamentId"
FROM "Race" r
WHERE ji."raceId" = r."raceId"
AND ji."tournamentId" IS NULL;

-- Step 3: Set any remaining nulls to tournamentId 1 (default)
UPDATE "JockeyInvitation"
SET "tournamentId" = 1
WHERE "tournamentId" IS NULL;

-- Step 4: Now make it NOT NULL
ALTER TABLE "JockeyInvitation" ALTER COLUMN "tournamentId" SET NOT NULL;

-- Make raceId nullable (invitations can now be tournament-wide)
ALTER TABLE "JockeyInvitation" ALTER COLUMN "raceId" DROP NOT NULL;

-- Add foreign key constraint for tournament
ALTER TABLE "JockeyInvitation" ADD CONSTRAINT "JockeyInvitation_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("tournamentId") ON DELETE RESTRICT;

-- Drop old unique constraint
ALTER TABLE "JockeyInvitation" DROP CONSTRAINT IF EXISTS "JockeyInvitation_jockeyId_horseId_raceId_key";

-- Add new unique constraint (per tournament instead of per race)
ALTER TABLE "JockeyInvitation" ADD CONSTRAINT "JockeyInvitation_jockeyId_horseId_tournamentId_key"
  UNIQUE ("jockeyId", "horseId", "tournamentId");

-- Create index
CREATE INDEX IF NOT EXISTS "JockeyInvitation_tournamentId_idx" ON "JockeyInvitation"("tournamentId");