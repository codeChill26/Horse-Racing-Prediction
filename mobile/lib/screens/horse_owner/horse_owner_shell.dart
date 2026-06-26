import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/login_welcome.dart';
import '../home_router.dart';
import 'horse_owner_home_screen.dart';
import 'horse_owner_invitations_screen.dart';
import 'horse_owner_profile_screen.dart';
import '../tournaments/public_tournaments_screen.dart';
import '../tournaments/tournament_view_theme.dart';

class HorseOwnerShell extends StatefulWidget {
  const HorseOwnerShell({super.key, this.showWelcome = false});

  final bool showWelcome;

  @override
  State<HorseOwnerShell> createState() => _HorseOwnerShellState();
}

class _HorseOwnerShellState extends State<HorseOwnerShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    if (widget.showWelcome) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showLoginWelcomeSnackBar(context, roleCode: 'HORSE_OWNER');
      });
    }
  }

  Future<void> _logout() async {
    await AuthService().logout();
    if (!mounted) return;
    await HomeRouter.openLogin(context);
  }

  void _goToProfile() => setState(() => _index = 3);

  void _goToTournaments() => setState(() => _index = 1);

  void _goToInvitations() => setState(() => _index = 2);

  @override
  Widget build(BuildContext context) {
    final pages = [
      HorseOwnerHomeScreen(
        onLogout: _logout,
        onOpenProfile: _goToProfile,
        onOpenTournaments: _goToTournaments,
        onOpenInvitations: _goToInvitations,
      ),
      const PublicTournamentsScreen(theme: TournamentViewTheme.horseOwner),
      const HorseOwnerInvitationsScreen(),
      HorseOwnerProfileScreen(onLogout: _logout),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        backgroundColor: Colors.white,
        indicatorColor: AppColors.ownerGold.withValues(alpha: 0.35),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded, color: AppColors.ownerPrimary),
            label: 'Trang chủ',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events, color: AppColors.ownerPrimary),
            label: 'Giải đấu',
          ),
          NavigationDestination(
            icon: Icon(Icons.mail_outline),
            selectedIcon: Icon(Icons.mail_rounded, color: AppColors.ownerPrimary),
            label: 'Kỵ sĩ',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person_rounded, color: AppColors.ownerPrimary),
            label: 'Cá nhân',
          ),
        ],
      ),
    );
  }
}
