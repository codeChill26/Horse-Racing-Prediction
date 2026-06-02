import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';

const roleLabels = {
  'ADMIN': 'Quản trị viên',
  'RACE_REFEREE': 'Trọng tài',
  'HORSE_OWNER': 'Chủ ngựa',
  'JOCKEY': 'Kỵ sĩ',
  'SPECTATOR': 'Khán giả',
};

class RoleHomeScreen extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final roleLabel = roleLabels[role] ?? role ?? 'Người dùng';

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
            if (showWelcome)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(bottom: 20),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle, color: Color(0xFF059669)),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Đăng nhập thành công!',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF065F46),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
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
