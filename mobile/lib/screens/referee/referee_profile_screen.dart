import 'package:flutter/material.dart';

import '../../models/referee_race.dart';
import '../../screens/login_screen.dart';
import '../../services/referee_service.dart';
import '../../services/token_storage.dart';
import '../../theme/app_theme.dart';

class RefereeProfileScreen extends StatefulWidget {
  const RefereeProfileScreen({super.key});

  @override
  State<RefereeProfileScreen> createState() => _RefereeProfileScreenState();
}

class _RefereeProfileScreenState extends State<RefereeProfileScreen> {
  final _service = RefereeService();
  RefereeProfile? _profile;
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
      final profile = await _service.getProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _logout() async {
    try {
      await _service.logout();
    } catch (_) {
      await TokenStorage.clear();
    }
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final profile = _profile;
    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: const Text('Cá nhân'),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        color: AppColors.adminAccent,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            if (_loading)
              const Center(child: CircularProgressIndicator(color: AppColors.adminAccent))
            else if (_error != null)
              _ErrorBlock(message: _error!, onRetry: _load)
            else if (profile == null)
              const _EmptyBlock(text: 'Không tải được thông tin hồ sơ.')
            else
              Column(
                children: [
                  _ProfileCard(profile: profile),
                  const SizedBox(height: 16),
                  _StatsCard(stats: profile.stats),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _logout,
                      icon: const Icon(Icons.logout_rounded),
                      label: const Text('Đăng xuất'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.errorBorder,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.profile});

  final RefereeProfile profile;

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
          Text(profile.fullName ?? '—', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 4),
          Text(profile.email ?? '', style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 8),
          Text('Vai trò: ${profile.roleCode ?? '—'}'),
          Text('SĐT: ${profile.phoneNumber ?? '—'}'),
        ],
      ),
    );
  }
}

class _StatsCard extends StatelessWidget {
  const _StatsCard({required this.stats});

  final RefereeStats stats;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          _StatRow('Được phân công', '${stats.totalRacesAssigned}'),
          _StatRow('Đã nộp', '${stats.totalLegsSubmitted}'),
          _StatRow('Tỷ lệ khớp', '${stats.autoMatchedRate}%'),
          _StatRow('Tranh chấp', '${stats.conflictCount}'),
          _StatRow('Chờ giải quyết', '${stats.pendingConflicts}'),
        ],
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  const _StatRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _EmptyBlock extends StatelessWidget {
  const _EmptyBlock({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(text, style: const TextStyle(color: AppColors.textMuted)),
    );
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.errorBg,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.errorBorder),
          ),
          child: Text(message, style: const TextStyle(color: AppColors.errorText)),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
          label: const Text('Thử lại'),
          style: FilledButton.styleFrom(backgroundColor: AppColors.adminAccent),
        ),
      ],
    );
  }
}
