import 'package:flutter/material.dart';

import '../../models/referee_race.dart';
import '../../services/referee_service.dart';
import '../../theme/app_theme.dart';

class RefereeSubmissionsScreen extends StatefulWidget {
  const RefereeSubmissionsScreen({super.key});

  @override
  State<RefereeSubmissionsScreen> createState() => _RefereeSubmissionsScreenState();
}

class _RefereeSubmissionsScreenState extends State<RefereeSubmissionsScreen> {
  final _service = RefereeService();
  List<RefereeSubmission> _items = const [];
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
      final items = await _service.listSubmissions();
      if (!mounted) return;
      setState(() {
        _items = items;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: const Text('Lịch sử nộp'),
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
            else if (_items.isEmpty)
              _EmptyBlock(
                icon: Icons.history,
                text: 'Bạn chưa có lịch sử nộp kết quả.',
              )
            else
              ..._items.map((item) => _SubmissionTile(submission: item)),
          ],
        ),
      ),
    );
  }
}

class _SubmissionTile extends StatelessWidget {
  const _SubmissionTile({required this.submission});

  final RefereeSubmission submission;

  @override
  Widget build(BuildContext context) {
    final submitted = submission.submittedAt;
    final time = submitted == null
        ? '—'
        : '${submitted.day.toString().padLeft(2, '0')}/${submitted.month.toString().padLeft(2, '0')}/${submitted.year} ${submitted.hour.toString().padLeft(2, '0')}:${submitted.minute.toString().padLeft(2, '0')}';
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            submission.raceName ?? 'Race #${submission.raceId}',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            'Nộp lúc: $time',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
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
