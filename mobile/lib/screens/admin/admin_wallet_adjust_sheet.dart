import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/admin_wallet.dart';
import '../../models/wallet_transaction.dart';
import '../../services/admin_wallets_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';

/// Hiển thị bottom sheet để admin nạp / rút điểm cho 1 user.
///
/// Trả về `AdminAdjustResult?` qua Navigator.pop khi thành công
/// (để caller cập nhật UI / reload).
Future<AdminAdjustResult?> showAdminWalletAdjustSheet(
  BuildContext context, {
  required int userId,
  String? userLabel,
}) {
  return showModalBottomSheet<AdminAdjustResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _AdjustSheet(
      userId: userId,
      userLabel: userLabel,
    ),
  );
}

class _AdjustSheet extends StatefulWidget {
  const _AdjustSheet({required this.userId, this.userLabel});

  final int userId;
  final String? userLabel;

  @override
  State<_AdjustSheet> createState() => _AdjustSheetState();
}

class _AdjustSheetState extends State<_AdjustSheet> {
  final _service = AdminWalletsService();
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  _AdjustMode _mode = _AdjustMode.deposit;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  int? get _amount {
    final raw = _amountController.text.trim();
    if (raw.isEmpty) return null;
    return int.tryParse(raw);
  }

  int get _signedAmount {
    final base = _amount ?? 0;
    return _mode == _AdjustMode.withdraw ? -base.abs() : base.abs();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final result = await _service.adjustBalance(
        userId: widget.userId,
        amount: _signedAmount,
        reason: _reasonController.text.trim(),
      );
      if (!mounted) return;
      Navigator.pop<AdminAdjustResult>(context, result);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.of(context).viewInsets;
    final signed = _signedAmount;
    final previewLabel = signed == 0
        ? '—'
        : '${signed > 0 ? '+' : ''}${formatPointsVi(signed)} điểm';

    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const Text(
                  'Điều chỉnh điểm',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.userLabel != null
                      ? 'User #${widget.userId} · ${widget.userLabel}'
                      : 'User #${widget.userId}',
                  style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: _ModeButton(
                        icon: Icons.add_circle_outline,
                        label: 'Nạp điểm',
                        selected: _mode == _AdjustMode.deposit,
                        color: const Color(0xFF10B981),
                        onTap: _submitting
                            ? null
                            : () => setState(() => _mode = _AdjustMode.deposit),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _ModeButton(
                        icon: Icons.remove_circle_outline,
                        label: 'Rút điểm',
                        selected: _mode == _AdjustMode.withdraw,
                        color: const Color(0xFFDC2626),
                        onTap: _submitting
                            ? null
                            : () => setState(() => _mode = _AdjustMode.withdraw),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _amountController,
                  enabled: !_submitting,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: InputDecoration(
                    labelText: 'Số điểm',
                    hintText: 'Nhập số nguyên dương',
                    prefixIcon: const Icon(Icons.toll_outlined),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (v) {
                    final raw = v?.trim() ?? '';
                    if (raw.isEmpty) return 'Vui lòng nhập số điểm';
                    final n = int.tryParse(raw);
                    if (n == null || n <= 0) return 'Số điểm phải là số nguyên dương';
                    return null;
                  },
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _reasonController,
                  enabled: !_submitting,
                  minLines: 2,
                  maxLines: 4,
                  maxLength: 200,
                  decoration: InputDecoration(
                    labelText: 'Lý do (bắt buộc)',
                    hintText: 'VD: Bồi thường do giải bị hủy',
                    prefixIcon: const Padding(
                      padding: EdgeInsets.only(bottom: 40),
                      child: Icon(Icons.notes_outlined),
                    ),
                    alignLabelWithHint: true,
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  validator: (v) {
                    final raw = v?.trim() ?? '';
                    if (raw.isEmpty) return 'Vui lòng nhập lý do';
                    if (raw.length < 5) return 'Lý do phải có ít nhất 5 ký tự';
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.adminBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.preview_outlined, size: 18, color: AppColors.adminAccent),
                      const SizedBox(width: 8),
                      const Text(
                        'Sẽ ghi: ',
                        style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                      ),
                      Expanded(
                        child: Text(
                          previewLabel,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: _mode == _AdjustMode.deposit
                                ? const Color(0xFF065F46)
                                : const Color(0xFF991B1B),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.errorBg,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.errorBorder),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: AppColors.errorText, fontSize: 13),
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _submitting ? null : () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: const Text('Hủy'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: FilledButton.icon(
                        onPressed: _submitting ? null : _submit,
                        icon: _submitting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.check_circle_outline),
                        label: Text(
                          _submitting ? 'Đang xử lý…' : 'Xác nhận',
                        ),
                        style: FilledButton.styleFrom(
                          backgroundColor: _mode == _AdjustMode.deposit
                              ? const Color(0xFF10B981)
                              : const Color(0xFFDC2626),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

enum _AdjustMode { deposit, withdraw }

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: selected ? color.withValues(alpha: 0.10) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected ? color : AppColors.border,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: selected ? color : AppColors.textMuted),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: selected ? color : AppColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Hiển thị bottom sheet preview chi tiết 1 transaction (tái sử dụng cho cả
/// admin và spectator view).
class TransactionDetailSheet extends StatelessWidget {
  const TransactionDetailSheet({super.key, required this.tx});

  final WalletTransaction tx;

  static Future<void> show(BuildContext context, WalletTransaction tx) {
    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => TransactionDetailSheet(tx: tx),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ownerName = tx.wallet?.userFullName ?? tx.wallet?.userEmail;
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (tx.isCredit ? const Color(0xFF10B981) : const Color(0xFFDC2626))
                      .withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  tx.isCredit ? Icons.south_west : Icons.north_east,
                  color: tx.isCredit ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      tx.typeLabel,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tx.amountLabel,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: tx.isCredit
                            ? const Color(0xFF065F46)
                            : const Color(0xFF991B1B),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _DetailRow(label: 'Mã GD', value: '#${tx.transactionId ?? '—'}'),
          _DetailRow(label: 'Thời gian', value: formatDateTimeVi(tx.createdAt)),
          _DetailRow(label: 'Số dư sau', value: tx.balanceAfterLabel),
          if (ownerName != null && ownerName.isNotEmpty)
            _DetailRow(label: 'Chủ ví', value: ownerName),
          if (tx.wallet?.userId != null)
            _DetailRow(label: 'User ID', value: '#${tx.wallet!.userId}'),
          if (tx.referenceType != null && tx.referenceType!.isNotEmpty)
            _DetailRow(label: 'Loại tham chiếu', value: tx.referenceType!),
          if (tx.description != null && tx.description!.isNotEmpty) ...[
            const SizedBox(height: 8),
            const Text(
              'Mô tả',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 4),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.adminBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(
                tx.description!,
                style: const TextStyle(fontSize: 13, color: AppColors.heading),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.heading,
              ),
            ),
          ),
        ],
      ),
    );
  }
}