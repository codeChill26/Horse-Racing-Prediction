class OwnerQuickAction {
  const OwnerQuickAction({
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

class OwnerHorse {
  const OwnerHorse({
    required this.id,
    required this.name,
    required this.breed,
    required this.age,
    required this.wins,
    required this.nextRace,
  });

  final int id;
  final String name;
  final String breed;
  final int age;
  final int wins;
  final String nextRace;
}

class FeaturedTournament {
  const FeaturedTournament({
    required this.name,
    required this.tagline,
    required this.venue,
    required this.period,
    required this.prizePool,
    required this.registeredHorses,
    required this.maxHorses,
    required this.distance,
    required this.status,
  });

  final String name;
  final String tagline;
  final String venue;
  final String period;
  final String prizePool;
  final int registeredHorses;
  final int maxHorses;
  final String distance;
  final String status;

  int get registrationPercent =>
      maxHorses > 0 ? ((registeredHorses / maxHorses) * 100).round() : 0;
}

const featuredTournament = FeaturedTournament(
  name: 'Cúp Chủ ngựa Đông Nam Á 2026',
  tagline: 'Giải đấu đua ngựa chuyên nghiệp',
  venue: 'Trường đua Quốc gia Long Bình',
  period: '15/06 – 30/06/2026',
  prizePool: '500.000.000 ₫',
  registeredHorses: 24,
  maxHorses: 32,
  distance: '1.600m – 2.400m',
  status: 'Đang mở đăng ký',
);

const ownerQuickActions = [
  OwnerQuickAction(
    icon: '🏆',
    title: 'Đăng ký giải',
    description: 'Gửi ngựa tham gia giải đấu',
    tag: 'Giải nổi bật',
  ),
  OwnerQuickAction(
    icon: '🐴',
    title: 'Quản lý ngựa',
    description: 'Danh sách & hồ sơ từng con',
    tag: 'Mở ngay',
  ),
  OwnerQuickAction(
    icon: '📋',
    title: 'Mời kỵ sĩ',
    description: 'Gửi lời mời & chốt kỵ sĩ thi đấu',
    tag: 'Mở ngay',
  ),
  OwnerQuickAction(
    icon: '📊',
    title: 'Báo cáo thành tích',
    description: 'Thống kê về đích theo mùa',
    tag: 'Sắp ra mắt',
  ),
];

const ownerHorses = [
  OwnerHorse(
    id: 1,
    name: 'Thunder Strike',
    breed: 'Thoroughbred',
    age: 4,
    wins: 3,
    nextRace: 'Cúp Đông Nam Á',
  ),
  OwnerHorse(
    id: 2,
    name: 'Golden Arrow',
    breed: 'Arabian',
    age: 5,
    wins: 5,
    nextRace: 'Cúp Tốc độ QG',
  ),
  OwnerHorse(
    id: 3,
    name: 'Midnight Star',
    breed: 'Thoroughbred',
    age: 3,
    wins: 1,
    nextRace: 'Chưa phân công',
  ),
];

int get ownerTotalWins => ownerHorses.fold(0, (sum, h) => sum + h.wins);
