import 'package:flutter/material.dart';

import '../services/token_storage.dart';
import 'login_screen.dart';
import 'role_home_screen.dart';
import 'admin/admin_shell.dart';
import 'horse_owner/horse_owner_shell.dart';
import 'jockey/jockey_shell.dart';
import 'spectator/home_spectator.dart';

/// Điều hướng sau đăng nhập / khôi phục phiên theo role.
class HomeRouter {
  static Widget screenForRole({
    required String? role,
    required String email,
    bool showWelcome = false,
  }) {
    final normalized = role?.trim().toUpperCase();
    if (normalized == 'SPECTATOR') {
      return const HomeSpectator();
    }
    if (normalized == 'JOCKEY') {
      return JockeyShell(showWelcome: showWelcome);
    }
    if (normalized == 'HORSE_OWNER') {
      return HorseOwnerShell(showWelcome: showWelcome);
    }
    if (normalized == 'ADMIN') {
      return AdminShell(showWelcome: showWelcome);
    }
    return RoleHomeScreen(
      email: email,
      role: role,
      showWelcome: showWelcome,
    );
  }

  static Future<void> openFromStoredSession(BuildContext context) async {
    final token = await TokenStorage.getAccessToken();
    if (token == null || !context.mounted) return;
    final role = TokenStorage.parseRole(token);
    final email = TokenStorage.parseEmail(token) ?? '';
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => screenForRole(role: role, email: email),
      ),
    );
  }

  static Future<void> openAfterLogin(
    BuildContext context, {
    required String? role,
    required String email,
    bool showWelcome = false,
  }) async {
    if (!context.mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => screenForRole(
          role: role,
          email: email,
          showWelcome: showWelcome,
        ),
      ),
    );
  }

  static Future<void> openLogin(BuildContext context) async {
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }
}
