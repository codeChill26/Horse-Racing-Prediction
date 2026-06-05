// backend/src/services/jockeyInvitation.js
const prisma = require('../config/prisma');

class JockeyInvitationService {
  
  // TASK 1: Tìm kiếm Jockey nâng cao (Chỉ lấy người đã hoàn thiện hồ sơ hoàn chỉnh)
  async searchJockeys(query) {
    const { name } = query;
    return await prisma.user.findMany({
      where: {
        role: { code: 'JOCKEY' },
        isActive: true,
        isProfileComplete: true, // Ép điều kiện lọc: Đầy đủ LicenseNumber và Weight
        fullName: name ? { contains: name, mode: 'insensitive' } : undefined
      },
      select: {
        userId: true, email: true, fullName: true, phoneNumber: true,
        licenseNumber: true, weight: true, bio: true
      }
    });
  }

  // TASK 2: API gửi lời mời (Horse Owner -> Jockey)
  async sendInvitation(ownerId, data) {
    // Kiểm tra Race có đang mở đăng ký hay không (Tránh gửi vào Race đã đóng/kết thúc)
    const race = await prisma.race.findUnique({ where: { raceId: data.raceId } });
    if (!race) throw new Error('Race not found');
    if (new Date() >= new Date(race.registrationDeadline)) {
      throw new Error('Cannot send invitation. This race registration deadline has passed (Expired).');
    }

    // Kiểm tra xem lời mời trỏ tới cặp này đã tồn tại chưa (Ràng buộc Unique)
    const existing = await prisma.jockeyInvitation.findUnique({
      where: {
        jockeyId_horseId_raceId: {
          jockeyId: data.jockeyId,
          horseId: data.horseId,
          raceId: data.raceId
        }
      }
    });
    if (existing) throw new Error('You have already sent an invitation to this Jockey for this specific Horse and Race.');

    return await prisma.jockeyInvitation.create({
      data: {
        ownerId,
        jockeyId: data.jockeyId,
        horseId: data.horseId,
        raceId: data.raceId,
        status: 'PENDING'
      }
    });
  }

  // API Xem hộp thư Inbox / Outbox
  async getInvitations(userId, roleCode, filterStatus) {
    const whereClause = { status: filterStatus || undefined };
    if (roleCode === 'JOCKEY') whereClause.jockeyId = userId; // Inbox
    else whereClause.ownerId = userId; // Outbox

    return await prisma.jockeyInvitation.findMany({
      where: whereClause,
      include: {
        race: true,
        horse: true,
        jockey: { select: { fullName: true, email: true } },
        owner: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // API Jockey phản hồi (Accepted / Declined)
  async respondInvitation(jockeyId, invitationId, data) {
    const invitation = await prisma.jockeyInvitation.findUnique({ where: { invitationId } });
    if (!invitation || invitation.jockeyId !== jockeyId) throw new Error('Invitation not found or unauthorized');
    if (invitation.status !== 'PENDING') throw new Error('This invitation has already been processed');

    return await prisma.jockeyInvitation.update({
      where: { invitationId },
      data: {
        status: data.status,
        declineReason: data.status === 'DECLINED' ? data.declineReason : null
      }
    });
  }

  // TASK 3: CHỐT JOCKEY & TỰ ĐỘNG CANCEL CÁC LỜI MỜI KHÁC (Crucial Transaction Logic)
  async confirmJockey(ownerId, invitationId) {
    const invitation = await prisma.jockeyInvitation.findUnique({
      where: { invitationId },
      include: { race: true }
    });

    if (!invitation || invitation.ownerId !== ownerId) throw new Error('Invitation not found or unauthorized');
    if (invitation.status !== 'ACCEPTED') throw new Error('You can only confirm a Jockey who has ACCEPTED your invitation');

    // Kiểm tra thời hạn đóng đăng ký của Race
    if (new Date() >= new Date(invitation.race.registrationDeadline)) {
      throw new Error('The registration deadline for this race has passed. Action denied.');
    }

    // Kích hoạt Database Transaction toàn cục (Atomic operation) để thực thi chuỗi logic phức tạp
    return await prisma.$transaction(async (tx) => {
      
      // Ràng buộc 1: 1 Jockey chỉ được Confirm cho tối đa 1 ngựa trong cùng Race
      const jockeyBooked = await tx.raceEntry.findUnique({
        where: {
          raceId_jockeyId: { raceId: invitation.raceId, jockeyId: invitation.jockeyId }
        }
      });
      if (jockeyBooked) throw new Error('This Jockey is already confirmed for another horse in this same Race.');

      // Hành động 1: Tạo bản ghi Entry thi đấu chính thức (Horse + Jockey đã Confirm)
      const entry = await tx.raceEntry.create({
        data: {
          raceId: invitation.raceId,
          horseId: invitation.horseId,
          jockeyId: invitation.jockeyId
        }
      });

      // Hành động 2: Quét toàn bộ lời mời KHÁC của cùng con NGỰA đó trong RACE đó chuyển sang CANCELLED
      await tx.jockeyInvitation.updateMany({
        where: {
          raceId: invitation.raceId,
          horseId: invitation.horseId,
          invitationId: { not: invitationId }, // Ngoại trừ lời mời vừa được confirm này
          status: { in: ['PENDING', 'ACCEPTED'] }
        },
        data: { status: 'CANCELLED' }
      });

      // Hành động 3: Cập nhật trạng thái chính lời mời này lên DB
      await tx.jockeyInvitation.update({
        where: { invitationId },
        data: { status: 'ACCEPTED' } // Đảm bảo trạng thái ghi nhận chuẩn xác
      });

      return entry;
    });
  }
}

module.exports = new JockeyInvitationService();