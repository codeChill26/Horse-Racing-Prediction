-- Cột phục vụ AI Prediction Engine (ai/train.py): OR/RPR trên Horse, weightLb/saddleNumber trên RaceEntry.
-- Nullable vì đây là dữ liệu admin/referee nhập dần, model tự impute khi thiếu.
ALTER TABLE "Horse" ADD COLUMN "officialRating" INTEGER;
ALTER TABLE "Horse" ADD COLUMN "racingPostRating" INTEGER;
ALTER TABLE "RaceEntry" ADD COLUMN "weightLb" INTEGER;
ALTER TABLE "RaceEntry" ADD COLUMN "saddleNumber" INTEGER;
