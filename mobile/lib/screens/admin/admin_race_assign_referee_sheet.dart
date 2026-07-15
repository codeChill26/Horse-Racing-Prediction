import 'package:flutter/material.dart';

import '../../models/admin_race.dart';
import '../../services/admin_races_service.dart';
import '../../theme/app_theme.dart';

/// Sheet chọn 2 trọng tài phân biệt cho race SCHEDULED.
Future<List<RefereeAssignment>?> showAssignRefereeSheet(
  BuildContext context, {
  required int raceId,
}) {
  return showModalBottomSheet<List<RefereeAssignment>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _AssignRefereeSheet(raceId: raceId),
  );
}

class _AssignRefereeSheet extends StatefulWidget {
  const _AssignRefereeSheet({required this.raceId});

  final int raceId;

  @override
  State<_AssignRefereeSheet> createState() => _AssignRefereeSheetState();
}

class _AssignRefereeSheetState extends State<_AssignRefereeSheet> {
  final _service = AdminRacesService();

  List<RefereeOption> _referees = [];
  final Set<int> _selected = {};
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await _service.listAvailableReferees(raceId: widget.raceId);
      if (!mounted) return;
      setState(() {
        _referees = list;
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
    if (_selected.length != 2) {
      setState(() => _error = 'Vui lòng chọn đúng 2 trọng tài.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final assignments = await _service.assignReferees(
        widget.raceId,
        _selected.toList()..sort(),
        referees: _referees,
      );
      if (!mounted) return;
      Navigator.of(context).pop(assignments);
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
            'Phân công trọng tài · Race #${widget.raceId}',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppColors.heading,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Đã chọn: ${_selected.length}/2',
            style: TextStyle(
              fontSize: 13,
              color: _selected.length == 2
                  ? AppColors.ownerTeal
                  : AppColors.textMuted,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_referees.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'Chưa có trọng tài khả dụng cho race này.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
            )
          else
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: _referees.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (ctx, i) {
                  final ref = _referees[i];
                  final isSelected = _selected.contains(ref.userId);
                  return InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selected.remove(ref.userId);
                        } else {
                          if (_selected.length >= 2) {
                            _error = 'Chỉ được chọn tối đa 2 trọng tài.';
                            return;
                          }
                          _selected.add(ref.userId);
                          _error = null;
                        }
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.adminAccent.withValues(alpha: 0.08)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.adminAccent
                              : AppColors.border,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.adminBg,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.sports_score,
                              color: AppColors.adminAccent,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  ref.fullName,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (ref.email != null && ref.email!.isNotEmpty)
                                  Text(
                                    ref.email!,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Icon(
                            isSelected
                                ? Icons.check_circle
                                : Icons.radio_button_unchecked,
                            color: isSelected
                                ? AppColors.adminAccent
                                : AppColors.textMuted,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(_error!, style: const TextStyle(color: AppColors.errorText)),
          ],
          const SizedBox(height: 12),
          FilledButton(
            onPressed: (_submitting || _loading) ? null : _submit,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.adminAccent,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            child: Text(_submitting ? 'Đang lưu…' : 'Phân công'),
          ),
        ],
      ),
    );
  }
}
