import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/prediction.dart';
import '../../services/spectator_api.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';

class PlaceBetArgs {
  const PlaceBetArgs({this.raceId, this.raceName});
  final int? raceId;
  final String? raceName;
}

class PlaceBetResult {
  const PlaceBetResult({required this.success, this.prediction, this.errorMessage});
  final bool success;
  final Prediction? prediction;
  final String? errorMessage;
}

class PlaceBetScreen extends StatefulWidget {
  const PlaceBetScreen({super.key, required this.api, this.args});

  final SpectatorApi api;
  final PlaceBetArgs? args;

  @override
  State<PlaceBetScreen> createState() => _PlaceBetScreenState();
}

class _PlaceBetScreenState extends State<PlaceBetScreen> {
  static const _betTypes = ['WIN', 'PLACE', 'SHOW', 'QUINELLA', 'EXACTA'];

  final _formKey = GlobalKey<FormState>();
  final _raceIdController = TextEditingController();
  final _entry1Controller = TextEditingController();
  final _entry2Controller = TextEditingController();
  final _amountController = TextEditingController();

  String? _betType = 'WIN';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final args = widget.args;
    if (args?.raceId != null) {
      _raceIdController.text = args!.raceId!.toString();
    }
    _amountController.text = '10';
  }

  @override
  void dispose() {
    _raceIdController.dispose();
    _entry1Controller.dispose();
    _entry2Controller.dispose();
    _amountController.dispose();
    super.dispose();
  }

  bool get _needsSecondPick => _betType == 'QUINELLA' || _betType == 'EXACTA';

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final entryIds = <int>[
      int.parse(_entry1Controller.text),
      if (_needsSecondPick) int.parse(_entry2Controller.text),
    ];
    if (_needsSecondPick && entryIds[0] == entryIds[1]) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('QUINELLA/EXACTA cần chọn 2 ngựa khác nhau')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final prediction = await widget.api.placeBet(
        raceId: int.parse(_raceIdController.text),
        betType: _betType!,
        entryIds: entryIds,
        betAmount: int.parse(_amountController.text),
      );
      if (!mounted) return;
      Navigator.of(context).pop<PlaceBetResult>(
        PlaceBetResult(success: true, prediction: prediction),
      );
    } catch (e) {
      if (!mounted) return;
      final message = e.toString().replaceFirst('Exception: ', '');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: AppColors.errorText),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F5),
      appBar: AppBar(
        title: const Text('Đặt cược'),
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                if (widget.args?.raceName != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      widget.args!.raceName!,
                      style: const TextStyle(
                        color: AppColors.heading,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                const _HelpText(),
                const SizedBox(height: 12),
                _IntField(
                  controller: _raceIdController,
                  label: 'Race ID',
                  hint: 'ID của cuộc đua',
                  validator: (v) => _requirePositiveInt(v, 'Race ID'),
                  enabled: widget.args?.raceId == null,
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _betType,
                  decoration: const InputDecoration(
                    labelText: 'Loại cược',
                    prefixIcon: Icon(Icons.casino_outlined),
                  ),
                  items: _betTypes
                      .map((e) => DropdownMenuItem(value: e, child: Text(_betTypeLabel(e))))
                      .toList(),
                  onChanged: (v) => setState(() => _betType = v),
                ),
                const SizedBox(height: 16),
                _IntField(
                  controller: _entry1Controller,
                  label: 'Entry ID ngựa #1',
                  validator: (v) => _requirePositiveInt(v, 'Entry 1'),
                ),
                if (_needsSecondPick) ...[
                  const SizedBox(height: 16),
                  _IntField(
                    controller: _entry2Controller,
                    label: 'Entry ID ngựa #2',
                    validator: (v) => _requirePositiveInt(v, 'Entry 2'),
                  ),
                ],
                const SizedBox(height: 16),
                _IntField(
                  controller: _amountController,
                  label: 'Số điểm cược',
                  hint: 'Tối thiểu 10 điểm, tối đa 50% số dư',
                  validator: (v) {
                    final n = _requirePositiveInt(v, 'Số điểm');
                    if (n != null) return n;
                    if (int.parse(v!) < 10) return 'Tối thiểu 10 điểm';
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                SizedBox(
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _submitting ? null : _submit,
                    icon: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.check_circle_outline),
                    label: Text(_submitting ? 'Đang đặt cược...' : 'Xác nhận đặt cược'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.green,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                _HintBox(
                  text: _submitHint(
                    _betType,
                    needsSecondPick: _needsSecondPick,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String? _requirePositiveInt(String? v, String name) {
    if (v == null || v.trim().isEmpty) return '$name không được để trống';
    final n = int.tryParse(v.trim());
    if (n == null || n <= 0) return '$name phải là số nguyên dương';
    return null;
  }

  String _betTypeLabel(String code) {
    switch (code) {
      case 'WIN':
        return 'WIN — Thắng (chọn 1 ngựa)';
      case 'PLACE':
        return 'PLACE — Về nhì (chọn 1 ngựa)';
      case 'SHOW':
        return 'SHOW — Về ba (chọn 1 ngựa)';
      case 'QUINELLA':
        return 'QUINELLA — Hai ngựa về nhất–nhì (không cần thứ tự)';
      case 'EXACTA':
        return 'EXACTA — Hai ngựa về nhất–nhì (đúng thứ tự)';
      default:
        return code;
    }
  }

  String _submitHint(String? type, {required bool needsSecondPick}) {
    if (type == null) return '';
    if (needsSecondPick) {
      return 'Bạn cần chọn 2 ngựa khác nhau. Tối đa cược = 50% số dư ví. Odds sẽ được khóa khi backend chấp nhận.';
    }
    return 'WIN/PLACE/SHOW chỉ cần chọn 1 ngựa. Tối đa cược = 50% số dư ví. Odds sẽ được khóa khi backend chấp nhận.';
  }
}

class _HelpText extends StatelessWidget {
  const _HelpText();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFE0F2FE),
        border: Border.all(color: const Color(0xFFBAE6FD)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Icon(Icons.info_outline, color: AppColors.green, size: 20),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Bạn chỉ có thể đặt cược cho race ở trạng thái SCHEDULED. Race ID và Entry ID tra theo trang Giải đấu/Trang chủ.',
              style: TextStyle(color: AppColors.heading, fontSize: 13, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

class _IntField extends StatelessWidget {
  const _IntField({
    required this.controller,
    required this.label,
    required this.validator,
    this.hint,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool enabled;
  final String? Function(String?) validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: const Icon(Icons.tag_outlined),
      ),
      validator: validator,
      onChanged: (_) {},
    );
  }
}

class _HintBox extends StatelessWidget {
  const _HintBox({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    if (text.isEmpty) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF9C3),
        border: Border.all(color: const Color(0xFFFDE68A)),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.tips_and_updates_outlined,
              color: Color(0xFF854D0E), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text,
                style: const TextStyle(color: Color(0xFF713F12), fontSize: 12.5, height: 1.4)),
          ),
        ],
      ),
    );
  }
}
