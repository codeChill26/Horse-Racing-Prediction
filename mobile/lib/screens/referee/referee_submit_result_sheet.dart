import 'package:flutter/material.dart';

import '../../models/referee_race.dart';
import '../../services/referee_service.dart';
import '../../theme/app_theme.dart';

Future<List<Map<String, dynamic>>?> showRefereeSubmitResultSheet(
  BuildContext context, {
  required int raceId,
  required List<RefereeHorse> horses,
}) {
  return showModalBottomSheet<List<Map<String, dynamic>>>(
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
      if (h.horseId != null) {
        _rankCtrls[h.horseId!] = TextEditingController();
        _dnf[h.horseId!] = false;
        _dq[h.horseId!] = false;
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

  List<Map<String, dynamic>> _buildRawResults() {
    final results = <Map<String, dynamic>>[];
    for (final h in widget.horses) {
      if (h.horseId == null) continue;
      final rank = int.tryParse((_rankCtrls[h.horseId!]?.text.trim() ?? ''));
      results.add({
        'entryId': h.horseId,
        'rank': rank,
        'isDnf': _dnf[h.horseId!] == true,
        'isDq': _dq[h.horseId!] == true,
      });
    }
    return results;
  }

  bool get _isValid {
    final results = _buildRawResults();
    final ranks = results.where((e) => e['rank'] != null).map((e) => e['rank'] as int).toList();
    if (ranks.isEmpty) return false;
    final unique = ranks.toSet();
    return unique.length == ranks.length;
  }

  Future<void> _submit() async {
    if (!_isValid) {
      setState(() => _error = 'Vui lòng nhập đủ rank và không trùng.');
      return;
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
          const Center(
            child: Text(
              'Nộp kết quả',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          ...widget.horses.map((h) {
            final ctrl = h.horseId != null ? _rankCtrls[h.horseId!] : null;
            final hid = h.horseId;
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
                  if (hid != null) ...[
                    Row(
                      children: [
                        const SizedBox(width: 12),
                        Switch(
                          value: _dnf[hid] ?? false,
                          onChanged: (v) => setState(() => _dnf[hid] = v),
                        ),
                        const SizedBox(width: 4),
                        const Text('DNF'),
                        const SizedBox(width: 16),
                        Switch(
                          value: _dq[hid] ?? false,
                          onChanged: (v) => setState(() => _dq[hid] = v),
                        ),
                        const SizedBox(width: 4),
                        const Text('DQ'),
                      ],
                    ),
                  ],
                ],
              ),
            );
          }).toList(),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: Icon(_submitting ? Icons.hourglass_empty : Icons.upload_file),
            label: Text(_submitting ? 'Đang nộp…' : 'Xác nhận nộp'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.adminAccent,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ],
      ),
    );
  }
}
