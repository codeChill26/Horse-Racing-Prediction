import 'package:flutter/material.dart';

import '../../data/jockey_mock_data.dart';
import '../../models/user_profile.dart';
import '../../services/profile_service.dart';
import '../../screens/tournaments/tournament_view_theme.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';
import '../../widgets/tournaments_home_section.dart';

class JockeyHomeScreen extends StatefulWidget {
  const JockeyHomeScreen({
    super.key,
    required this.onLogout,
    required this.onOpenProfile,
    required this.onOpenTournaments,
  });

  final VoidCallback onLogout;
  final VoidCallback onOpenProfile;
  final VoidCallback onOpenTournaments;

  @override
  State<JockeyHomeScreen> createState() => _JockeyHomeScreenState();
}

class _JockeyHomeScreenState extends State<JockeyHomeScreen> {
  final _profileService = ProfileService();
  final _tournamentsKey = GlobalKey<TournamentsHomeSectionState>();
  UserProfile? _profile;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _refreshAll() async {
    await Future.wait([
      _loadProfile(),
      _tournamentsKey.currentState?.loadTournaments() ?? Future.value(),
    ]);
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

  @override
  Widget build(BuildContext context) {
    final complete = _profile?.isProfileComplete == true;
    final firstName = _profile?.displayFirstName ?? 'Kỵ sĩ';
    final active = _profile?.isActive == true;

    return RefreshIndicator(
      onRefresh: _refreshAll,
      color: AppColors.jockeyPrimary,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: AppColors.jockeyDeep,
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
                    'assets/images/jockey-hero.jpg',
                    fit: BoxFit.cover,
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0x663B0F1A),
                          Color(0xE63B0F1A),
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
                            color: AppColors.jockeyAccent.withValues(alpha: 0.95),
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Quản lý lịch thi đấu, hồ sơ hành nghề và phân công cuộc đua.',
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.4,
                            color: Color(0xE0F5F0EB),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: [
                            _HeroBadge(
                              label: 'Kỵ sĩ',
                              background: AppColors.jockeyPrimary,
                            ),
                            _HeroBadge(
                              label: _loading
                                  ? '…'
                                  : (complete ? 'Hồ sơ đã duyệt' : 'Hồ sơ chưa đủ'),
                              background: complete
                                  ? const Color(0xFF166534)
                                  : const Color(0xFF9A3412),
                            ),
                          ],
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
                    theme: TournamentViewTheme.jockey,
                    onViewAll: widget.onOpenTournaments,
                    loading: _loading,
                  ),
                  const SizedBox(height: 16),
                  _StatsGrid(
                    loading: _loading,
                    license: _profile?.licenseNumber,
                    weight: _profile?.weight,
                    assignmentCount: jockeyUpcomingAssignments.length,
                    active: active,
                  ),
                  if (!_loading && !complete) ...[
                    const SizedBox(height: 16),
                    _ProfileWarning(onTap: widget.onOpenProfile),
                  ],
                  const SizedBox(height: 24),
                  const _SectionHeader(
                    title: 'Truy cập nhanh',
                    subtitle: 'Công cụ dành cho kỵ sĩ',
                  ),
                  const SizedBox(height: 12),
                  _QuickActionsGrid(onProfileTap: widget.onOpenProfile),
                  const SizedBox(height: 24),
                  const _SectionHeader(
                    title: 'Phân công sắp tới',
                    subtitle: 'Lịch cưỡi ngựa — dữ liệu minh họa',
                  ),
                  const SizedBox(height: 12),
                  ...jockeyUpcomingAssignments.map(_AssignmentTile.new),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroBadge extends StatelessWidget {
  const _HeroBadge({required this.label, required this.background});

  final String label;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  const _StatsGrid({
    required this.loading,
    required this.license,
    required this.weight,
    required this.assignmentCount,
    required this.active,
  });

  final bool loading;
  final String? license;
  final num? weight;
  final int assignmentCount;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _StatCard(
              width: w,
              label: 'Chứng chỉ',
              value: loading
                  ? '—'
                  : (license?.isNotEmpty == true ? license! : 'Chưa cập nhật'),
            ),
            _StatCard(
              width: w,
              label: 'Cân nặng',
              value: loading ? '—' : (weight != null ? '$weight kg' : '—'),
            ),
            _StatCard(
              width: w,
              label: 'Cuộc đua sắp tới',
              value: loading ? '—' : '$assignmentCount',
            ),
            _StatCard(
              width: w,
              label: 'Trạng thái',
              value: loading ? '—' : (active ? 'Đang hoạt động' : 'Tạm khóa'),
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
    this.accent = false,
  });

  final double width;
  final String label;
  final String value;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: accent ? AppColors.jockeyPrimary.withValues(alpha: 0.08) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: accent ? AppColors.jockeyPrimary.withValues(alpha: 0.35) : AppColors.border,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: accent ? AppColors.jockeyPrimary : AppColors.heading,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileWarning extends StatelessWidget {
  const _ProfileWarning({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFED7AA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Hoàn thiện hồ sơ kỵ sĩ',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: Color(0xFF9A3412),
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Vui lòng cập nhật số chứng chỉ hành nghề và cân nặng để được xác nhận tham gia giải.',
            style: TextStyle(color: Color(0xFF9A3412), height: 1.45),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: onTap,
            style: TextButton.styleFrom(
              foregroundColor: AppColors.jockeyPrimary,
              padding: EdgeInsets.zero,
            ),
            child: const Text('Cập nhật hồ sơ →'),
          ),
        ],
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
        Text(
          subtitle,
          style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
        ),
      ],
    );
  }
}

class _QuickActionsGrid extends StatelessWidget {
  const _QuickActionsGrid({required this.onProfileTap});

  final VoidCallback onProfileTap;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: jockeyQuickActions.map((item) {
            final isProfile = item.title == 'Hoàn thiện hồ sơ';
            return SizedBox(
              width: w,
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                child: InkWell(
                  onTap: isProfile ? onProfileTap : null,
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
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
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.jockeyMuted,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            item.tag,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.jockeyPrimary,
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

class _AssignmentTile extends StatelessWidget {
  const _AssignmentTile(this.item);

  final JockeyAssignment item;

  @override
  Widget build(BuildContext context) {
    final confirmed = item.status == 'Đã xác nhận';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.race,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.heading,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Ngựa: ${item.horse}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: AppColors.jockeyPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${item.venue} · ${item.date} · ${item.gate}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: confirmed
                  ? const Color(0xFFECFDF5)
                  : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              item.status,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: confirmed
                    ? const Color(0xFF065F46)
                    : AppColors.textMuted,
              ),
            ),
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
