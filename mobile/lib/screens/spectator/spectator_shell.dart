import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/login_welcome.dart';
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
  }

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
