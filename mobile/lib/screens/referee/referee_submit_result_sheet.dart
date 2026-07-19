import 'package:flutter/material.dart';

import '../../models/referee_race.dart';
import '../../services/referee_service.dart';
import '../../theme/app_theme.dart';

/// Mở bottom sheet cho trọng tài nhập kết quả trận đấu.
///
/// Trả về `Map` chứa response body từ backend khi trọng tài nhấn
/// "Xác nhận nộp" thành công (gồm các key `success`, `status`, `message`).
/// Trả về `null` nếu user đóng sheet mà không submit (bấm Huỷ, bấm Close,
/// back…).
///
/// Lưu ý: backend vẫn nhận và lưu `RefereeSubmission` ngay khi request POST
/// tới endpoint submit đến server. Lỗi runtime cũ trước đây là do generic
/// sai ở `showModalBottomSheet` khiến `Navigator.pop` với `Map` bị Flutter
/// cast thất bại.
Future<Map<String, dynamic>?> showRefereeSubmitResultSheet(
  BuildContext context, {
  required int raceId,
  required List<RefereeHorse> horses,
}) {
  return showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _RefereeSubmitResultSheet(raceId: raceId, horses: horses),
  );
}

class _RefereeSubmitResultSheet extends StatefulWidget {
  const _RefereeSubmitResultSheet({required this.raceId, required this.horses});

  final int raceId;
  final List<RefereeHorse> horses;

  @override
  State<_RefereeSubmitResultSheet> createState() => _RefereeSubmitResultSheetState();
}

class _RefereeSubmitResultSheetState extends State<_RefereeSubmitResultSheet> {
  final _service = RefereeService();
  final Map<int, TextEditingController> _rankCtrls = {};
  final Map<int, bool> _dnf = {};
  final Map<int, bool> _dq = {};
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    for (final h in widget.horses) {
      final key = h.resultKey;
      if (key != null) {
        _rankCtrls[key] = TextEditingController();
        _dnf[key] = false;
        _dq[key] = false;
      }
    }
  }

  @override
  void dispose() {
    for (final c in _rankCtrls.values) {
      c.dispose();
    }
    super.dispose();
  }

  /// Xây payload gửi lên backend. Mỗi entry phải có hoặc `rank`,
  /// hoặc một trong hai flag `isDnf`/`isDq` đúng `true`.
  /// Validation backend (`dto/referee.dto.js`) sẽ reject nếu `rank`
  /// trống mà cả DNF/DQ đều `false`.
  List<Map<String, dynamic>> _buildRawResults() {
    final results = <Map<String, dynamic>>[];
    for (final h in widget.horses) {
      final key = h.resultKey;
      if (key == null) continue;
      final text = _rankCtrls[key]?.text.trim() ?? '';
      final rank = int.tryParse(text);
      final isDnf = _dnf[key] == true;
      final isDq = _dq[key] == true;
      results.add({
        'entryId': key,
        'rank': rank,
        'isDnf': isDnf,
        'isDq': isDq,
      });
    }
    return results;
  }

  /// Tìm các entry vi phạm rule backend để hiển thị trước khi gửi.
  /// Trả về danh sách tên ngựa bị thiếu dữ liệu.
  List<String> _missingEntries() {
    final missing = <String>[];
    for (final h in widget.horses) {
      final key = h.resultKey;
      if (key == null) continue;
      final rank = int.tryParse((_rankCtrls[key]?.text.trim() ?? ''));
      final isDnf = _dnf[key] == true;
      final isDq = _dq[key] == true;
      if (rank == null && !isDnf && !isDq) {
        missing.add(h.horseName ?? 'Ngựa #${h.horseId ?? "?"}');
      }
    }
    return missing;
  }

  bool get _hasDuplicatedRanks {
    final results = _buildRawResults();
    final ranks = results
        .where((e) => e['rank'] != null)
        .map((e) => e['rank'] as int)
        .toList();
    return ranks.toSet().length != ranks.length;
  }

  Future<void> _submit() async {
    final missing = _missingEntries();
    final results = _buildRawResults();
    if (results.isEmpty) {
      setState(() => _error = 'Không có ngựa hợp lệ để nộp.');
      return;
    }
    final ranks = results.where((e) => e['rank'] != null).map((e) => e['rank'] as int).toList();
    if (ranks.isEmpty) {
      setState(() => _error =
          'Phải nhập ít nhất 1 thứ hạng. Ngựa không hoàn thành phải tick DNF hoặc DQ.');
      return;
    }
    if (_hasDuplicatedRanks) {
      setState(() => _error = 'Có thứ hạng bị trùng. Mỗi ngựa phải có rank khác nhau.');
      return;
    }
    if (missing.isNotEmpty) {
      final confirmed = await _confirmMissing(missing);
      if (!confirmed) return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final data = await _service.submitResult(widget.raceId, _buildRawResults());
      if (!mounted) return;
      if (Navigator.canPop(context)) {
        Navigator.of(context).pop(data);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _submitting = false;
      });
    }
  }

  Future<bool> _confirmMissing(List<String> names) async {
    final preview = names.length <= 3
        ? names.join(', ')
        : '${names.take(3).join(', ')} và ${names.length - 3} ngựa khác';
    final res = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Ngựa chưa có thứ hạng'),
        content: Text(
          '$preview chưa có rank và chưa tick DNF/DQ. Backend sẽ từ chối. '
          'Bạn muốn tiếp tục hay quay lại nhập?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Quay lại nhập'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Vẫn nộp (sẽ lỗi)'),
          ),
        ],
      ),
    );
    return res == true;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Spacer(),
              const Text(
                'Nộp kết quả',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              IconButton(
                tooltip: 'Đóng',
                icon: const Icon(Icons.close),
                onPressed: () {
                  if (_submitting) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'Đang gửi kết quả. Vui lòng đợi hoặc dùng nút "Huỷ" bên dưới.',
                        ),
                      ),
                    );
                    return;
                  }
                  if (Navigator.canPop(context)) {
                    Navigator.of(context).pop();
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...widget.horses.map((h) {
            final key = h.resultKey;
            final ctrl = key != null ? _rankCtrls[key] : null;
            final showSwitches = key != null;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(h.horseName ?? 'Ngựa #${h.horseId ?? "?"}'),
                      ),
                      const SizedBox(width: 12),
                      SizedBox(
                        width: 72,
                        child: TextField(
                          controller: ctrl,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          decoration: const InputDecoration(
                            hintText: 'rank',
                            isDense: true,
                            contentPadding: EdgeInsets.symmetric(vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (showSwitches) ...[
                    Row(
                      children: [
                        const SizedBox(width: 12),
                        Switch(
                          value: _dnf[key] ?? false,
                          onChanged: (v) => setState(() => _dnf[key] = v),
                        ),
                        const SizedBox(width: 4),
                        const Text('DNF'),
                        const SizedBox(width: 16),
                        Switch(
                          value: _dq[key] ?? false,
                          onChanged: (v) => setState(() => _dq[key] = v),
                        ),
                        const SizedBox(width: 4),
                        const Text('DQ'),
                      ],
                    ),
                  ],
                ],
              ),
            );
          }),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    if (Navigator.canPop(context)) {
                      Navigator.of(context).pop();
                    }
                  },
                  icon: const Icon(Icons.close),
                  label: const Text('Huỷ'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.adminDeep,
                    side: const BorderSide(color: AppColors.adminDeep),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _submitting ? null : _submit,
                  icon: Icon(_submitting ? Icons.hourglass_empty : Icons.upload_file),
                  label: Text(_submitting ? 'Đang nộp…' : 'Xác nhận nộp'),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.adminAccent,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
