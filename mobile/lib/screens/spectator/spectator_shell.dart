import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/notification.dart';
import '../../services/auth_service.dart';
import '../../services/realtime/notification_center.dart';
import '../../theme/app_theme.dart';
import '../../widgets/login_welcome.dart';
import '../../widgets/notification_history_sheet.dart';
import '../home_router.dart';
import '../tournaments/public_tournaments_screen.dart';
import '../tournaments/tournament_view_theme.dart';
import 'spectator_home_screen.dart';
import 'spectator_profile_screen.dart';

class SpectatorShell extends StatefulWidget {
  const SpectatorShell({super.key, this.showWelcome = false});

  final bool showWelcome;

  @override
  State<SpectatorShell> createState() => _SpectatorShellState();
}

class _SpectatorShellState extends State<SpectatorShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    if (widget.showWelcome) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showLoginWelcomeSnackBar(context, roleCode: 'SPECTATOR');
      });
    }
    // Lắng nghe notification stream để show SnackBar.
    _notificationSubscription = NotificationCenter.instance.stream.listen((notifications) {
      if (!mounted || notifications.isEmpty) return;
      final latest = notifications.first;
      if (latest.isRead) return;

      final innerType = latest.type;

      if (innerType == 'BET_WON') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.celebration, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(child: Text(latest.body)),
              ],
            ),
            backgroundColor: AppColors.green,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
      } else if (innerType == 'BET_LOST') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.sentiment_dissatisfied, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(child: Text(latest.body)),
              ],
            ),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
      } else if (innerType == 'BET_WIN_REVERSAL') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.replay, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(child: Text(latest.body)),
              ],
            ),
            backgroundColor: Colors.orange,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 4),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _notificationSubscription.cancel();
    super.dispose();
  }

  late final StreamSubscription<List<AppNotification>> _notificationSubscription;

  Future<void> _logout() async {
    await AuthService().logout();
    if (!mounted) return;
    await HomeRouter.openLogin(context);
  }

  void _goToTournaments() => setState(() => _index = 1);

  @override
  Widget build(BuildContext context) {
    final pages = [
      SpectatorHomeScreen(
        onLogout: _logout,
        onOpenTournaments: _goToTournaments,
      ),
      const PublicTournamentsScreen(theme: TournamentViewTheme.spectator),
      SpectatorProfileScreen(onLogout: _logout),
    ];

    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: _SpectatorAppBar(),
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
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person_rounded, color: AppColors.green),
            label: 'Cá nhân',
          ),
        ],
      ),
    );
  }
}

class _SpectatorAppBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.green,
      foregroundColor: Colors.white,
      elevation: 0,
      title: const Text('Horse Racing'),
      actions: [
        StreamBuilder<List<dynamic>>(
          stream: NotificationCenter.instance.stream,
          initialData: NotificationCenter.instance.all,
          builder: (context, snapshot) {
            final unread = NotificationCenter.instance.unreadCount;
            return Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  icon: const Icon(Icons.notifications_outlined),
                  onPressed: () => showNotificationHistorySheet(context),
                  tooltip: 'Thông báo',
                ),
                if (unread > 0)
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                      child: Text(
                        unread > 99 ? '99+' : '$unread',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}
