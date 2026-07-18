import 'package:flutter/material.dart';

import '../../data/spectator_mock_data.dart';
import '../../models/user_profile.dart';
import '../../services/profile_service.dart';
import '../../screens/tournaments/tournament_view_theme.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';
import '../../widgets/tournaments_home_section.dart';

class SpectatorHomeScreen extends StatefulWidget {
  const SpectatorHomeScreen({
    super.key,
    required this.onLogout,
    required this.onOpenTournaments,
    this.onOpenPlaceBet,
    this.onOpenMyBets,
  });

  final VoidCallback onLogout;
  final VoidCallback onOpenTournaments;

  /// Mở màn đặt cược nhanh từ trang chủ (không truyền raceId).
  final VoidCallback? onOpenPlaceBet;

  /// Nhảy thẳng sang tab "Cược của tôi".
  final VoidCallback? onOpenMyBets;

  @override
  State<SpectatorHomeScreen> createState() => SpectatorHomeScreenState();
}

class SpectatorHomeScreenState extends State<SpectatorHomeScreen> {
  final _profileService = ProfileService();
  final _tournamentsKey = GlobalKey<TournamentsHomeSectionState>();
  UserProfile? _profile;
  bool _loading = true;
  String? _error;

  /// Gọi từ parent (vd _HomeSpectatorState) khi cần reload số dư (vd sau khi đặt
  /// cược thành công — backend đã trừ tiền trong transaction nhưng profile cached
  /// trong state vẫn giữ số dư cũ).
  Future<void> refresh() async {
    await _loadProfile();
  }

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
    final balance = _profile?.pointWallet?.balance ?? 0;
    final frozen = _profile?.pointWallet?.isFrozen ?? false;

    return RefreshIndicator(
      onRefresh: _refreshAll,
      color: AppColors.green,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.greenDeep,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 16, bottom: 14, right: 56),
              title: const Text(
                'Khán giả',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    'assets/images/spectator-hero.jpg',
                    fit: BoxFit.cover,
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0x66052E16),
                          Color(0xE6052E16),
                        ],
                      ),
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
                  const Text(
                    'Bảng điều khiển',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: AppColors.heading,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Theo dõi giải đua, dự đoán và quản lý điểm thưởng.',
                    style: TextStyle(color: AppColors.textMuted, height: 1.4),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    _ErrorBanner(message: _error!, onRetry: _refreshAll),
                  ],
                  const SizedBox(height: 16),
                  TournamentsHomeSection(
                    key: _tournamentsKey,
                    theme: TournamentViewTheme.spectator,
                    onViewAll: widget.onOpenTournaments,
                    loading: _loading,
                  ),
                  const SizedBox(height: 16),
                  _HeroCard(
                    loading: _loading,
                    greeting: timeGreetingVi(),
                    firstName: _profile?.displayFirstName ?? 'bạn',
                    balance: balance,
                    frozen: frozen,
                  ),
                  if (widget.onOpenPlaceBet != null || widget.onOpenMyBets != null) ...[
                    const SizedBox(height: 16),
                    _QuickBetActions(
                      onPlaceBet: widget.onOpenPlaceBet,
                      onOpenMyBets: widget.onOpenMyBets,
                      disabled: frozen,
                    ),
                  ],
                  const SizedBox(height: 24),
                  _SectionHeader(
                    title: 'Truy cập nhanh',
                    subtitle: 'Các tính năng dành cho khán giả',
                  ),
                  const SizedBox(height: 12),
                  _QuickActionsGrid(),
                  const SizedBox(height: 24),
                  _SectionHeader(
                    title: 'Dự đoán của bạn',
                    subtitle: 'Kết quả & lịch sử dự đoán',
                  ),
                  const SizedBox(height: 12),
                  _EmptyCard(
                    icon: '🎯',
                    message: 'Chưa có dự đoán nào.',
                    tag: 'API dự đoán sẽ kết nối sau',
                  ),
                  const SizedBox(height: 24),
                  _SectionHeader(
                    title: 'Bảng xếp hạng',
                    subtitle: 'Top khán giả tuần này (minh họa)',
                  ),
                  const SizedBox(height: 12),
                  _LeaderboardCard(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({
    required this.loading,
    required this.greeting,
    required this.firstName,
    required this.balance,
    required this.frozen,
  });

  final bool loading;
  final String greeting;
  final String firstName;
  final num balance;
  final bool frozen;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.greenDeep.withValues(alpha: 0.22),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
        image: const DecorationImage(
          image: AssetImage('assets/images/horse-racing-track.jpg'),
          fit: BoxFit.cover,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.greenDeep.withValues(alpha: 0.94),
              AppColors.green.withValues(alpha: 0.9),
            ],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              greeting.toUpperCase(),
              style: TextStyle(
                fontSize: 11,
                letterSpacing: 1.1,
                fontWeight: FontWeight.w600,
                color: AppColors.gold.withValues(alpha: 0.95),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              loading ? 'Đang tải…' : 'Xin chào, $firstName!',
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Theo dõi giải đua, đặt dự đoán và nhận thưởng điểm — tất cả trên một bảng điều khiển dành cho khán giả.',
              style: TextStyle(
                fontSize: 13,
                height: 1.45,
                color: Color(0xE0F8FAFC),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.22)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Số dư ví điểm',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: 0.85),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: loading ? '—' : formatPointsVi(balance),
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const TextSpan(
                          text: ' điểm',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: Color(0xCCFFFFFF),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    frozen
                        ? 'Ví đang tạm khóa — liên hệ hỗ trợ.'
                        : 'Thưởng đăng ký: +100 điểm cho tài khoản mới',
                    style: TextStyle(
                      fontSize: 12,
                      color: frozen
                          ? const Color(0xFFFECACA)
                          : Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
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
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossCount = constraints.maxWidth > 400 ? 2 : 2;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossCount,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.05,
          ),
          itemCount: spectatorQuickActions.length,
          itemBuilder: (context, i) {
            final item = spectatorQuickActions[i];
            return _ActionCard(item: item);
          },
        );
      },
    );
  }
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({required this.item});

  final QuickActionItem item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A000000),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.icon, style: const TextStyle(fontSize: 26)),
          const Spacer(),
          Text(
            item.title,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 15,
              color: AppColors.heading,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            item.desc,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.3),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Text(
              item.tag,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.green),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({
    required this.icon,
    required this.message,
    required this.tag,
  });

  final String icon;
  final String message;
  final String tag;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Text(icon, style: const TextStyle(fontSize: 36)),
          const SizedBox(height: 8),
          Text(message, style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(tag, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
          ),
        ],
      ),
    );
  }
}

class _LeaderboardCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < spectatorLeaderboard.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 56),
            _LeaderboardRow(entry: spectatorLeaderboard[i]),
          ],
        ],
      ),
    );
  }
}

class _LeaderboardRow extends StatelessWidget {
  const _LeaderboardRow({required this.entry});

  final LeaderboardEntry entry;

  @override
  Widget build(BuildContext context) {
    final medal = entry.rank <= 3;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: medal ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
            child: Text(
              '${entry.rank}',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: medal ? const Color(0xFFB45309) : AppColors.textMuted,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              entry.name,
              style: const TextStyle(fontWeight: FontWeight.w500, color: AppColors.heading),
            ),
          ),
          Text(
            entry.points,
            style: const TextStyle(fontSize: 13, color: AppColors.green, fontWeight: FontWeight.w600),
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
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.errorBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(message, style: const TextStyle(color: AppColors.errorText, fontSize: 13)),
          ),
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}

/// Hai nút nhanh: Đặt cược & Xem cược của tôi — hiển thị ngay sau wallet hero card.
class _QuickBetActions extends StatelessWidget {
  const _QuickBetActions({
    required this.onPlaceBet,
    required this.onOpenMyBets,
    required this.disabled,
  });

  final VoidCallback? onPlaceBet;
  final VoidCallback? onOpenMyBets;
  final bool disabled;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (onPlaceBet != null)
          Expanded(
            child: SizedBox(
              height: 48,
              child: ElevatedButton.icon(
                onPressed: disabled ? null : onPlaceBet,
                icon: const Icon(Icons.add_circle_outline),
                label: const Text('Đặt cược'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.green,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
              ),
            ),
          ),
        if (onPlaceBet != null && onOpenMyBets != null) const SizedBox(width: 10),
        if (onOpenMyBets != null)
          Expanded(
            child: SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: onOpenMyBets,
                icon: const Icon(Icons.list_alt_outlined),
                label: const Text('Cược của tôi'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.green,
                  side: const BorderSide(color: AppColors.green, width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
