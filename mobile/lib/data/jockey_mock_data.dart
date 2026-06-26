class JockeyQuickAction {
  const JockeyQuickAction({
    required this.icon,
    required this.title,
    required this.description,
    required this.tag,
  });

  final String icon;
  final String title;
  final String description;
  final String tag;
}

class JockeyAssignment {
  const JockeyAssignment({
    required this.id,
    required this.race,
    required this.horse,
    required this.venue,
    required this.date,
    required this.gate,
    required this.status,
  });

  final int id;
  final String race;
  final String horse;
  final String venue;
  final String date;
  final String gate;
  final String status;
}

const jockeyQuickActions = [
  JockeyQuickAction(
    icon: '📬',
    title: 'Lời mời thi đấu',
    description: 'Xem & phản hồi lời mời từ chủ ngựa',
    tag: 'Mở ngay',
  ),
  JockeyQuickAction(
    icon: '🐴',
    title: 'Ngựa của tôi',
    description: 'Thông tin ngựa đang cưỡi',
    tag: 'Sắp ra mắt',
  ),
  JockeyQuickAction(
    icon: '📈',
    title: 'Thành tích',
    description: 'Lịch sử về đích & thứ hạng',
    tag: 'Sắp ra mắt',
  ),
  JockeyQuickAction(
    icon: '✅',
    title: 'Hoàn thiện hồ sơ',
    description: 'Cập nhật chứng chỉ & cân nặng',
    tag: 'Hồ sơ',
  ),
];

const jockeyUpcomingAssignments = [
  JockeyAssignment(
    id: 1,
    race: 'Giải Vô địch mùa xuân 2026',
    horse: 'Thunder Strike',
    venue: 'Trường đua Bình Dương',
    date: '15/06/2026',
    gate: 'Cổng 4',
    status: 'Đã xác nhận',
  ),
  JockeyAssignment(
    id: 2,
    race: 'Cúp Tốc độ Quốc gia',
    horse: 'Golden Arrow',
    venue: 'Trường đua Phú Thọ',
    date: '22/06/2026',
    gate: 'Cổng 2',
    status: 'Chờ phân công',
  ),
];
