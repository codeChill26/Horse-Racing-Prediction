-- Snapshot OR/RPR của ngựa tại thời điểm vào đua (chốt lúc duyệt entry).
-- Horse.officialRating/racingPostRating là giá trị hiện tại (bị cập nhật sau mỗi đua);
-- snapshot giữ lịch sử để không làm sai lệch các lượt đua đã qua.
-- IF NOT EXISTS: idempotent, an toàn khi lịch sử migration lệch với DB Supabase.
ALTER TABLE "RaceEntry" ADD COLUMN IF NOT EXISTS "officialRatingSnapshot" INTEGER;
ALTER TABLE "RaceEntry" ADD COLUMN IF NOT EXISTS "racingPostRatingSnapshot" INTEGER;
