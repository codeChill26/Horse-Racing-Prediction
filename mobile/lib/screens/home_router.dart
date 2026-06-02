import 'package:flutter/material.dart';

import '../services/token_storage.dart';
import 'login_screen.dart';
import 'role_home_screen.dart';
import 'spectator/spectator_shell.dart';

/// Điều hướng sau đăng nhập / khôi phục phiên theo role.
class HomeRouter {
  static Widget screenForRole({
    required String? role,
    required String email,
    bool showWelcome = false,
  }) {
    final normalized = role?.trim().toUpperCase();
    if (normalized == 'SPECTATOR') {
      return SpectatorShell(showWelcome: showWelcome);
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
