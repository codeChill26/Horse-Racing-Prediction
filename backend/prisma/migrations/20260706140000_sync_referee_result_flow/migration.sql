-- Sync luồng nhập kết quả trọng tài (blind double-entry) vào Supabase DB.
-- Schema.prisma có sẵn nhưng DB chưa từng được tạo -> chỉ THÊM MỚI, không đụng data.
-- CỐ Ý bỏ qua 2 drift riêng (JockeyInvitation.updatedAt NOT NULL trên bảng có data,
-- và DROP INDEX JockeyInvitation_*) mà `prisma db push` sẽ làm — để tránh hỏng data.
-- Tất cả idempotent (chạy lại an toàn).

-- 1) Enum trạng thái đối chiếu kết quả (OfficialRaceResult.matchStatus)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubmissionMatchStatus') THEN
    CREATE TYPE "SubmissionMatchStatus" AS ENUM ('PENDING', 'AUTO_MATCHED', 'CONFLICTED', 'RESOLVED');
  END IF;
END $$;

-- 2) Bổ sung giá trị enum RaceStatus cho luồng trọng tài (append, an toàn)
ALTER TYPE "RaceStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "RaceStatus" ADD VALUE IF NOT EXISTS 'PENDING_RESULT';
ALTER TYPE "RaceStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- 3) 2 cột trọng tài trên Race
ALTER TABLE "Race" ADD COLUMN IF NOT EXISTS "refereeAId" INTEGER;
ALTER TABLE "Race" ADD COLUMN IF NOT EXISTS "refereeBId" INTEGER;

-- 4) Bảng RefereeSubmission (append-only, mỗi trọng tài nộp 1 lần/trận)
CREATE TABLE IF NOT EXISTS "RefereeSubmission" (
  "submissionId" SERIAL NOT NULL,
  "raceId"       INTEGER NOT NULL,
  "refereeId"    INTEGER NOT NULL,
  "submittedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rawResults"   JSONB NOT NULL,
  CONSTRAINT "RefereeSubmission_pkey" PRIMARY KEY ("submissionId")
);
CREATE INDEX IF NOT EXISTS "RefereeSubmission_raceId_idx" ON "RefereeSubmission"("raceId");
CREATE UNIQUE INDEX IF NOT EXISTS "RefereeSubmission_raceId_refereeId_key" ON "RefereeSubmission"("raceId", "refereeId");

-- 5) Bảng OfficialRaceResult (1 trận 1 bảng kết quả chính thức)
CREATE TABLE IF NOT EXISTS "OfficialRaceResult" (
  "officialResultId" SERIAL NOT NULL,
  "raceId"           INTEGER NOT NULL,
  "matchStatus"      "SubmissionMatchStatus" NOT NULL DEFAULT 'PENDING',
  "finalResults"     JSONB NOT NULL,
  "resolvedById"     INTEGER,
  "resolveReason"    TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfficialRaceResult_pkey" PRIMARY KEY ("officialResultId")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OfficialRaceResult_raceId_key" ON "OfficialRaceResult"("raceId");

-- 6) Khóa ngoại (guard tránh trùng khi chạy lại)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Race_refereeAId_fkey') THEN
    ALTER TABLE "Race" ADD CONSTRAINT "Race_refereeAId_fkey" FOREIGN KEY ("refereeAId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Race_refereeBId_fkey') THEN
    ALTER TABLE "Race" ADD CONSTRAINT "Race_refereeBId_fkey" FOREIGN KEY ("refereeBId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RefereeSubmission_raceId_fkey') THEN
    ALTER TABLE "RefereeSubmission" ADD CONSTRAINT "RefereeSubmission_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RefereeSubmission_refereeId_fkey') THEN
    ALTER TABLE "RefereeSubmission" ADD CONSTRAINT "RefereeSubmission_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OfficialRaceResult_raceId_fkey') THEN
    ALTER TABLE "OfficialRaceResult" ADD CONSTRAINT "OfficialRaceResult_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("raceId") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
