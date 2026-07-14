import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import 'referee_home_screen.dart';
import 'referee_conflicts_screen.dart';
import 'referee_submissions_screen.dart';
import 'referee_profile_screen.dart';
import 'referee_violations_screen.dart';

class RefereeShell extends StatefulWidget {
  const RefereeShell({super.key, this.showWelcome = false});

  final bool showWelcome;

  @override
  State<RefereeShell> createState() => _RefereeShellState();
}

class _RefereeShellState extends State<RefereeShell> {
  int _index = 0;

  Future<void> _logout() async {
    await AuthService().logout();
    if (!mounted) return;
    Navigator.of(context).pushNamedAndRemoveUntil('/login', (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      RefereeHomeScreen(showWelcome: widget.showWelcome),
      const RefereeConflictsScreen(),
      const RefereeSubmissionsScreen(),
      const RefereeViolationsScreen(),
      const RefereeProfileScreen(),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: Colors.white,
        indicatorColor: AppColors.adminAccent.withValues(alpha: 0.45),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.sports_score_outlined),
            selectedIcon: Icon(Icons.sports_score, color: AppColors.adminAccent),
            label: 'Trận đấu',
          ),
          NavigationDestination(
            icon: Icon(Icons.compare_arrows_outlined),
            selectedIcon: Icon(Icons.compare_arrows, color: AppColors.adminAccent),
            label: 'Tranh chấp',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history, color: AppColors.adminAccent),
            label: 'Nộp kết quả',
          ),
          NavigationDestination(
            icon: Icon(Icons.warning_amber_rounded),
            selectedIcon: Icon(Icons.warning_amber, color: AppColors.adminAccent),
            label: 'Vi phạm',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: AppColors.adminAccent),
            label: 'Cá nhân',
          ),
        ],
      ),
    );
  }
}
