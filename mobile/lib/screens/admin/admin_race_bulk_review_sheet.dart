import 'package:flutter/material.dart';

import '../../models/admin_race.dart';
import '../../services/admin_races_service.dart';
import '../../theme/app_theme.dart';

/// Bottom sheet bulk review: bật/tắt nhanh từng entry rồi gọi POST /bulk-review.
Future<Map<String, dynamic>?> showBulkReviewSheet(
  BuildContext context, {
  required int raceId,
  required List<RaceEntry> entries,
  int? approvedCount,
  int? maxEntries,
}) {
  return showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _BulkReviewSheet(
      raceId: raceId,
      entries: entries,
      approvedCount: approvedCount,
      maxEntries: maxEntries,
    ),
  );
}

class _BulkReviewSheet extends StatefulWidget {
  const _BulkReviewSheet({
    required this.raceId,
    required this.entries,
    this.approvedCount,
    this.maxEntries,
  });

  final int raceId;
  final List<RaceEntry> entries;
  final int? approvedCount;
  final int? maxEntries;

  @override
  State<_BulkReviewSheet> createState() => _BulkReviewSheetState();
}

class _BulkReviewSheetState extends State<_BulkReviewSheet> {
  /// Map: entryId -> {status: 'APPROVED'|'REJECTED', reason: String}
  final Map<int, _ReviewDecision> _decisions = {};
  bool _submitting = false;
  String? _error;

  List<RaceEntry> get _pending => widget.entries
      .where((e) => e.status == 'PENDING' && e.entryId != null)
      .toList();

  @override
  Widget build(BuildContext context) {
    final pending = _pending;
    // Nếu caller truyền approvedCount/maxEntries (từ EntriesResponse) thì tính slot thực;
    // fallback về đếm trên list người gọi truyền vào.
    final totalApproved =
        widget.approvedCount ??
        widget.entries.where((e) => e.status == 'APPROVED').length;
    final totalSlots = widget.maxEntries ?? 8;
    final remainingSlots = (totalSlots - totalApproved).clamp(0, totalSlots);
    final contextSummary = 'Race #${widget.raceId} · '
        'Slot: $totalApproved/$totalSlots (còn $remainingSlots) · '
        'Chờ duyệt: ${pending.length}';

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Duyệt entry hàng loạt',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.heading,
            ),
          ),
          Text(
            contextSummary,
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          const SizedBox(height: 12),
          if (pending.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'Không còn entry nào đang chờ duyệt.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
            )
          else
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: pending.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (ctx, i) {
                  final e = pending[i];
                  final decision = _decisions[e.entryId];
                  // Đếm đã APPROVED lẽ ra phải đến để vô hiệu hoá nút Duyệt trên từng entry
                  var proposedApprovals = 0;
                  for (final v in _decisions.values) {
                    if (v.status == 'APPROVED') proposedApprovals++;
                  }
                  final canStillApprove =
                      remainingSlots - proposedApprovals > 0;
                  return _EntryRow(
                    entry: e,
                    decision: decision,
                    remainingSlots: canStillApprove ? 1 : 0,
                    onApprove: () => setState(() {
                      _decisions[e.entryId!] =
                          const _ReviewDecision(status: 'APPROVED');
                    }),
                    onReject: () async {
                      final reason = await _promptReason(
                        horseName: e.horseName ?? '#${e.entryId}',
                      );
                      if (reason == null) return;
                      if (!mounted) return;
                      setState(() {
                        _decisions[e.entryId!] = _ReviewDecision(
                          status: 'REJECTED',
                          reason: reason,
                        );
                      });
                    },
                    onClear: () => setState(() {
                      _decisions.remove(e.entryId);
                    }),
                  );
                },
              ),
            ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: AppColors.errorText)),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: (_submitting || remainingSlots == 0)
                      ? null
                      : () {
                          var remaining = remainingSlots;
                          for (final e in pending) {
                            if (remaining <= 0) break;
                            _decisions[e.entryId!] =
                                const _ReviewDecision(status: 'APPROVED');
                            remaining--;
                          }
                          setState(() {});
                        },
                  icon: const Icon(Icons.done_all),
                  label: Text(
                    remainingSlots == 0
                        ? 'Hết slot'
                        : 'Duyệt tất cả (còn $remainingSlots slot)',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  onPressed:
                      (_submitting || _decisions.isEmpty) ? null : _submit,
                  icon: const Icon(Icons.check),
                  label: Text(
                    _submitting
                        ? 'Đang lưu…'
                        : 'Áp dụng (${_decisions.length})',
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.adminAccent,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'APPROVED sẽ được backend check maxEntries — quá slot sẽ trả về lỗi trong summary.',
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Future<String?> _promptReason({required String horseName}) async {
    final ctrl = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Từ chối $horseName'),
        content: TextField(
          controller: ctrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Lý do từ chối *',
            hintText: 'Nhập lý do từ chối entry này…',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () {
              final text = ctrl.text.trim();
              if (text.isEmpty) return;
              Navigator.pop(ctx, text);
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.adminAccent,
            ),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
    ctrl.dispose();
    return result;
  }

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final payload = _decisions.entries
          .map((kv) => {
                'entryId': kv.key,
                'status': kv.value.status,
                if (kv.value.reason != null) 'reason': kv.value.reason,
              })
          .toList();
      final summary = await AdminRacesService().bulkReviewEntries(
        widget.raceId,
        payload,
      );
      if (!mounted) return;
      Navigator.of(context).pop({'ok': true, 'summary': summary});
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _submitting = false;
      });
    }
  }
}

class _ReviewDecision {
  const _ReviewDecision({required this.status, this.reason});
  final String status;
  final String? reason;
}

class _EntryRow extends StatelessWidget {
  const _EntryRow({
    required this.entry,
    required this.decision,
    required this.onApprove,
    required this.onReject,
    required this.onClear,
    required this.remainingSlots,
  });

  final RaceEntry entry;
  final _ReviewDecision? decision;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback onClear;
  final int remainingSlots;

  @override
  Widget build(BuildContext context) {
    final isApproved = decision?.status == 'APPROVED';
    final isRejected = decision?.status == 'REJECTED';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.adminBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isApproved
              ? AppColors.ownerTeal.withValues(alpha: 0.4)
              : isRejected
                  ? const Color(0xFFFECACA)
                  : AppColors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.horseName ?? 'Ngựa #${entry.entryId}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.heading,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (entry.ownerName != null && entry.ownerName!.isNotEmpty)
                          'Chủ: ${entry.ownerName}',
                        if (entry.jockeyName != null && entry.jockeyName!.isNotEmpty)
                          'Kỵ sĩ: ${entry.jockeyName}',
                      ].join(' · '),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              if (decision != null)
                IconButton(
                  tooltip: 'Bỏ chọn',
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: onClear,
                ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: (isApproved || remainingSlots <= 0)
                      ? null
                      : onApprove,
                  icon: const Icon(Icons.check, size: 18),
                  label: Text(
                    isApproved
                        ? 'Đã duyệt'
                        : remainingSlots <= 0
                            ? 'Hết slot'
                            : 'Duyệt',
                  ),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.ownerTeal,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: onReject,
                  icon: const Icon(Icons.close, size: 18),
                  label: Text(isRejected ? 'Đã từ chối' : 'Từ chối'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.errorText,
                  ),
                ),
              ),
            ],
          ),
          if (isRejected && decision?.reason != null) ...[
            const SizedBox(height: 6),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.errorBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Lý do: ${decision!.reason}',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.errorText,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
