import 'package:flutter/material.dart';

import '../../models/user_profile.dart';
import '../../services/profile_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';

class JockeyProfileScreen extends StatefulWidget {
  const JockeyProfileScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<JockeyProfileScreen> createState() => _JockeyProfileScreenState();
}

class _JockeyProfileScreenState extends State<JockeyProfileScreen> {
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
    final complete = _user?.isProfileComplete == true;

    return Scaffold(
      backgroundColor: AppColors.jockeyMuted,
      appBar: AppBar(
        title: const Text('Trang cá nhân'),
        backgroundColor: AppColors.jockeyDeep,
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
        color: AppColors.jockeyPrimary,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            const Text(
              'Hồ sơ kỵ sĩ',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.heading,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Chứng chỉ hành nghề, cân nặng và thông tin liên hệ.',
              style: TextStyle(color: AppColors.textMuted, height: 1.4),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              _ErrorBanner(message: _error!, onRetry: _load),
            ],
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppColors.jockeyPrimary.withValues(alpha: 0.15),
                    child: Text(
                      _user?.initials ?? '?',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: AppColors.jockeyPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _loading ? 'Đang tải…' : (_user?.fullName ?? '—'),
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppColors.heading,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _user?.email ?? '—',
                          style: const TextStyle(color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: complete
                                ? const Color(0xFFECFDF5)
                                : const Color(0xFFFFF7ED),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: complete
                                  ? const Color(0xFFA7F3D0)
                                  : const Color(0xFFFED7AA),
                            ),
                          ),
                          child: Text(
                            complete ? 'Hồ sơ đã duyệt' : 'Hồ sơ chưa đủ',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: complete
                                  ? const Color(0xFF065F46)
                                  : const Color(0xFF9A3412),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _InfoCard(
              title: 'Thông tin hành nghề',
              rows: [
                _InfoRow(
                  label: 'Số chứng chỉ',
                  value: _loading
                      ? '—'
                      : (_user?.licenseNumber?.isNotEmpty == true
                          ? _user!.licenseNumber!
                          : 'Chưa cập nhật'),
                ),
                _InfoRow(
                  label: 'Cân nặng',
                  value: _loading
                      ? '—'
                      : (_user?.weight != null ? '${_user!.weight} kg' : '—'),
                ),
                _InfoRow(
                  label: 'Giới thiệu',
                  value: _loading
                      ? '—'
                      : (_user?.bio?.isNotEmpty == true ? _user!.bio! : '—'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _InfoCard(
              title: 'Tài khoản',
              rows: [
                _InfoRow(label: 'Số điện thoại', value: _user?.phone ?? '—'),
                _InfoRow(
                  label: 'Trạng thái',
                  value: _user?.isActive == true ? 'Đang hoạt động' : 'Tạm khóa',
                ),
                _InfoRow(
                  label: 'Ngày tạo',
                  value: formatDateTimeVi(_user?.createdAt),
                ),
              ],
            ),
            const SizedBox(height: 24),
            if (!complete && !_loading)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                ),
                child: const Text(
                  'Cập nhật số chứng chỉ và cân nặng trên web hoặc qua API profile '
                  'để được xác nhận tham gia giải.',
                  style: TextStyle(color: Color(0xFF9A3412), height: 1.45),
                ),
              ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: widget.onLogout,
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Đăng xuất'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.jockeyPrimary,
                side: const BorderSide(color: AppColors.jockeyPrimary),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.rows});

  final String title;
  final List<_InfoRow> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.heading,
            ),
          ),
          const SizedBox(height: 12),
          ...rows,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.heading,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.errorBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message, style: const TextStyle(color: AppColors.errorText)),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}
