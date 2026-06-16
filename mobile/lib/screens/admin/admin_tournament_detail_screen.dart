import 'package:flutter/material.dart';

import '../../models/admin_tournament.dart';
import '../../services/admin_tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/tournament_status_labels.dart';
import 'admin_tournament_form_sheet.dart';

class AdminTournamentDetailScreen extends StatefulWidget {
  const AdminTournamentDetailScreen({
    super.key,
    required this.tournamentId,
    this.initialTournament,
    required this.onChanged,
  });

  final int tournamentId;
  final AdminTournament? initialTournament;
  final VoidCallback onChanged;

  @override
  State<AdminTournamentDetailScreen> createState() =>
      _AdminTournamentDetailScreenState();
}

class _AdminTournamentDetailScreenState extends State<AdminTournamentDetailScreen> {
  final _service = AdminTournamentsService();

  AdminTournament? _tournament;
  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tournament = widget.initialTournament;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final tournament = await _service.getTournamentById(widget.tournamentId);
      if (!mounted) return;
      setState(() {
        _tournament = tournament;
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

  Future<void> _openEdit() async {
    final ok = await showAdminTournamentFormSheet(
      context,
      tournamentId: widget.tournamentId,
    );
    if (ok == true) {
      widget.onChanged();
      await _load();
    }
  }

  Future<String?> _promptReason(String title, {required bool required}) async {
    final ctrl = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: ctrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Lý do',
            hintText: 'Nhập lý do hủy…',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          FilledButton(
            onPressed: () {
              final text = ctrl.text.trim();
              if (required && text.isEmpty) return;
              Navigator.pop(ctx, text);
            },
            style: FilledButton.styleFrom(backgroundColor: AppColors.adminAccent),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
    ctrl.dispose();
    return result;
  }

  Future<void> _onChangeStatus(String nextStatus) async {
    final t = _tournament;
    if (t?.tournamentId == null) return;

    String? cancelReason;
    if (nextStatus == 'CANCELLED') {
      cancelReason = await _promptReason('Hủy giải đấu', required: true);
      if (cancelReason == null || cancelReason.isEmpty) return;
    } else {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Đổi trạng thái'),
          content: Text(
            '#${t!.tournamentId} ${t.name}\n\n'
            '${tournamentStatusLabelVi(t.status)} → ${tournamentStatusLabelVi(nextStatus)}?',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: AppColors.adminAccent),
              child: const Text('Xác nhận'),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }

    setState(() => _busy = true);
    try {
      final updated = await _service.changeStatus(
        t!.tournamentId!,
        status: nextStatus,
        cancelReason: cancelReason,
      );
      if (!mounted) return;
      setState(() => _tournament = updated);
      widget.onChanged();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã cập nhật trạng thái giải đấu')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _showStatusPicker() async {
    final t = _tournament;
    if (t == null) return;

    final current = (t.status ?? '').toUpperCase();
    final options = nextStatusesFor(t.status);
    if (options.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Giải đang ở trạng thái "${tournamentStatusLabelVi(current)}" — không thể chuyển tiếp.',
          ),
        ),
      );
      return;
    }

    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
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
              const SizedBox(height: 14),
              const Text(
                'Chuyển trạng thái giải đấu',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                '#${t.tournamentId} · ${t.name ?? ''}',
                style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
              const SizedBox(height: 16),
              const Text(
                'Luồng trạng thái',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted),
              ),
              const SizedBox(height: 8),
              _TournamentFlowStrip(currentStatus: current),
              const SizedBox(height: 8),
              Text(
                'Hiện tại: ${tournamentStatusLabelVi(current)}',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: tournamentStatusColor(current),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Bước tiếp theo có thể chọn',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted),
              ),
              const SizedBox(height: 8),
              ...options.map((code) {
                final isCancel = code == 'CANCELLED';
                final hint = tournamentTransitionHint(current, code);
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  elevation: 0,
                  color: isCancel
                      ? const Color(0xFFFEF2F2)
                      : AppColors.adminAccent.withValues(alpha: 0.06),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: isCancel
                          ? const Color(0xFFFECACA)
                          : AppColors.adminAccent.withValues(alpha: 0.25),
                    ),
                  ),
                  child: ListTile(
                    leading: Icon(
                      isCancel ? Icons.cancel_outlined : Icons.arrow_forward_rounded,
                      color: isCancel ? const Color(0xFFDC2626) : AppColors.adminAccent,
                    ),
                    title: Text(
                      tournamentStatusLabelVi(code),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: isCancel ? const Color(0xFF991B1B) : AppColors.heading,
                      ),
                    ),
                    subtitle: hint.isNotEmpty
                        ? Text(hint, style: const TextStyle(fontSize: 12))
                        : null,
                    onTap: () => Navigator.pop(ctx, code),
                  ),
                );
              }),
              const SizedBox(height: 4),
              const Text(
                'DRAFT → OPEN → ONGOING → FINISHED. Các trạng thái đang hoạt động có thể chuyển sang Đã hủy.',
                style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.35),
              ),
            ],
          ),
        ),
      ),
    );
    if (picked != null) await _onChangeStatus(picked);
  }

  Future<void> _onDelete() async {
    final t = _tournament;
    if (t?.tournamentId == null) return;

    String? reason;
    if (t!.racesCount > 0) {
      reason = await _promptReason(
        'Giải có ${t.racesCount} cuộc đua — sẽ hủy thay vì xóa',
        required: true,
      );
      if (reason == null || reason.isEmpty) return;
    } else {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Xóa giải đấu'),
          content: Text('Xóa vĩnh viễn giải #${t.tournamentId} (${t.name})?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: FilledButton.styleFrom(backgroundColor: const Color(0xFFDC2626)),
              child: const Text('Xóa'),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }

    setState(() => _busy = true);
    try {
      final result = await _service.deleteTournament(t.tournamentId!, reason: reason);
      if (!mounted) return;
      widget.onChanged();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.deleted ? 'Đã xóa giải đấu.' : 'Giải có cuộc đua — đã chuyển sang Đã hủy.',
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
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = _tournament;
    final status = t?.status ?? '';

    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: Text(t?.name ?? 'Chi tiết giải đấu'),
      ),
      body: _loading && t == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.adminAccent))
          : _error != null && t == null
              ? _ErrorBody(message: _error!, onRetry: _load)
              : t == null
                  ? const Center(child: Text('Không tìm thấy giải đấu'))
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                      children: [
                        _HeaderCard(tournament: t),
                        const SizedBox(height: 16),
                        _InfoCard(
                          title: 'Thông tin giải đấu',
                          rows: [
                            _InfoRow('Mã giải', '#${t.tournamentId}'),
                            _InfoRow('Tên', t.name ?? '—'),
                            _InfoRow('Mô tả', t.description?.isNotEmpty == true ? t.description! : '—'),
                            _InfoRow(
                              'Trạng thái',
                              tournamentStatusLabelVi(status),
                              valueColor: tournamentStatusColor(status),
                            ),
                            _InfoRow('Số cuộc đua', '${t.racesCount}'),
                            _InfoRow(
                              'Bắt đầu',
                              formatTournamentDateTime(t.startAt),
                            ),
                            _InfoRow(
                              'Kết thúc',
                              formatTournamentDateTime(t.endAt),
                            ),
                            if (t.cancelReason?.isNotEmpty == true)
                              _InfoRow(
                                'Lý do hủy',
                                t.cancelReason!,
                                valueColor: AppColors.errorText,
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Luồng trạng thái',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.heading,
                                ),
                              ),
                              const SizedBox(height: 12),
                              _TournamentFlowStrip(currentStatus: status.toUpperCase()),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                        if (_busy)
                          const Center(child: CircularProgressIndicator())
                        else ...[
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: t.isEditable ? _openEdit : null,
                                  icon: const Icon(Icons.edit_outlined, size: 18),
                                  label: const Text('Sửa'),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.adminAccent,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: nextStatusesFor(status).isEmpty
                                      ? null
                                      : _showStatusPicker,
                                  icon: const Icon(Icons.swap_horiz, size: 18),
                                  label: const Text('Trạng thái'),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: status == 'FINISHED' ? null : _onDelete,
                              icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                              label: Text(t.racesCount > 0 ? 'Hủy giải' : 'Xóa'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFFDC2626),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.tournament});

  final AdminTournament tournament;

  @override
  Widget build(BuildContext context) {
    final status = tournament.status ?? '';
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
            child: const Icon(Icons.emoji_events, color: AppColors.adminAccent, size: 32),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tournament.name ?? '—',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '#${tournament.tournamentId}',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.8)),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: tournamentStatusColor(status).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              tournamentStatusLabelVi(status),
              style: TextStyle(
                color: tournamentStatusColor(status),
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
  final List<_InfoRow> rows;

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
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 110,
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
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow {
  const _InfoRow(this.label, this.value, {this.valueColor});

  final String label;
  final String value;
  final Color? valueColor;
}

class _TournamentFlowStrip extends StatelessWidget {
  const _TournamentFlowStrip({required this.currentStatus});

  final String currentStatus;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < tournamentMainFlow.length; i++) ...[
            if (i > 0)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4),
                child: Icon(Icons.arrow_forward, size: 14, color: AppColors.textMuted),
              ),
            _FlowStepChip(
              code: tournamentMainFlow[i],
              isCurrent: tournamentMainFlow[i] == currentStatus.toUpperCase(),
              isPast: _stepIndex(currentStatus) > i,
            ),
          ],
          if (currentStatus == 'CANCELLED') ...[
            const SizedBox(width: 8),
            _FlowStepChip(code: 'CANCELLED', isCurrent: true, isPast: false),
          ],
        ],
      ),
    );
  }

  int _stepIndex(String status) {
    final idx = tournamentMainFlow.indexOf(status.toUpperCase());
    return idx < 0 ? -1 : idx;
  }
}

class _FlowStepChip extends StatelessWidget {
  const _FlowStepChip({
    required this.code,
    required this.isCurrent,
    required this.isPast,
  });

  final String code;
  final bool isCurrent;
  final bool isPast;

  @override
  Widget build(BuildContext context) {
    final color = tournamentStatusColor(code);
    final bg = isCurrent
        ? tournamentStatusBg(code)
        : isPast
            ? color.withValues(alpha: 0.12)
            : const Color(0xFFF8FAFC);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isCurrent ? color : AppColors.border,
          width: isCurrent ? 1.5 : 1,
        ),
      ),
      child: Text(
        tournamentStatusLabelVi(code),
        style: TextStyle(
          fontSize: 11,
          fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
          color: isPast || isCurrent ? color : AppColors.textMuted,
        ),
      ),
    );
  }
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
