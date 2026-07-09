import 'package:flutter/material.dart';

import '../../services/admin_races_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';

/// Sheet dùng cho cả tạo (createRace) và sửa (updateRace) race.
/// Trả về `true` nếu lưu thành công để caller refresh.
Future<bool?> showAdminRaceFormSheet(
  BuildContext context, {
  required int tournamentId,
  int? raceId,
}) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _AdminRaceFormSheet(
      tournamentId: tournamentId,
      raceId: raceId,
    ),
  );
}

class _AdminRaceFormSheet extends StatefulWidget {
  const _AdminRaceFormSheet({required this.tournamentId, this.raceId});

  final int tournamentId;
  final int? raceId;

  bool get isEdit => raceId != null;

  @override
  State<_AdminRaceFormSheet> createState() => _AdminRaceFormSheetState();
}

class _AdminRaceFormSheetState extends State<_AdminRaceFormSheet> {
  final _service = AdminRacesService();
  final _name = TextEditingController();

  int _maxEntries = 8;
  DateTime? _scheduledAt;
  DateTime? _registrationDeadline;
  bool _loading = false;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.isEdit) _loadRace();
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _loadRace() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await _service.getRace(widget.raceId!);
      if (!mounted) return;
      setState(() {
        _name.text = r.name ?? '';
        _maxEntries = r.maxEntries == 0 ? 8 : r.maxEntries;
        _scheduledAt = r.scheduledAt;
        _registrationDeadline = r.registrationDeadline;
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

  Future<void> _pickDateTime({required bool isScheduled}) async {
    final initial = (isScheduled ? _scheduledAt : _registrationDeadline) ?? DateTime.now();
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
      if (isScheduled) {
        _scheduledAt = picked;
      } else {
        _registrationDeadline = picked;
      }
    });
  }

  String _formatPicker(DateTime? dt) {
    if (dt == null) return 'Chọn ngày giờ';
    return formatRaceDateTime(dt.toLocal());
  }

  Map<String, dynamic> _buildPayload() {
    final payload = <String, dynamic>{
      'name': _name.text.trim(),
      'maxEntries': _maxEntries,
    };
    if (_scheduledAt != null) {
      payload['scheduledAt'] = _scheduledAt!.toUtc().toIso8601String();
    }
    if (_registrationDeadline != null) {
      payload['registrationDeadline'] = _registrationDeadline!.toUtc().toIso8601String();
    }
    return payload;
  }

  Future<void> _submit() async {
    final name = _name.text.trim();
    if (name.isEmpty) {
      setState(() => _error = 'Tên cuộc đua là bắt buộc.');
      return;
    }
    if (_maxEntries < 1) {
      setState(() => _error = 'Số ngựa tối đa phải ≥ 1.');
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      if (widget.isEdit) {
        await _service.updateRace(widget.raceId!, _buildPayload());
      } else {
        await _service.createRace(widget.tournamentId, _buildPayload());
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
              widget.isEdit
                  ? 'Chỉnh sửa cuộc đua #${widget.raceId}'
                  : 'Tạo cuộc đua',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.heading,
              ),
            ),
            if (!widget.isEdit)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'Cuộc đua mới mặc định ở trạng thái Đã lên lịch (SCHEDULED).',
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
                decoration: const InputDecoration(
                  labelText: 'Tên cuộc đua *',
                  hintText: 'VD: Race 1 - Sprint',
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Text('Số ngựa tối đa:', style: TextStyle(fontWeight: FontWeight.w600)),
                  const Spacer(),
                  IconButton(
                    onPressed: _saving
                        ? null
                        : () => setState(() {
                              if (_maxEntries > 1) _maxEntries--;
                            }),
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Container(
                    constraints: const BoxConstraints(minWidth: 40),
                    alignment: Alignment.center,
                    child: Text(
                      '$_maxEntries',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.adminAccent,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: _saving
                        ? null
                        : () => setState(() => _maxEntries++),
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _saving ? null : () => _pickDateTime(isScheduled: true),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Thời gian chạy: ${_formatPicker(_scheduledAt)}'),
                ),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _saving ? null : () => _pickDateTime(isScheduled: false),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Hạn chót đăng ký: ${_formatPicker(_registrationDeadline)}'),
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
                _saving
                    ? 'Đang lưu…'
                    : (widget.isEdit ? 'Lưu thay đổi' : 'Tạo cuộc đua'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
