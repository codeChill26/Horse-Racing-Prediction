import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../utils/role_labels.dart';

/// SnackBar "Đăng nhập thành công" — gọi sau login với [showWelcome: true].
void showLoginWelcomeSnackBar(BuildContext context, {String? roleCode}) {
  final label = roleLabelVi(roleCode);
  final bg = _backgroundForRole(roleCode);

  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 88),
      backgroundColor: bg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      duration: const Duration(seconds: 4),
      content: Row(
        children: [
          const Icon(Icons.check_circle_rounded, color: Colors.white),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Đăng nhập thành công! Chào mừng bạn đến khu vực $label.',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    ),
  );
}

Color _backgroundForRole(String? roleCode) {
  switch (roleCode?.trim().toUpperCase()) {
    case 'SPECTATOR':
      return const Color(0xFF065F46);
    case 'JOCKEY':
      return AppColors.jockeyDeep;
    case 'HORSE_OWNER':
      return AppColors.ownerDeep;
    case 'ADMIN':
      return AppColors.adminDeep;
    case 'RACE_REFEREE':
      return const Color(0xFF1E3A5F);
    default:
      return AppColors.greenDeep;
  }
}
