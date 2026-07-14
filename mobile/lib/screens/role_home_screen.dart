import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import '../utils/role_labels.dart';
import '../widgets/login_welcome.dart';
import 'admin/admin_shell.dart';
import 'horse_owner/horse_owner_shell.dart';
import 'jockey/jockey_shell.dart';
import 'login_screen.dart';
import 'referee/referee_shell.dart';
import 'spectator/home_spectator.dart';

/// Chỉ dùng cho vai trò chưa có màn hình (vd. RACE_REFEREE).
/// ADMIN / SPECTATOR / JOCKEY / HORSE_OWNER được chuyển sang shell tương ứng.
class RoleHomeScreen extends StatefulWidget {
  const RoleHomeScreen({
    super.key,
    required this.email,
    required this.role,
    this.showWelcome = false,
  });

  final String email;
  final String? role;
  final bool showWelcome;

  @override
  State<RoleHomeScreen> createState() => _RoleHomeScreenState();
}

class _RoleHomeScreenState extends State<RoleHomeScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.showWelcome) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showLoginWelcomeSnackBar(context, roleCode: widget.role);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    switch (widget.role?.trim().toUpperCase()) {
      case 'ADMIN':
        return AdminShell(showWelcome: widget.showWelcome);
      case 'SPECTATOR':
        return const HomeSpectator();
      case 'JOCKEY':
        return JockeyShell(showWelcome: widget.showWelcome);
      case 'HORSE_OWNER':
        return HorseOwnerShell(showWelcome: widget.showWelcome);
      case 'RACE_REFEREE':
        return const RefereeShell();
      default:
        return _UnsupportedRolePlaceholder(
          email: widget.email,
          role: widget.role,
        );
    }
  }
}

class _UnsupportedRolePlaceholder extends StatelessWidget {
  const _UnsupportedRolePlaceholder({
    required this.email,
    required this.role,
  });

  final String email;
  final String? role;

  @override
  Widget build(BuildContext context) {
    final roleLabel = roleLabelVi(role);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Horse Racing'),
        backgroundColor: AppColors.greenDeep,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Đăng xuất',
            onPressed: () async {
              await AuthService().logout();
              if (!context.mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (_) => false,
              );
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Xin chào',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: AppColors.heading,
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              email,
              style: const TextStyle(fontSize: 16, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            Chip(
              label: Text(roleLabel),
              backgroundColor: const Color(0xFFE8F5E9),
              side: const BorderSide(color: AppColors.green),
            ),
            const SizedBox(height: 24),
            const Text(
              'Màn hình theo vai trò trên mobile sẽ được bổ sung sau. '
              'Hiện tại bạn có thể dùng đầy đủ tính năng trên web.',
              style: TextStyle(color: AppColors.textMuted, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }
}
