import 'package:flutter/material.dart';

import '../../models/owner_horse.dart';
import '../../services/admin_horses_service.dart';
import '../../services/admin_users_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/horse_status_labels.dart';

class AdminHorseReviewScreen extends StatefulWidget {
  const AdminHorseReviewScreen({
    super.key,
    required this.horseId,
    this.initialHorse,
    required this.onReviewed,
  });

  final int horseId;
  final OwnerHorse? initialHorse;
  final VoidCallback onReviewed;

  @override
  State<AdminHorseReviewScreen> createState() => _AdminHorseReviewScreenState();
}

class _AdminHorseReviewScreenState extends State<AdminHorseReviewScreen> {
  final _service = AdminHorsesService();
  final _usersService = AdminUsersService();
  final _reasonController = TextEditingController();

  OwnerHorse? _horse;
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _horse = widget.initialHorse;
    _load();
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<OwnerHorse> _enrichWithOwner(OwnerHorse horse) async {
    if (horse.ownerName != null && horse.ownerName!.trim().isNotEmpty) {
      return horse;
    }
    final ownerId = horse.ownerId;
    if (ownerId == null) return horse;

    try {
      final owner = await _usersService.getUserById(ownerId);
      return horse.copyWith(
        ownerName: owner.fullName,
        ownerEmail: owner.email,
      );
    } catch (_) {
      return horse;
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      var horse = await _service.getHorseById(widget.horseId);
      final initial = widget.initialHorse;
      if (initial?.ownerName != null && initial!.ownerName!.trim().isNotEmpty) {
        horse = horse.copyWith(
          ownerName: initial.ownerName,
          ownerEmail: initial.ownerEmail,
        );
      } else {
        horse = await _enrichWithOwner(horse);
      }
      if (!mounted) return;
      setState(() {
        _horse = horse;
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

  Future<void> _approve() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Duyệt ngựa?'),
        content: Text('Xác nhận duyệt ngựa "${_horse?.name ?? ''}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.ownerTeal),
            child: const Text('Duyệt'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _submitReview('APPROVED');
  }

  Future<void> _reject() async {
    _reasonController.clear();
    final reason = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Từ chối ngựa'),
        content: TextField(
          controller: _reasonController,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Lý do từ chối *',
            hintText: 'Nhập lý do để chủ ngựa biết…',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          FilledButton(
            onPressed: () {
              final text = _reasonController.text.trim();
              if (text.isEmpty) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(content: Text('Vui lòng nhập lý do từ chối')),
                );
                return;
              }
              Navigator.pop(ctx, text);
            },
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
            child: const Text('Từ chối'),
          ),
        ],
      ),
    );
    if (reason == null || reason.trim().isEmpty) return;
    await _submitReview('REJECTED', reason: reason);
  }

  Future<void> _submitReview(String status, {String? reason}) async {
    setState(() => _submitting = true);
    try {
      final updated = await _service.reviewHorse(
        widget.horseId,
        status: status,
        reason: reason,
      );
      if (!mounted) return;
      widget.onReviewed();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            status == 'APPROVED'
                ? 'Đã duyệt ngựa ${updated.name}'
                : 'Đã từ chối ngựa ${updated.name}',
          ),
        ),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final horse = _horse;
    final canReview = horse?.status == 'PENDING';

    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: Text(horse?.name ?? 'Chi tiết ngựa'),
      ),
      body: _loading && horse == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.adminAccent))
          : _error != null && horse == null
              ? _ErrorBody(message: _error!, onRetry: _load)
              : horse == null
                  ? const Center(child: Text('Không tìm thấy ngựa'))
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                      children: [
                        _HeaderCard(horse: horse),
                        const SizedBox(height: 16),
                        _InfoCard(
                          title: 'Thông tin đăng ký',
                          rows: [
                            _Row('Mã ngựa', '#${horse.horseId}'),
                            _Row(
                              'Chủ ngựa',
                              horse.displayOwner,
                              subtitle: horse.ownerEmail,
                            ),
                            _Row('Tên', horse.name),
                            _Row('Giống', horse.breed ?? '—'),
                            _Row('Giới tính', horse.sex ?? '—'),
                            _Row('Màu lông', horse.color ?? '—'),
                            _Row(
                              'Ngày sinh',
                              horse.dateOfBirth != null
                                  ? _formatDate(horse.dateOfBirth!)
                                  : '—',
                            ),
                            if (horse.ageYears != null)
                              _Row('Tuổi', '${horse.ageYears} tuổi'),
                            _Row(
                              'Trạng thái',
                              horseStatusLabelVi(horse.status),
                              valueColor: horseStatusColor(horse.status),
                            ),
                            if (horse.rejectionReason != null &&
                                horse.rejectionReason!.isNotEmpty)
                              _Row('Lý do từ chối', horse.rejectionReason!,
                                  valueColor: AppColors.errorText),
                          ],
                        ),
                        if (horse.careerMetrics != null) ...[
                          const SizedBox(height: 16),
                          _InfoCard(
                            title: 'Thành tích',
                            rows: [
                              _Row('Số trận', '${horse.careerMetrics!.totalStarts}'),
                              _Row('Thắng', '${horse.careerMetrics!.wins}'),
                              _Row(
                                'Tỷ lệ thắng',
                                '${horse.careerMetrics!.winRate.toStringAsFixed(1)}%',
                              ),
                              if (horse.careerMetrics!.recentFormText != null &&
                                  horse.careerMetrics!.recentFormText!.isNotEmpty)
                                _Row('Form', horse.careerMetrics!.recentFormText!),
                            ],
                          ),
                        ],
                        if (canReview) ...[
                          const SizedBox(height: 24),
                          if (_submitting)
                            const Center(child: CircularProgressIndicator())
                          else ...[
                            SizedBox(
                              width: double.infinity,
                              child: FilledButton.icon(
                                onPressed: _approve,
                                icon: const Icon(Icons.check_circle_outline),
                                label: const Text('Duyệt ngựa'),
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.ownerTeal,
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: _reject,
                                icon: const Icon(Icons.cancel_outlined),
                                label: const Text('Từ chối'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: const Color(0xFFDC2626),
                                  side: const BorderSide(color: Color(0xFFDC2626)),
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ],
                    ),
    );
  }

  String _formatDate(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.horse});

  final OwnerHorse horse;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(
          colors: [AppColors.adminDeep, AppColors.adminPrimary],
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.pets, color: AppColors.adminAccent, size: 32),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  horse.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  horse.subtitle,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.8)),
                ),
              ],
            ),
          ),
          if (horse.status != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: horseStatusColor(horse.status).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                horseStatusLabelVi(horse.status),
                style: TextStyle(
                  color: horseStatusColor(horse.status),
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.rows});

  final String title;
  final List<_Row> rows;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.heading,
            ),
          ),
          const SizedBox(height: 12),
          ...rows.map(
            (r) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 120,
                        child: Text(r.label, style: const TextStyle(color: AppColors.textMuted)),
                      ),
                      Expanded(
                        child: Text(
                          r.value,
                          style: TextStyle(
                            color: r.valueColor ?? AppColors.heading,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (r.subtitle != null && r.subtitle!.trim().isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(left: 120, top: 2),
                      child: Text(
                        r.subtitle!,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
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

class _Row {
  const _Row(this.label, this.value, {this.valueColor, this.subtitle});

  final String label;
  final String value;
  final Color? valueColor;
  final String? subtitle;
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
              style: FilledButton.styleFrom(backgroundColor: AppColors.adminAccent),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}
