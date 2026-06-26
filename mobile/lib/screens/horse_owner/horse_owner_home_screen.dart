import 'package:flutter/material.dart';

import '../../data/horse_owner_mock_data.dart';
import '../../models/user_profile.dart';
import '../../screens/tournaments/tournament_view_theme.dart';
import '../../services/profile_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';
import '../../widgets/tournaments_home_section.dart';

class HorseOwnerHomeScreen extends StatefulWidget {
  const HorseOwnerHomeScreen({
    super.key,
    required this.onLogout,
    required this.onOpenProfile,
    required this.onOpenTournaments,
    required this.onOpenInvitations,
  });

  final VoidCallback onLogout;
  final VoidCallback onOpenProfile;
  final VoidCallback onOpenTournaments;
  final VoidCallback onOpenInvitations;

  @override
  State<HorseOwnerHomeScreen> createState() => _HorseOwnerHomeScreenState();
}

class _HorseOwnerHomeScreenState extends State<HorseOwnerHomeScreen> {
  final _profileService = ProfileService();
  final _tournamentsKey = GlobalKey<TournamentsHomeSectionState>();
  UserProfile? _profile;
  int _tournamentCount = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final profile = await _profileService.getMyProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _profile = null;
        _loading = false;
      });
    }
  }

  Future<void> _refreshAll() async {
    await Future.wait([
      _loadProfile(),
      _tournamentsKey.currentState?.loadTournaments() ?? Future.value(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final firstName = _profile?.displayFirstName ?? 'Chủ ngựa';

    return RefreshIndicator(
      onRefresh: _refreshAll,
      color: AppColors.ownerTeal,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppColors.ownerDeep,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 16, bottom: 14, right: 56),
              title: Text(
                _loading ? 'Đang tải…' : 'Xin chào, $firstName!',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    'assets/images/horse-racing-hero.jpg',
                    fit: BoxFit.cover,
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0x660C2340),
                          Color(0xE60C2340),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 52,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          timeGreetingVi().toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            letterSpacing: 1.1,
                            fontWeight: FontWeight.w600,
                            color: AppColors.ownerGold.withValues(alpha: 0.95),
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Quản lý đội ngựa, đăng ký giải đấu và theo dõi thành tích.',
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.4,
                            color: Color(0xE0EEF2F7),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.ownerTeal.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'Chủ ngựa · Horse Owner',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              IconButton(
                tooltip: 'Đăng xuất',
                onPressed: widget.onLogout,
                icon: const Icon(Icons.logout_rounded),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_error != null) ...[
                    _ErrorBanner(message: _error!, onRetry: _refreshAll),
                    const SizedBox(height: 16),
                  ],
                  TournamentsHomeSection(
                    key: _tournamentsKey,
                    theme: TournamentViewTheme.horseOwner,
                    onViewAll: widget.onOpenTournaments,
                    loading: _loading,
                    onCountLoaded: (c) => setState(() => _tournamentCount = c),
                  ),
                  const SizedBox(height: 16),
                  _StatsGrid(
                    loading: _loading,
                    horseCount: ownerHorses.length,
                    totalWins: ownerTotalWins,
                    upcomingTournaments: _tournamentCount,
                    phone: _profile?.phone,
                  ),
                  const SizedBox(height: 24),
                  const _SectionHeader(
                    title: 'Truy cập nhanh',
                    subtitle: 'Công cụ dành cho chủ ngựa',
                  ),
                  const SizedBox(height: 12),
                  _QuickActionsGrid(
                    onTournaments: widget.onOpenTournaments,
                    onInvitations: widget.onOpenInvitations,
                  ),
                  const SizedBox(height: 24),
                  const _SectionHeader(
                    title: 'Ngựa của bạn',
                    subtitle: 'Danh sách minh họa — API sẽ kết nối sau',
                  ),
                  const SizedBox(height: 12),
                  ...ownerHorses.map(_HorseTile.new),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: widget.onOpenProfile,
                    child: const Text('Xem hồ sơ chủ ngựa →'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({
    required this.loading,
    required this.horseCount,
    required this.totalWins,
    required this.upcomingTournaments,
    required this.phone,
  });

  final bool loading;
  final int horseCount;
  final int totalWins;
  final int upcomingTournaments;
  final String? phone;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _StatCard(width: w, label: 'Ngựa trong trại', value: '$horseCount'),
            _StatCard(width: w, label: 'Tổng chiến thắng', value: '$totalWins'),
            _StatCard(
              width: w,
              label: 'Giải đang mở',
              value: loading ? '—' : '$upcomingTournaments',
            ),
            _StatCard(
              width: w,
              label: 'Liên hệ',
              value: loading ? '—' : (phone?.isNotEmpty == true ? phone! : '—'),
              small: true,
              accent: true,
            ),
          ],
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.width,
    required this.label,
    required this.value,
    this.small = false,
    this.accent = false,
  });

  final double width;
  final String label;
  final String value;
  final bool small;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: accent ? AppColors.ownerTeal.withValues(alpha: 0.08) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: accent ? AppColors.ownerTeal.withValues(alpha: 0.35) : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: small ? 14 : 18,
                fontWeight: FontWeight.w700,
                color: accent ? AppColors.ownerTeal : AppColors.heading,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.heading,
          ),
        ),
        const SizedBox(height: 2),
        Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
      ],
    );
  }
}

class _QuickActionsGrid extends StatelessWidget {
  const _QuickActionsGrid({
    required this.onTournaments,
    required this.onInvitations,
  });

  final VoidCallback onTournaments;
  final VoidCallback onInvitations;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: ownerQuickActions.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            VoidCallback? onTap;
            if (index == 0) onTap = onTournaments;
            if (index == 2) onTap = onInvitations;
            return SizedBox(
              width: w,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onTap,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.icon, style: const TextStyle(fontSize: 22)),
                    const SizedBox(height: 8),
                    Text(
                      item.title,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.heading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.description,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.ownerMuted,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        item.tag,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppColors.ownerPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
                  ),
                ),
              ),
            );
          }).toList(),
        );
      },
    );
  }
}

class _HorseTile extends StatelessWidget {
  const _HorseTile(this.horse);

  final OwnerHorse horse;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.ownerMuted,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text('🐴', style: TextStyle(fontSize: 22)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  horse.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.heading,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${horse.breed} · ${horse.age} tuổi · ${horse.wins} chiến thắng',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'Giải kế tiếp',
                style: TextStyle(fontSize: 10, color: AppColors.textMuted),
              ),
              Text(
                horse.nextRace,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.ownerPrimary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.errorBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message, style: const TextStyle(color: AppColors.errorText)),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}
