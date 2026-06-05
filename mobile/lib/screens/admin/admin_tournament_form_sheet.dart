import 'package:flutter/material.dart';

import '../../services/admin_tournaments_service.dart';
import '../../theme/app_theme.dart';

Future<bool?> showAdminTournamentFormSheet(BuildContext context, {int? tournamentId}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _AdminTournamentFormSheet(tournamentId: tournamentId),
  );
}

class _AdminTournamentFormSheet extends StatefulWidget {
  const _AdminTournamentFormSheet({this.tournamentId});

  final int? tournamentId;

  bool get isEdit => tournamentId != null;

  @override
  State<_AdminTournamentFormSheet> createState() => _AdminTournamentFormSheetState();
}

class _AdminTournamentFormSheetState extends State<_AdminTournamentFormSheet> {
  final _service = AdminTournamentsService();
  final _name = TextEditingController();
  final _description = TextEditingController();

  DateTime? _startAt;
  DateTime? _endAt;
  bool _loading = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _startAt = now;
    _endAt = now.add(const Duration(days: 5));
    if (widget.isEdit) _loadTournament();
  }

  Future<void> _loadTournament() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final t = await _service.getTournamentById(widget.tournamentId!);
      if (!mounted) return;
      setState(() {
        _name.text = t.name ?? '';
        _description.text = t.description ?? '';
        _startAt = t.startAt != null ? DateTime.tryParse(t.startAt!)?.toLocal() : null;
        _endAt = t.endAt != null ? DateTime.tryParse(t.endAt!)?.toLocal() : null;
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
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime({required bool isStart}) async {
    final initial = (isStart ? _startAt : _endAt) ?? DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (date == null || !mounted) return;

    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null || !mounted) return;

    final picked = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    setState(() {
      if (isStart) {
        _startAt = picked;
      } else {
        _endAt = picked;
      }
    });
  }

  String _formatPicker(DateTime? dt) {
    if (dt == null) return 'Chọn ngày giờ';
    final d = dt.day.toString().padLeft(2, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final h = dt.hour.toString().padLeft(2, '0');
    final min = dt.minute.toString().padLeft(2, '0');
    return '$d/$m/${dt.year} $h:$min';
  }

  Future<void> _submit() async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Tên giải đấu là bắt buộc.');
      return;
    }
    if (_startAt != null && _endAt != null && _startAt!.isAfter(_endAt!)) {
      setState(() => _error = 'Thời gian bắt đầu phải trước hoặc bằng thời gian kết thúc.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      final payload = <String, dynamic>{
        'name': name,
        'description': _description.text.trim().isEmpty ? null : _description.text.trim(),
      };
      if (_startAt != null) payload['startAt'] = _startAt!.toUtc().toIso8601String();
      if (_endAt != null) payload['endAt'] = _endAt!.toUtc().toIso8601String();

      if (widget.isEdit) {
        await _service.updateTournament(widget.tournamentId!, payload);
      } else {
        await _service.createTournament(payload);
      }

      if (!mounted) return;
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final isEdit = widget.isEdit;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottom),
      child: SingleChildScrollView(
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
              isEdit ? 'Chỉnh sửa giải #${widget.tournamentId}' : 'Tạo giải đấu',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.heading,
              ),
            ),
            if (!isEdit)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'Giải mới được tạo ở trạng thái Nháp (DRAFT).',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ),
            const SizedBox(height: 16),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              TextField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Tên giải đấu *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _description,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Mô tả'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _saving ? null : () => _pickDateTime(isStart: true),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Bắt đầu: ${_formatPicker(_startAt)}'),
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _saving ? null : () => _pickDateTime(isStart: false),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Kết thúc: ${_formatPicker(_endAt)}'),
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: AppColors.errorText)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: (_loading || _saving) ? null : _submit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.adminAccent,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(
                _saving ? 'Đang lưu…' : (isEdit ? 'Lưu thay đổi' : 'Tạo giải đấu'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
