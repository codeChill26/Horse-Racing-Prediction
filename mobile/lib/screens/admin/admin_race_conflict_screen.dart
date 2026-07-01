import 'package:flutter/material.dart';

import '../../models/admin_race.dart';
import '../../services/admin_races_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';

/// Màn hình full: xem side-by-side 2 trọng tài, sau đó nhập rank cuối + reason.
Future<Map<String, dynamic>?> pushConflictResolver(
  BuildContext context, {
  required int raceId,
}) {
  return Navigator.push<Map<String, dynamic>>(
    context,
    MaterialPageRoute(
      builder: (_) => _ConflictResolverScreen(raceId: raceId),
    ),
  );
}

class _ConflictResolverScreen extends StatefulWidget {
  const _ConflictResolverScreen({required this.raceId});

  final int raceId;

  @override
  State<_ConflictResolverScreen> createState() => _ConflictResolverScreenState();
}

class _ConflictResolverScreenState extends State<_ConflictResolverScreen> {
  final _service = AdminRacesService();
  final _reasonCtrl = TextEditingController();

  ConflictResponse? _conflict;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  /// Map: entryId -> rank (1/2/3/...)
  final Map<int, int> _ranks = {};

  /// Flattened list of unique entries từ cả 2 bảng
  List<ConflictRanking> get _entries {
    final subs = _conflict?.submissions ?? const [];
    final byId = <int, ConflictRanking>{};
    for (final sub in subs) {
      for (final r in sub.rankings) {
        if (r.entryId != null) byId[r.entryId!] = r;
      }
    }
    return byId.values.toList();
  }

  List<ConflictSubmission> get _submissions =>
      _conflict?.submissions ?? const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final resp = await _service.reviewConflict(widget.raceId);
      if (!mounted) return;
      setState(() {
        _conflict = resp;
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

  Future<void> _submit() async {
    final reason = _reasonCtrl.text.trim();
    if (reason.length < 5) {
      setState(() => _error = 'Lý do bắt buộc tối thiểu 5 ký tự.');
      return;
    }
    final ranked = _ranks.entries
        .where((kv) => kv.value > 0)
        .map((kv) => {'entryId': kv.key, 'rank': kv.value})
        .toList()
      ..sort((a, b) => (a['rank'] as int).compareTo(b['rank'] as int));

    if (ranked.isEmpty) {
      setState(() => _error = 'Vui lòng nhập thứ hạng ít nhất cho 1 ngựa.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final result = await _service.resolveConflict(
        widget.raceId,
        rankings: ranked,
        reason: reason,
      );
      if (!mounted) return;
      Navigator.of(
        context,
      ).pop({
        'ok': true,
        'recordedRankings': result.recordedRankings,
        'raceStatus': result.status,
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        title: Text('Giải quyết tranh chấp · Race #${widget.raceId}'),
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.adminAccent),
            )
          : _error != null && _conflict == null
              ? _ErrorBody(message: _error!, onRetry: _load)
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                  children: [
                    if (_conflict != null &&
                        (_conflict!.submissions.length < 2 ||
                            _conflict!.alreadyAgreed))
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _conflict!.alreadyAgreed
                              ? const Color(0xFFECFDF5)
                              : AppColors.errorBg,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _conflict!.alreadyAgreed
                                ? const Color(0xFFA7F3D0)
                                : AppColors.errorBorder,
                          ),
                        ),
                        child: Text(
                          _conflict!.alreadyAgreed
                              ? 'Hai trọng tài đã đồng thuận — race tự chuyển sang PENDING_RESULT. Admin không cần can thiệp.'
                              : 'Race không ở trạng thái PAUSED hoặc chưa có đủ 2 trọng tài nộp kết quả.',
                          style: TextStyle(
                            color: _conflict!.alreadyAgreed
                                ? const Color(0xFF065F46)
                                : AppColors.errorText,
                          ),
                        ),
                      ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Kết quả 2 trọng tài',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.heading,
                            ),
                          ),
                        ),
                        if (_conflict != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: _conflict!.isResolved
                                  ? const Color(0xFFECFDF5)
                                  : const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _conflict!.isResolved
                                  ? 'Đồng thuận'
                                  : 'Lệch nhau',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: _conflict!.isResolved
                                    ? const Color(0xFF065F46)
                                    : const Color(0xFF92400E),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_submissions.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        child: Center(
                          child: Text(
                            'Chưa có trọng tài nào nộp kết quả.',
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                        ),
                      )
                    else
                      ..._submissions.map(
                        (s) => _SubmissionCard(submission: s),
                      ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Kết quả chính thức do Admin quyết định',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.heading,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Nhập thứ hạng (1=cao nhất). Bỏ trống nếu không xếp hạng. Race sẽ chuyển về PENDING_RESULT.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (_entries.isEmpty)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Text(
                                'Chưa có entry để xếp hạng.',
                                style: TextStyle(
                                  color: AppColors.textMuted,
                                ),
                              ),
                            )
                          else
                            ..._entries.map(_buildRankingRow),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _reasonCtrl,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              labelText: 'Lý do can thiệp * (≥ 5 ký tự)',
                              hintText: 'Mô tả ngắn gọn lý do ghi đè…',
                            ),
                          ),
                          if (_error != null) ...[
                            const SizedBox(height: 8),
                            Text(
                              _error!,
                              style: const TextStyle(
                                color: AppColors.errorText,
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                          FilledButton(
                            onPressed: (_submitting ||
                                    _submissions.length < 2 ||
                                    _conflict?.alreadyAgreed == true)
                                ? null
                                : _submit,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.adminAccent,
                              padding:
                                  const EdgeInsets.symmetric(vertical: 14),
                            ),
                            child: Text(
                              _submitting ? 'Đang lưu…' : 'Xác nhận kết quả',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildRankingRow(ConflictRanking r) {
    final id = r.entryId ?? 0;
    final rankCtrl = TextEditingController(
      text: _ranks[id]?.toString() ?? '',
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              r.horseName ?? 'Ngựa #$id',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: AppColors.heading,
              ),
            ),
          ),
          SizedBox(
            width: 60,
            child: TextField(
              controller: rankCtrl,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              decoration: const InputDecoration(
                hintText: 'rank',
                isDense: true,
                contentPadding: EdgeInsets.symmetric(vertical: 8),
              ),
              onChanged: (v) {
                final n = int.tryParse(v.trim());
                setState(() {
                  if (n == null || n < 1) {
                    _ranks.remove(id);
                  } else {
                    _ranks[id] = n;
                  }
                });
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SubmissionCard extends StatelessWidget {
  const _SubmissionCard({required this.submission});

  final ConflictSubmission submission;

  @override
  Widget build(BuildContext context) {
    final submitted = formatRaceDateTime(submission.submittedAt);
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
          Row(
            children: [
              const Icon(Icons.sports_score, color: AppColors.adminAccent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  submission.refereeName ?? 'Trọng tài #${submission.refereeId ?? '?'}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.heading,
                  ),
                ),
              ),
              Text(
                submitted,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...submission.rankings.map(
            (r) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  SizedBox(
                    width: 28,
                    child: Text(
                      '${r.rank ?? '?'}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.adminAccent,
                      ),
                    ),
                  ),
                  Expanded(child: Text(r.horseName ?? 'Ngựa #${r.entryId}')),
                  if (r.status != null)
                    Text(
                      r.status!,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: onRetry,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.adminAccent,
              ),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}
