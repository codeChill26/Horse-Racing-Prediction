import 'package:flutter/material.dart';

import '../../models/user_profile.dart';
import '../../services/profile_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';

class SpectatorProfileScreen extends StatefulWidget {
  const SpectatorProfileScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<SpectatorProfileScreen> createState() => _SpectatorProfileScreenState();
}

class _SpectatorProfileScreenState extends State<SpectatorProfileScreen> {
  final _profileService = ProfileService();
  UserProfile? _user;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final user = await _profileService.getMyProfile();
      if (!mounted) return;
      setState(() {
        _user = user;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _user = null;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final balance = _user?.pointWallet?.balance ?? 0;
    final frozen = _user?.pointWallet?.isFrozen ?? false;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F5),
      appBar: AppBar(
        title: const Text('Trang cá nhân'),
        backgroundColor: AppColors.greenDeep,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            tooltip: 'Tải lại',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.green,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            const Text(
              'Hồ sơ khán giả',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.heading,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Thông tin tài khoản khán giả của bạn',
              style: TextStyle(color: AppColors.textMuted),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.errorBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.errorBorder),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: AppColors.errorText),
                      ),
                    ),
                    TextButton(onPressed: _load, child: const Text('Thử lại')),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),
            _ProfileHeader(
              loading: _loading,
              initials: _user?.initials ?? '?',
              fullName: _user?.fullName ?? '—',
              email: _user?.email ?? '—',
            ),
            const SizedBox(height: 16),
            _InfoCard(
              title: 'Ví điểm',
              children: [
                _ProfileRow(
                  label: 'Số dư',
                  value: _loading ? '—' : '${formatPointsVi(balance)} điểm',
                  highlight: true,
                ),
                _ProfileRow(
                  label: 'Trạng thái',
                  value: frozen ? 'Đang khóa' : 'Hoạt động',
                  valueColor: frozen ? AppColors.errorText : AppColors.green,
                ),
              ],
            ),
            const SizedBox(height: 12),
            _InfoCard(
              title: 'Tài khoản',
              children: [
                _ProfileRow(label: 'Họ tên', value: _user?.fullName ?? '—'),
                _ProfileRow(label: 'Email', value: _user?.email ?? '—'),
                _ProfileRow(label: 'Điện thoại', value: _user?.phone?.isNotEmpty == true ? _user!.phone! : '—'),
                _ProfileRow(label: 'Vai trò', value: _user?.roleName ?? 'Khán giả'),
                _ProfileRow(
                  label: 'Ngày tạo',
                  value: formatDateTimeVi(_user?.createdAt),
                ),
              ],
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: widget.onLogout,
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Đăng xuất'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.errorText,
                side: const BorderSide(color: AppColors.errorBorder),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({
    required this.loading,
    required this.initials,
    required this.fullName,
    required this.email,
  });

  final bool loading;
  final String initials;
  final String fullName;
  final String email;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.greenDeep, AppColors.green],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.greenDeep.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 32,
            backgroundColor: Colors.white.withValues(alpha: 0.2),
            child: Text(
              loading ? '…' : initials,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  loading ? 'Đang tải…' : fullName,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  email,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
              color: AppColors.heading,
            ),
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _ProfileRow extends StatelessWidget {
  const _ProfileRow({
    required this.label,
    required this.value,
    this.highlight = false,
    this.valueColor,
  });

  final String label;
  final String value;
  final bool highlight;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: highlight ? 16 : 14,
                fontWeight: highlight ? FontWeight.w700 : FontWeight.w500,
                color: valueColor ?? AppColors.heading,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
