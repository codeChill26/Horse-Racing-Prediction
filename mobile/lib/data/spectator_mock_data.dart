class QuickActionItem {
  const QuickActionItem({
    required this.icon,
    required this.title,
    required this.desc,
    required this.tag,
  });

  final String icon;
  final String title;
  final String desc;
  final String tag;
}

class UpcomingRace {
  const UpcomingRace({
    required this.id,
    required this.name,
    required this.venue,
    required this.date,
    required this.time,
    required this.status,
  });

  final int id;
  final String name;
  final String venue;
  final String date;
  final String time;
  final String status;
}

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.name,
    required this.points,
  });

  final int rank;
  final String name;
  final String points;
}

const spectatorQuickActions = [
  QuickActionItem(
    icon: '🏇',
    title: 'Lịch đua',
    desc: 'Xem giải & lịch thi đấu',
    tag: 'Sắp ra mắt',
  ),
  QuickActionItem(
    icon: '🎯',
    title: 'Dự đoán',
    desc: 'Đặt dự đoán kết quả cuộc đua',
    tag: 'Sắp ra mắt',
  ),
  QuickActionItem(
    icon: '📊',
    title: 'Bảng xếp hạng',
    desc: 'Theo dõi thứ hạng realtime',
    tag: 'Sắp ra mắt',
  ),
  QuickActionItem(
    icon: '🎁',
    title: 'Phần thưởng',
    desc: 'Nhận thông báo thưởng dự đoán',
    tag: 'Sắp ra mắt',
  ),
];

const spectatorUpcomingRaces = [
  UpcomingRace(
    id: 1,
    name: 'Giải Vô địch mùa xuân 2026',
    venue: 'Trường đua Bình Dương',
    date: '15/06/2026',
    time: '14:30',
    status: 'Sắp diễn ra',
  ),
  UpcomingRace(
    id: 2,
    name: 'Cúp Tốc độ Quốc gia',
    venue: 'Trường đua Phú Thọ',
    date: '22/06/2026',
    time: '09:00',
    status: 'Mở đăng ký dự đoán',
  ),
  UpcomingRace(
    id: 3,
    name: 'Đua marathon 2400m',
    venue: 'Trường đua Long An',
    date: '29/06/2026',
    time: '16:00',
    status: 'Chuẩn bị',
  ),
];

const spectatorLeaderboard = [
  LeaderboardEntry(rank: 1, name: 'Nguyễn Văn A', points: '2.450 điểm'),
  LeaderboardEntry(rank: 2, name: 'Trần Thị B', points: '2.120 điểm'),
  LeaderboardEntry(rank: 3, name: 'Lê Văn C', points: '1.980 điểm'),
];
