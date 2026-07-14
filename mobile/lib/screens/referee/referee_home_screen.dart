import 'package:flutter/material.dart';

import '../../services/auth_service.dart';
import '../../services/referee_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';
import '../../widgets/login_welcome.dart';
import 'referee_race_detail_screen.dart';
import 'referee_conflicts_screen.dart';
import 'referee_submissions_screen.dart';
import 'referee_profile_screen.dart';
import 'referee_report_violation_sheet.dart';

class RefereeHomeScreen extends StatefulWidget {
  const RefereeHomeScreen({
    super.key,
    this.showWelcome = false,
    this.onLogout,
    this.onOpenProfile,
    this.onOpenConflicts,
    this.onOpenSubmissions,
    this.onOpenViolationReport,
  });

  final bool showWelcome;
  final VoidCallback? onLogout;
  final VoidCallback? onOpenProfile;
  final VoidCallback? onOpenConflicts;
  final VoidCallback? onOpenSubmissions;
  final VoidCallback? onOpenViolationReport;

  @override
  State<RefereeHomeScreen> createState() => _RefereeHomeScreenState();
}

class _RefereeHomeScreenState extends State<RefereeHomeScreen> {
  final _service = RefereeService();
  List<Map<String, dynamic>> _races = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.showWelcome) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        showLoginWelcomeSnackBar(context, roleCode: 'RACE_REFEREE');
      });
    }
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final races = await _service.listAssignedRaces();
      if (!mounted) return;
      setState(() {
        _races = List<Map<String, dynamic>>.from(races.map((e) {
          final json = <String, dynamic>{};
          json['race'] = e;
          return json;
        }).toList());
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

  Future<void> _refresh() async {
    await _load();
  }

  Future<void> _openDetail(Map<String, dynamic> item) async {
    final race = item['race'] as dynamic;
    final raceId = race.raceId;
    if (raceId == null) return;

    final refreshed = await Navigator.of(context).push<Map<String, dynamic>>(
      MaterialPageRoute(
        builder: (_) => RefereeRaceDetailScreen(raceId: raceId),
      ),
    );
    if (refreshed != null && mounted) {
      await _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final list = _races.map((item) {
      final race = item['race'];
      return _RaceTile(
        race: race,
        onTap: () => _openDetail(item),
      );
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: const Text('Trọng tài'),
        actions: [
          IconButton(
            tooltip: 'Báo cáo vi phạm',
            onPressed: widget.onOpenViolationReport ??
                () {
                  showRefereeReportViolationSheet(context);
                },
            icon: const Icon(Icons.report_gmailerrorred),
          ),
          IconButton(
            tooltip: 'Lịch sử nộp',
            onPressed: widget.onOpenSubmissions ??
                () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const RefereeSubmissionsScreen(),
                    ),
                  );
                },
            icon: const Icon(Icons.history),
          ),
          IconButton(
            tooltip: 'Tranh chấp',
            onPressed: widget.onOpenConflicts ??
                () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const RefereeConflictsScreen(),
                    ),
                  );
                },
            icon: const Icon(Icons.compare_arrows),
          ),
          IconButton(
            tooltip: 'Cá nhân',
            onPressed: widget.onOpenProfile ??
                () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const RefereeProfileScreen(),
                    ),
                  ).then((_) => _refresh());
                },
            icon: const Icon(Icons.person),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: AppColors.adminAccent,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            if (_loading)
              const Center(child: CircularProgressIndicator(color: AppColors.adminAccent))
            else if (_error != null)
              _ErrorBlock(message: _error!, onRetry: _refresh)
            else if (_races.isEmpty)
              _EmptyBlock(
                icon: Icons.sports_score,
                text: 'Bạn chưa được phân công trận đấu nào.',
              )
            else
              ...list,
          ],
        ),
      ),
    );
  }
}

class _RaceTile extends StatelessWidget {
  const _RaceTile({required this.race, required this.onTap});

  final dynamic race;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final name = race.name?.toString() ?? 'Race #${race.raceId}';
    final status = (race.status ?? '').toUpperCase();
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${race.tournamentName ?? 'Giải đấu'} · ${raceStatusLabelVi(race.status)}',
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
            Chip(
              label: Text(raceStatusLabelVi(race.status)),
              backgroundColor: raceStatusBg(race.status).withValues(alpha: 0.15),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyBlock extends StatelessWidget {
  const _EmptyBlock({required this.icon, required this.text});

  final IconData icon;
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
      child: Column(
        children: [
          Icon(icon, color: AppColors.textMuted, size: 28),
          const SizedBox(height: 8),
          Text(text, style: const TextStyle(color: AppColors.textMuted)),
        ],
      ),
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
