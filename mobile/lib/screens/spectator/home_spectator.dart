import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/race_summary.dart';
import '../../services/auth_service.dart';
import '../../services/spectator_api.dart';
import '../../services/tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';
import '../../widgets/login_welcome.dart';
import '../home_router.dart';
import '../tournaments/public_tournament_detail_screen.dart';
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
  final _tournamentsService = TournamentsService();

  // GlobalKey để shell có thể yêu cầu các sub-screen reload (vd sau khi đặt
  // cược thành công → cần refresh wallet + profile để hiển thị số dư mới).
  final _homeKey = GlobalKey<SpectatorHomeScreenState>();
  final _walletTabKey = GlobalKey<_SpectatorWalletTabState>();

  int _index = 0;
  int _walletSubTab = 0;
  bool _loadingBettableRaces = false;

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

  Future<void> _openPlaceBet(
    int? raceId, {
    String? raceName,
    List<RaceSummary>? availableRaces,
  }) async {
    if (_loadingBettableRaces) return;

    // Nếu chưa biết race cụ thể VÀ chưa có sẵn dropdown race → tải danh sách
    // race bettable từ backend để màn đặt cược hiển thị dropdown chọn race.
    List<RaceSummary>? races = availableRaces;
    if (raceId == null && (races == null || races.isEmpty)) {
      setState(() => _loadingBettableRaces = true);
      try {
        races = await _tournamentsService.listBettableRaces();
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppColors.errorText,
            content: Text(
              'Không tải được danh sách chặng đua: '
              '${e.toString().replaceFirst('Exception: ', '')}',
            ),
          ),
        );
        setState(() => _loadingBettableRaces = false);
        return;
      }
      if (!mounted) return;
      setState(() => _loadingBettableRaces = false);

      if (races.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppColors.errorText,
            content: Text(
              'Hiện chưa có chặng đua nào mở cược. Vui lòng quay lại sau.',
            ),
          ),
        );
        return;
      }
    }

    final args = PlaceBetArgs(
      raceId: raceId,
      raceName: raceName,
      availableRaces: races,
    );
    final result = await Navigator.of(context).push<PlaceBetResult>(
      MaterialPageRoute(
        builder: (_) => PlaceBetScreen(api: _api, args: args),
      ),
    );

    if (!mounted) return;
    if (result?.success == true) {
      // Backend đã trừ tiền trong transaction — gọi refresh để 3 nơi hiển thị
      // (Trang chủ, sub-tab Ví, sub-tab Giao dịch) cùng thấy số dư + lịch sử
      // giao dịch mới. Chạy song song, không chờ nhau để UI nhanh.
      unawaited(Future.wait([
        _homeKey.currentState?.refresh() ?? Future.value(),
        _walletTabKey.currentState?.refreshAll() ?? Future.value(),
      ]));
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
        key: _homeKey,
        onLogout: _logout,
        onOpenTournaments: _goToTournaments,
        onOpenPlaceBet: () => _openPlaceBet(null),
        onOpenMyBets: () => _goToWallet(subTab: 1),
      ),
      PublicTournamentsScreenWithBet(
        theme: TournamentViewTheme.spectator,
        onOpenPlaceBet: (raceId, raceName, races) => _openPlaceBet(
          raceId,
          raceName: raceName,
          availableRaces: races,
        ),
      ),
      _SpectatorWalletTab(
        key: _walletTabKey,
        api: _api,
        initialSubTab: _walletSubTab,
        onSubTabChanged: (i) => setState(() => _walletSubTab = i),
        onOpenPlaceBet: (raceId) => _openPlaceBet(raceId),
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
              onPressed: _loadingBettableRaces
                  ? null
                  : () => _openPlaceBet(null),
              icon: _loadingBettableRaces
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Icon(Icons.add),
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
///
/// Expose [refreshWallet] / [refreshTransactions] để shell có thể yêu cầu các
/// sub-screen reload dữ liệu (vd: sau khi đặt cược thành công cần refresh số dư
/// ví + lịch sử giao dịch, vì backend đã trừ tiền trong transaction nhưng UI đang
/// cache state cũ).
class _SpectatorWalletTab extends StatefulWidget {
  const _SpectatorWalletTab({
    super.key,
    required this.api,
    required this.initialSubTab,
    required this.onSubTabChanged,
    required this.onOpenPlaceBet,
  });

  final SpectatorApi api;
  final int initialSubTab;
  final ValueChanged<int> onSubTabChanged;

  /// Mở màn đặt cược. Tự tải danh sách race bettable khi không truyền raceId.
  final Future<void> Function(int? raceId) onOpenPlaceBet;

  @override
  State<_SpectatorWalletTab> createState() => _SpectatorWalletTabState();
}

class _SpectatorWalletTabState extends State<_SpectatorWalletTab> {
  final _walletKey = GlobalKey<SpectatorWalletScreenState>();
  final _transactionsKey = GlobalKey<SpectatorTransactionsScreenState>();
  final _predictionsKey = GlobalKey<SpectatorPredictionsScreenState>();

  /// Refresh cả 3 sub-tab — dùng sau khi đặt cược / hủy cược để cân đối
  /// ví + cược + lịch sử giao dịch. An toàn khi gọi khi widget chưa mount.
  Future<void> refreshAll() async {
    await Future.wait([
      _walletKey.currentState?.refresh() ?? Future.value(),
      _predictionsKey.currentState?.refresh() ?? Future.value(),
      _transactionsKey.currentState?.refresh() ?? Future.value(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      initialIndex: widget.initialSubTab.clamp(0, 2),
      child: Column(
        children: [
          Material(
            color: Colors.white,
            child: TabBar(
              onTap: widget.onSubTabChanged,
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
                  key: _walletKey,
                  api: widget.api,
                  onOpenTransactions: () => widget.onSubTabChanged(2),
                ),
                SpectatorPredictionsScreen(
                  key: _predictionsKey,
                  api: widget.api,
                  onOpenPlaceBet: (int? raceId) {
                    widget.onOpenPlaceBet(raceId);
                  },
                ),
                SpectatorTransactionsScreen(
                  key: _transactionsKey,
                  api: widget.api,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Tab "Giải đấu" cho khán giả — danh sách giải + bấm vào giải để mở chi tiết
/// (danh sách race, nút "Đặt cược" cho từng race). FAB nhanh mở form đặt cược
/// khi user chưa chọn được race cụ thể.
class PublicTournamentsScreenWithBet extends StatelessWidget {
  const PublicTournamentsScreenWithBet({
    super.key,
    required this.theme,
    required this.onOpenPlaceBet,
  });

  final TournamentViewTheme theme;

  /// Callback khi user nhấn "Đặt cược" ở 1 race trong `PublicTournamentDetailScreen`.
  /// Truyền (raceId, raceName, races) — race đã được chọn sẵn + danh sách race của
  /// giải để làm dropdown chọn lại trong màn đặt cược.
  final void Function(int raceId, String raceName, List<RaceSummary> races)
      onOpenPlaceBet;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        PublicTournamentsScreen(
          theme: theme,
          onOpenDetail: (t) {
            final id = t.tournamentId;
            if (id == null) return;
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) => PublicTournamentDetailScreen(
                  tournamentId: id,
                  theme: theme,
                  onPlaceBet: (raceId, raceName, races) =>
                      onOpenPlaceBet(raceId, raceName, races),
                ),
              ),
            );
          },
        ),
        Positioned(
          right: 16,
          bottom: 16,
          child: FloatingActionButton.extended(
            backgroundColor: AppColors.green,
            foregroundColor: Colors.white,
            onPressed: () => onOpenPlaceBet(0, '', const []),
            icon: const Icon(Icons.add),
            label: const Text('Đặt cược'),
          ),
        ),
      ],
    );
  }
}
