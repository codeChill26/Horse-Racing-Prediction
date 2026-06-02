import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import '../home_router.dart';
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            behavior: SnackBarBehavior.floating,
            margin: const EdgeInsets.fromLTRB(16, 0, 16, 88),
            backgroundColor: const Color(0xFF065F46),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            duration: const Duration(seconds: 4),
            content: const Row(
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Đăng nhập thành công! Chào mừng bạn đến khu vực khán giả.',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        );
      });
    }
  }

  Future<void> _logout() async {
    await AuthService().logout();
    if (!mounted) return;
    await HomeRouter.openLogin(context);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      SpectatorHomeScreen(onLogout: _logout),
      SpectatorProfileScreen(onLogout: _logout),
    ];

    return Scaffold(
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
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person_rounded, color: AppColors.green),
            label: 'Cá nhân',
          ),
        ],
      ),
    );
  }
}
