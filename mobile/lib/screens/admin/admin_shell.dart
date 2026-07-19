import 'dart:async';

import 'package:flutter/material.dart';

import '../../models/notification.dart';
import '../../services/auth_service.dart';
import '../../services/realtime/notification_center.dart';
import '../../theme/app_theme.dart';
import '../../widgets/login_welcome.dart';
import '../../widgets/notification_history_sheet.dart';
import '../home_router.dart';
import 'admin_horses_screen.dart';
import 'admin_races_screen.dart';
import 'admin_race_ai_screen.dart';
import 'admin_tournaments_screen.dart';
import 'admin_users_screen.dart';
import 'admin_wallets_screen.dart';

class AdminShell extends StatefulWidget {
  const AdminShell({super.key, this.showWelcome = false});

  final bool showWelcome;

  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int _tabIndex = 0;

  @override
  void initState() {
    super.initState();
    if (widget.showWelcome) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showLoginWelcomeSnackBar(context, roleCode: 'ADMIN');
      });
    }
    // Lắng nghe notification stream để show SnackBar.
    _notificationSubscription = NotificationCenter.instance.stream.listen((
      notifications,
    ) {
      if (!mounted || notifications.isEmpty) return;
      final latest = notifications.first;
      if (latest.isRead) return;
      if (latest.type == 'RACE_FINISHED') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.flag, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(child: Text(latest.body)),
              ],
            ),
            backgroundColor: AppColors.adminAccent,
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

  late final StreamSubscription<List<AppNotification>>
  _notificationSubscription;

  Future<void> _logout() async {
    await AuthService().logout();
    if (!mounted) return;
    await HomeRouter.openLogin(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: _AdminAppBar(onLogout: _logout),
      ),
      body: IndexedStack(
        index: _tabIndex,
        children: [
          AdminUsersScreen(onLogout: _logout),
          AdminWalletsScreen(onLogout: _logout),
          AdminTournamentsScreen(onLogout: _logout),
          AdminRacesScreen(onLogout: _logout),
          AdminRaceAiScreen(),
          AdminHorsesScreen(onLogout: _logout),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tabIndex,
        backgroundColor: Colors.white,
        indicatorColor: AppColors.adminAccent.withValues(alpha: 0.15),
        onDestinationSelected: (index) => setState(() => _tabIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Người dùng',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Ví điểm',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events),
            label: 'Giải đấu',
          ),
          NavigationDestination(
            icon: Icon(Icons.flag_outlined),
            selectedIcon: Icon(Icons.flag),
            label: 'Cuộc đua',
          ),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon: Icon(Icons.auto_awesome),
            label: 'AI Analysis',
          ),
          NavigationDestination(
            icon: Icon(Icons.pets_outlined),
            selectedIcon: Icon(Icons.pets),
            label: 'Ngựa',
          ),
        ],
      ),
    );
  }
}

class _AdminAppBar extends StatelessWidget {
  const _AdminAppBar({required this.onLogout});

  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.adminDeep,
      foregroundColor: Colors.white,
      elevation: 0,
      title: const Text('Admin Panel'),
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
                      constraints: const BoxConstraints(
                        minWidth: 18,
                        minHeight: 18,
                      ),
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
        IconButton(
          icon: const Icon(Icons.logout),
          onPressed: () {
            showDialog(
              context: context,
              builder: (ctx) => AlertDialog(
                title: const Text('Đăng xuất'),
                content: const Text('Bạn có chắc muốn đăng xuất?'),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Huỷ'),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      context
                          .findAncestorStateOfType<_AdminShellState>()
                          ?._logout();
                    },
                    child: const Text('Đăng xuất'),
                  ),
                ],
              ),
            );
          },
          tooltip: 'Đăng xuất',
        ),
      ],
    );
  }
}
