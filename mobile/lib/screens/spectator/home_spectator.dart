import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../services/spectator_api.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';
import '../../widgets/login_welcome.dart';
import '../home_router.dart';
import '../tournaments/public_tournaments_screen.dart';
import '../tournaments/tournament_view_theme.dart';
import 'place_bet_screen.dart';
import 'spectator_home_screen.dart';
import 'spectator_predictions_screen.dart';
import 'spectator_profile_screen.dart';
import 'spectator_transactions_screen.dart';
import 'spectator_wallet_screen.dart';

/// Shell chính dành cho role Khán giả — 4 tab tích hợp đầy đủ:
///   Trang chủ · Giải đấu · Ví + Cược + Giao dịch · Cá nhân.
///
/// Cấu trúc:
///   - Tab 0: Trang chủ (SpectatorHomeScreen cũ) + 2 nút nhanh Đặt cược / Xem cược
///   - Tab 1: Giải đấu (PublicTournamentsScreen), có nút "Đặt cược" trong race OPEN
///   - Tab 2: Ví điểm — gộp Wallet + 2 sub-tab nhỏ (Cược của tôi / Giao dịch)
///   - Tab 3: Cá nhân (SpectatorProfileScreen) + nút đăng xuất
class HomeSpectator extends StatefulWidget {
  const HomeSpectator({super.key});

  @override
  State<HomeSpectator> createState() => _HomeSpectatorState();
}

class _HomeSpectatorState extends State<HomeSpectator> {
  final _api = SpectatorApi();

  int _index = 0;
  int _walletSubTab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      showLoginWelcomeSnackBar(context, roleCode: 'SPECTATOR');
    });
  }

  Future<void> _logout() async {
    await AuthService().logout();
    if (!mounted) return;
    await HomeRouter.openLogin(context);
  }

  void _goToTournaments() => setState(() => _index = 1);

  void _goToWallet({int subTab = 0}) {
    setState(() {
      _walletSubTab = subTab;
      _index = 2;
    });
  }

  Future<void> _openPlaceBet(int? raceId, {String? raceName}) async {
    final args = PlaceBetArgs(raceId: raceId, raceName: raceName);
    final result = await Navigator.of(context).push<PlaceBetResult>(
      MaterialPageRoute(
        builder: (_) => PlaceBetScreen(api: _api, args: args),
      ),
    );

    if (!mounted) return;
    if (result?.success == true) {
      _goToWallet(subTab: 1);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.green,
          content: Text(
            'Đặt cược thành công! Đã trừ ${formatPointsVi(result!.prediction?.betAmount ?? 0)} điểm.',
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      SpectatorHomeScreen(
        onLogout: _logout,
        onOpenTournaments: _goToTournaments,
        onOpenPlaceBet: () => _openPlaceBet(null),
        onOpenMyBets: () => _goToWallet(subTab: 1),
      ),
      PublicTournamentsScreenWithBet(
        theme: TournamentViewTheme.spectator,
        onPlaceBet: (raceId, raceName) => _openPlaceBet(raceId, raceName: raceName),
      ),
      _SpectatorWalletTab(
        api: _api,
        initialSubTab: _walletSubTab,
        onSubTabChanged: (i) => setState(() => _walletSubTab = i),
        onOpenPlaceBet: () => _openPlaceBet(null),
      ),
      SpectatorProfileScreen(onLogout: _logout),
    ];

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.greenDeep,
        foregroundColor: Colors.white,
        elevation: 0,
        title: Text(_titleFor(_index, _walletSubTab)),
        actions: [
          if (_index == 2)
            IconButton(
              tooltip: 'Đặt cược',
              onPressed: () => _openPlaceBet(null),
              icon: const Icon(Icons.add_circle_outline),
            ),
          IconButton(
            tooltip: 'Đăng xuất',
            onPressed: _logout,
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFD1FAE5),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded, color: AppColors.green),
            label: 'Trang chủ',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events, color: AppColors.green),
            label: 'Giải đấu',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet, color: AppColors.green),
            label: 'Ví',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person_rounded, color: AppColors.green),
            label: 'Cá nhân',
          ),
        ],
      ),
      floatingActionButton: _index == 2 && _walletSubTab == 1
          ? FloatingActionButton.extended(
              backgroundColor: AppColors.green,
              foregroundColor: Colors.white,
              onPressed: () => _openPlaceBet(null),
              icon: const Icon(Icons.add),
              label: const Text('Đặt cược'),
            )
          : null,
    );
  }

  String _titleFor(int index, int subTab) {
    switch (index) {
      case 0:
        return 'Khán giả';
      case 1:
        return 'Giải đấu';
      case 2:
        switch (subTab) {
          case 1:
            return 'Cược của tôi';
          case 2:
            return 'Giao dịch';
          default:
            return 'Ví điểm';
        }
      case 3:
        return 'Cá nhân';
      default:
        return 'Horse Racing';
    }
  }
}

/// Tab "Ví" — gồm 1 thẻ điều khiển nhỏ (Ví / Cược của tôi / Giao dịch) + body.
/// Dùng TabBar + TabBarView để chuyển sub-tab nhanh mà không mất trạng thái.
class _SpectatorWalletTab extends StatelessWidget {
  const _SpectatorWalletTab({
    required this.api,
    required this.initialSubTab,
    required this.onSubTabChanged,
    required this.onOpenPlaceBet,
  });

  final SpectatorApi api;
  final int initialSubTab;
  final ValueChanged<int> onSubTabChanged;
  final VoidCallback onOpenPlaceBet;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      initialIndex: initialSubTab.clamp(0, 2),
      child: Column(
        children: [
          Material(
            color: Colors.white,
            child: TabBar(
              onTap: onSubTabChanged,
              labelColor: AppColors.green,
              unselectedLabelColor: AppColors.textMuted,
              indicatorColor: AppColors.green,
              indicatorWeight: 3,
              tabs: const [
                Tab(icon: Icon(Icons.account_balance_wallet_outlined), text: 'Ví'),
                Tab(icon: Icon(Icons.sports_score_outlined), text: 'Cược'),
                Tab(icon: Icon(Icons.receipt_long_outlined), text: 'Giao dịch'),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),
          Expanded(
            child: TabBarView(
              children: [
                SpectatorWalletScreen(
                  api: api,
                  onOpenTransactions: () => onSubTabChanged(2),
                ),
                SpectatorPredictionsScreen(
                  api: api,
                  onOpenPlaceBet: (int? raceId) async {
                    final args = PlaceBetArgs(raceId: raceId);
                    final result = await Navigator.of(context).push<PlaceBetResult>(
                      MaterialPageRoute(
                        builder: (_) => PlaceBetScreen(api: api, args: args),
                      ),
                    );
                    if (!context.mounted) return;
                    if (result?.success == true) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          backgroundColor: AppColors.green,
                          content: Text(
                            'Đặt cược thành công! Đã trừ '
                            '${formatPointsVi(result!.prediction?.betAmount ?? 0)} điểm.',
                          ),
                        ),
                      );
                    }
                  },
                ),
                SpectatorTransactionsScreen(api: api),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Wrapper cho PublicTournamentsScreen cũ + thêm callback đặt cược từ race OPEN.
/// Vì file gốc không nhận callback đặt cược, ta giữ nguyên màn cũ và bổ sung
/// AppBar nút "Đặt cược" — bấm sẽ mở PlaceBetScreen với raceId=null (chọn race
/// trong form). Người dùng có thể đặt từ tab Giải đấu, tab Trang chủ, hoặc tab Ví.
class PublicTournamentsScreenWithBet extends StatelessWidget {
  const PublicTournamentsScreenWithBet({
    super.key,
    required this.theme,
    required this.onPlaceBet,
  });

  final TournamentViewTheme theme;
  final void Function(int raceId, String? raceName) onPlaceBet;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        const PublicTournamentsScreen(theme: TournamentViewTheme.spectator),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton.extended(
            backgroundColor: AppColors.green,
            foregroundColor: Colors.white,
            onPressed: () => onPlaceBet(0, null),
            icon: const Icon(Icons.add),
            label: const Text('Đặt cược'),
          ),
        ),
      ],
    );
  }
}
