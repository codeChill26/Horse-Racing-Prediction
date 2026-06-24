const prisma = require('../config/prisma');

class RefereeService {
  /**
   * Kích hoạt trận đấu
   */
  async startRace(raceId, refereeUserId) {
    return await prisma.$transaction(async (tx) => {
      const race = await tx.race.findUnique({
        where: { raceId: parseInt(raceId) }
      });

    console.log('====================');
    console.log('raceId =', raceId);
    console.log('refereeUserId =', refereeUserId);
    console.log('typeof refereeUserId =', typeof refereeUserId);

    console.log('race.refereeAId =', race?.refereeAId);
    console.log('race.refereeBId =', race?.refereeBId);
    console.log('typeof race.refereeAId =', typeof race?.refereeAId);
    console.log('====================');

      if (!race) throw new Error('Trận đấu không tồn tại trong hệ thống.');
      if (race.status !== 'SCHEDULED') throw new Error('Trận đấu chỉ có thể bắt đầu khi ở trạng thái SCHEDULED.');
      if (!race.refereeAId || !race.refereeBId) throw new Error('Trận đấu chưa được cấu hình phân công đủ 2 trọng tài.');
      
      if (race.refereeAId !== refereeUserId && race.refereeBId !== refereeUserId) {
        throw new Error('Bạn không có quyền kích hoạt trận đấu này.');
      }

      // Chuyển trạng thái trận đấu sang IN_PROGRESS
      const updatedRace = await tx.race.update({
        where: { raceId: parseInt(raceId) },
        data: { status: 'IN_PROGRESS' }
      });

      // Nghiệp vụ: Khóa toàn bộ cược mới bằng cách cập nhật thời gian chốt cược (Tùy biến luồng Prediction)
      await tx.prediction.updateMany({
        where: { raceId: parseInt(raceId), status: 'PENDING' },
        data: { updatedAt: new Date() }
      });

      return updatedRace;
    });
  }

  /**
   * Blind Submission & Auto-Match Engine
   */
  async submitRaceResult(raceId, refereeUserId, rawResults) {
    return await prisma.$transaction(async (tx) => {
      const race = await tx.race.findUnique({
        where: { raceId: parseInt(raceId) },
        include: { refereeSubmissions: true }
      });

      if (!race) throw new Error('Trận đấu không tồn tại.');
      if (race.status !== 'IN_PROGRESS') throw new Error('Cổng nhập kết quả chỉ mở khi trận đấu đang ở trạng thái IN_PROGRESS.');
      
      if (race.refereeAId !== refereeUserId && race.refereeBId !== refereeUserId) {
        throw new Error('Bạn không phải trọng tài được phân công gán cho trận đấu này.');
      }

      // Ràng buộc Append-Only: Mỗi trọng tài chỉ submit một lần duy nhất
      const hasSubmitted = race.refereeSubmissions.some(s => s.refereeId === refereeUserId);
      if (hasSubmitted) throw new Error('Bạn đã nộp kết quả trước đó. Hệ thống cấm chỉnh sửa.');

      // Lưu kết quả Blind
      const currentSubmission = await tx.refereeSubmission.create({
        data: {
          raceId: parseInt(raceId),
          refereeId: refereeUserId,
          rawResults: rawResults
        }
      });

      const allSubmissions = [...race.refereeSubmissions, currentSubmission];

      // Nếu mới có 1 người nộp -> Đợi người còn lại
      if (allSubmissions.length < 2) {
        return {
          status: 'PENDING_PARTNER',
          message: 'Nộp kết quả thành công. Đang chờ trọng tài thứ hai hoàn thành Blind Submission.'
        };
      }

      // Nếu đã đủ 2 người nộp -> Tiến hành Match Engine đối chiếu kết quả
      const submissionA = allSubmissions.find(s => s.refereeId === race.refereeAId);
      const submissionB = allSubmissions.find(s => s.refereeId === race.refereeBId);

      // Sắp xếp theo entryId trước khi chuỗi hóa JSON để đảm bảo tính so sánh chính xác tuyệt đối
      const sortedA = [...submissionA.rawResults].sort((a, b) => a.entryId - b.entryId);
      const sortedB = [...submissionB.rawResults].sort((a, b) => a.entryId - b.entryId);

      if (JSON.stringify(sortedA) === JSON.stringify(sortedB)) {
        // KHỚP 100% -> Chuyển sang PENDING_RESULT
        await tx.race.update({
          where: { raceId: parseInt(raceId) },
          data: { status: 'PENDING_RESULT' }
        });

        await tx.officialRaceResult.create({
          data: {
            raceId: parseInt(raceId),
            matchStatus: 'AUTO_MATCHED',
            finalResults: submissionA.rawResults
          }
        });

        return {
          status: 'AUTO_MATCHED',
          message: 'Kết quả trùng khớp 100%! Trận đấu chuyển sang PENDING_RESULT chờ Admin duyệt.'
        };
      } else {
        // LỆCH KẾT QUẢ -> Đóng băng chuyển sang trạng thái PAUSED
        await tx.race.update({
          where: { raceId: parseInt(raceId) },
          data: { status: 'PAUSED' }
        });

        await tx.officialRaceResult.create({
          data: {
            raceId: parseInt(raceId),
            matchStatus: 'CONFLICTED',
            finalResults: {}
          }
        });

        return {
          status: 'CONFLICTED',
          message: 'Phát hiện sai lệch dữ liệu! Trận đấu đã chuyển sang trạng thái PAUSED để Admin can thiệp.'
        };
      }
    });
  }
}

module.exports = new RefereeService();