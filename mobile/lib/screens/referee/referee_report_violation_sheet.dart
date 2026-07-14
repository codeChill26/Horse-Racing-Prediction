import 'package:flutter/material.dart';

import '../../services/referee_service.dart';
import '../../theme/app_theme.dart';

Future<void> showRefereeReportViolationSheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => const _RefereeReportViolationSheet(),
  );
}

class _RefereeReportViolationSheet extends StatefulWidget {
  const _RefereeReportViolationSheet();

  @override
  State<_RefereeReportViolationSheet> createState() => _RefereeReportViolationSheetState();
}

class _RefereeReportViolationSheetState extends State<_RefereeReportViolationSheet> {
  final _service = RefereeService();
  final _raceIdCtrl = TextEditingController();
  final _entryIdCtrl = TextEditingController();
  final _typeCtrl = TextEditingController();
  final _severityCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _raceIdCtrl.dispose();
    _entryIdCtrl.dispose();
    _typeCtrl.dispose();
    _severityCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final raceId = int.tryParse(_raceIdCtrl.text.trim());
    if (raceId == null) {
      setState(() => _error = 'Vui lòng nhập raceId hợp lệ.');
      return;
    }
    final payload = <String, dynamic>{
      'raceId': raceId,
      'type': _typeCtrl.text.trim(),
      'severity': _severityCtrl.text.trim(),
      'description': _descCtrl.text.trim(),
    };
    final entryId = int.tryParse(_entryIdCtrl.text.trim());
    if (entryId != null) {
      payload['entryId'] = entryId;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final data = await _service.reportViolation(payload);
      if (!mounted) return;
      final msg = data['violation']?['violationId'] ?? 'Đã gửi báo cáo.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Đã gửi báo cáo: $msg')));
      if (Navigator.canPop(context)) {
        Navigator.of(context).pop();
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
              'Báo cáo vi phạm',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          TextField(controller: _raceIdCtrl, decoration: const InputDecoration(labelText: 'Race ID *')),
          TextField(controller: _entryIdCtrl, decoration: const InputDecoration(labelText: 'Entry ID (tùy chọn)')),
          TextField(controller: _typeCtrl, decoration: const InputDecoration(labelText: 'Loại vi phạm *')),
          TextField(controller: _severityCtrl, decoration: const InputDecoration(labelText: 'Mức độ *')),
          TextField(
            controller: _descCtrl,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Mô tả *'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _submitting ? null : _submit,
            icon: Icon(_submitting ? Icons.hourglass_empty : Icons.report_gmailerrorred),
            label: Text(_submitting ? 'Đang gửi…' : 'Gửi báo cáo'),
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
