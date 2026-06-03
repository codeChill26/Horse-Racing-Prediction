import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/login_welcome.dart';
import '../home_router.dart';
import '../tournaments/public_tournaments_screen.dart';
import '../tournaments/tournament_view_theme.dart';
import 'jockey_home_screen.dart';
import 'jockey_profile_screen.dart';

class JockeyShell extends StatefulWidget {
  const JockeyShell({super.key, this.showWelcome = false});

  final bool showWelcome;

  @override
  State<JockeyShell> createState() => _JockeyShellState();
}

class _JockeyShellState extends State<JockeyShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    if (widget.showWelcome) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showLoginWelcomeSnackBar(context, roleCode: 'JOCKEY');
      });
    }
  }

  Future<void> _logout() async {
    await AuthService().logout();
    if (!mounted) return;
    await HomeRouter.openLogin(context);
  }

  void _goToProfile() => setState(() => _index = 2);

  void _goToTournaments() => setState(() => _index = 1);

  @override
  Widget build(BuildContext context) {
    final pages = [
      JockeyHomeScreen(
        onLogout: _logout,
        onOpenProfile: _goToProfile,
        onOpenTournaments: _goToTournaments,
      ),
      const PublicTournamentsScreen(theme: TournamentViewTheme.jockey),
      JockeyProfileScreen(onLogout: _logout),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: Colors.white,
        indicatorColor: AppColors.jockeyAccent.withValues(alpha: 0.45),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded, color: AppColors.jockeyPrimary),
            label: 'Trang chủ',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events, color: AppColors.jockeyPrimary),
            label: 'Giải đấu',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person_rounded, color: AppColors.jockeyPrimary),
            label: 'Cá nhân',
          ),
        ],
      ),
    );
  }
}
