import 'package:flutter/material.dart';

import '../../models/admin_race.dart';
import '../../services/admin_races_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';
import 'admin_race_assign_referee_sheet.dart';
import 'admin_race_bulk_review_sheet.dart';
import 'admin_race_conflict_screen.dart';
import 'admin_race_entries_screen.dart';
import 'admin_race_form_sheet.dart';
import 'admin_race_referee_screen.dart';

class AdminRaceDetailScreen extends StatefulWidget {
  const AdminRaceDetailScreen({
    super.key,
    required this.tournamentId,
    required this.raceId,
    this.initialRace,
    required this.onChanged,
  });

  final int tournamentId;
  final int raceId;
  final AdminRace? initialRace;
  final VoidCallback onChanged;

  @override
  State<AdminRaceDetailScreen> createState() => _AdminRaceDetailScreenState();
}

class _AdminRaceDetailScreenState extends State<AdminRaceDetailScreen> {
  final _service = AdminRacesService();

  AdminRace? _race;
  List<RaceEntry> _entries = [];
  EntriesResponse? _entryMeta;
  String _entryFilter = 'ALL';

  bool _loading = true;
  bool _entriesLoading = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _race = widget.initialRace;
    _loadRace();
    _loadEntries();
  }

  Future<void> _loadRace() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await _service.getRace(widget.raceId);
      if (!mounted) return;
      setState(() {
        _race = r;
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

  Future<void> _loadEntries() async {
    setState(() {
      _entriesLoading = true;
    });
    try {
      final resp = await _service.listEntries(
        widget.raceId,
        status: _entryFilter,
      );
      if (!mounted) return;
      setState(() {
        _entries = resp.entries;
        _entryMeta = resp;
        _entriesLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _entriesLoading = false;
      });
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<bool> _confirm(String title, String message, {String confirmLabel = 'Xác nhận'}) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.adminAccent,
            ),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return ok == true;
  }

  Future<void> _openEdit() async {
    final ok = await showAdminRaceFormSheet(
      context,
      tournamentId: widget.tournamentId,
      raceId: widget.raceId,
    );
    if (ok == true) {
      widget.onChanged();
      await _loadRace();
    }
  }

  Future<void> _onDelete() async {
    final r = _race;
    if (r == null) return;
    if (!r.isDeletedSafe) {
      _snack('Race đã có entry hoặc prediction — không thể xóa.');
      return;
    }
    final ok = await _confirm(
      'Xóa cuộc đua',
      'Xóa vĩnh viễn race #${r.raceId}? Hành động không thể hoàn tác.',
      confirmLabel: 'Xóa',
    );
    if (!ok) return;
    setState(() => _busy = true);
    try {
      await _service.deleteRace(widget.raceId);
      if (!mounted) return;
      widget.onChanged();
      _snack('Đã xóa cuộc đua.');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      _snack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleRegistrationGate() async {
    final r = _race;
    if (r == null) return;
    final next = !r.registrationOpen;
    final ok = await _confirm(
      next ? 'Mở cổng đăng ký' : 'Đóng cổng đăng ký',
      next
          ? 'Mở cổng đăng ký — chủ ngựa có thể đăng ký vào race này.'
          : 'Đóng cổng đăng ký — các entry PENDING sẽ tự động bị từ chối.',
    );
    if (!ok) return;
    setState(() => _busy = true);
    try {
      final updated = await _service.setRegistrationGate(widget.raceId, next);
      if (!mounted) return;
      setState(() => _race = updated);
      widget.onChanged();
      _snack(next ? 'Đã mở cổng đăng ký.' : 'Đã đóng cổng đăng ký.');
      await _loadEntries();
    } catch (e) {
      if (!mounted) return;
      _snack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _onPublish() async {
    final r = _race;
    if (r == null) return;
    final ok = await _confirm(
      'Công bố kết quả',
      'Công bố kết quả race #${r.raceId} và tự động settle prediction. Hành động này rất nặng — chỉ thực hiện khi đã chắc chắn.',
    );
    if (!ok) return;
    setState(() => _busy = true);
    try {
      final res = await _service.publishRace(widget.raceId);
      final count = res['settledCount'] ?? '?';
      if (!mounted) return;
      widget.onChanged();
      await _loadRace();
      _snack('Đã công bố · settle $count prediction.');
    } catch (e) {
      if (!mounted) return;
      _snack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _onUnpublish() async {
    final r = _race;
    if (r == null) return;
    final ok = await _confirm(
      'Hủy công bố',
      'Hủy công bố race #${r.raceId}, hoàn tiền bet và reset prediction về PENDING.',
    );
    if (!ok) return;
    setState(() => _busy = true);
    try {
      await _service.unpublishRace(widget.raceId);
      if (!mounted) return;
      widget.onChanged();
      await _loadRace();
      _snack('Đã hủy công bố và hoàn tiền.');
    } catch (e) {
      if (!mounted) return;
      _snack(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openBulkReview() async {
    final res = await showBulkReviewSheet(
      context,
      raceId: widget.raceId,
      entries: _entries,
      approvedCount: _entryMeta?.approvedCount ?? 0,
      maxEntries: _entryMeta?.maxEntries ?? (_race?.maxEntries ?? 8),
    );
    if (res is Map<String, dynamic> && res['ok'] == true) {
      widget.onChanged();
      await _loadRace();
      await _loadEntries();
      final summary = res['summary'];
      if (summary is BulkReviewSummary) {
        final msg = StringBuffer(
          'Đã duyệt ${summary.approved} · từ chối ${summary.rejected}',
        );
        if (summary.hasErrors) {
          msg.write(' · ${summary.errors.length} lỗi');
        }
        msg.write('.');
        _snack(msg.toString());
      } else {
        _snack('Đã cập nhật.');
      }
    }
  }

  Future<void> _openAssignReferees() async {
    final res = await showAssignRefereeSheet(context, raceId: widget.raceId);
    if (res != null && res.isNotEmpty) {
      widget.onChanged();
      _snack('Đã phân công ${res.length} trọng tài.');
      await _loadRace();
    }
  }

  Future<void> _openRefereeManager() async {
    final r = _race;
    if (r == null) return;
    await pushRefereeManager(
      context,
      raceId: widget.raceId,
      raceName: r.name ?? 'Race #${widget.raceId}',
      raceStatus: r.status ?? 'SCHEDULED',
    );
    widget.onChanged();
    await _loadRace();
  }

  Future<void> _openResolveConflict() async {
    final res = await pushConflictResolver(context, raceId: widget.raceId);
    if (res is Map<String, dynamic> && res['ok'] == true) {
      widget.onChanged();
      await _loadRace();
      _snack('Đã ghi đè kết quả · race về PENDING_RESULT.');
    }
  }

  Future<void> _openEntriesManager() async {
    if (widget.raceId == 0) return;
    await pushEntriesManager(
      context,
      raceId: widget.raceId,
      raceName: _race?.name ?? 'Race #${widget.raceId}',
      maxEntries: _entryMeta?.maxEntries ?? (_race?.maxEntries ?? 8),
      onChanged: () {
        widget.onChanged();
      },
    );
    await _loadRace();
    await _loadEntries();
  }

  Future<void> _changeEntryFilter(String status) async {
    if (status == _entryFilter) return;
    setState(() => _entryFilter = status);
    await _loadEntries();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _race == null) {
      return Scaffold(
        backgroundColor: AppColors.adminBg,
        appBar: AppBar(
          backgroundColor: AppColors.adminDeep,
          foregroundColor: Colors.white,
          title: const Text('Chi tiết cuộc đua'),
        ),
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.adminAccent),
        ),
      );
    }

    if (_error != null && _race == null) {
      return Scaffold(
        backgroundColor: AppColors.adminBg,
        appBar: AppBar(
          backgroundColor: AppColors.adminDeep,
          foregroundColor: Colors.white,
          title: const Text('Chi tiết cuộc đua'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _loadRace,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.adminAccent,
                  ),
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final r = _race!;
    final status = (r.status ?? '').toUpperCase();
    final isPublished = status == 'FINISHED';
    final isPaused = status == 'PAUSED';
    final isScheduled = status == 'SCHEDULED' || status == 'REGISTRATION_OPEN';

    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: Text(r.name ?? 'Race #${r.raceId}'),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          widget.onChanged();
          await _loadRace();
          await _loadEntries();
        },
        color: AppColors.adminAccent,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _HeaderCard(race: r),
            const SizedBox(height: 16),
            _ActionPanel(
              isBusy: _busy,
              race: r,
              onEdit: isPublished || status == 'CANCELLED' ? null : _openEdit,
              onDelete: r.isDeletedSafe ? _onDelete : null,
              onToggleGate: isScheduled ? _toggleRegistrationGate : null,
              onPublish:
                  status == 'PENDING_RESULT' || status == 'REGISTRATION_CLOSED'
                      ? _onPublish
                      : null,
              onUnpublish: isPublished ? _onUnpublish : null,
              onAssignReferees: status == 'SCHEDULED' ? _openAssignReferees : null,
              onResolveConflict: isPaused ? _openResolveConflict : null,
              onOpenRefereeManager: _openRefereeManager,
            ),
            const SizedBox(height: 16),
            _InfoCard(
              title: 'Thông tin race',
              rows: [
                _InfoRow('Mã race', '#${r.raceId}'),
                _InfoRow('Tên', r.name ?? '—'),
                _InfoRow(
                  'Giải đấu',
                  r.tournamentName != null
                      ? '#${r.tournamentId} · ${r.tournamentName!}'
                      : '#${r.tournamentId ?? '—'}',
                ),
                _InfoRow(
                  'Trạng thái',
                  raceStatusLabelVi(status),
                  valueColor: raceStatusColor(status),
                ),
                _InfoRow(
                  'Ngựa tối đa',
                  '${r.entriesCount}/${r.maxEntries}',
                ),
                _InfoRow(
                  'Prediction',
                  '${r.predictionsCount}',
                ),
                _InfoRow(
                  'Cổng ĐK',
                  r.registrationOpen ? 'Đang mở' : 'Đã đóng',
                  valueColor: r.registrationOpen
                      ? AppColors.ownerTeal
                      : AppColors.textMuted,
                ),
                _InfoRow(
                  'Lịch chạy',
                  formatRaceDateTime(r.scheduledAt?.toLocal()),
                ),
                _InfoRow(
                  'Hạn ĐK',
                  formatRaceDateTime(r.registrationDeadline?.toLocal()),
                ),
                if (r.cancelReason != null && r.cancelReason!.isNotEmpty)
                  _InfoRow(
                    'Lý do hủy',
                    r.cancelReason!,
                    valueColor: AppColors.errorText,
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _EntriesCard(
              entries: _entries,
              loading: _entriesLoading,
              filter: _entryFilter,
              onChangeFilter: _changeEntryFilter,
              onBulkReview: _openBulkReview,
              raceMaxEntries: r.maxEntries,
              isRegistrationClosed: !r.registrationOpen,
              approvedCount: _entryMeta?.approvedCount ?? 0,
              onOpenManager: _openEntriesManager,
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.race});

  final AdminRace race;

  @override
  Widget build(BuildContext context) {
    final status = (race.status ?? '').toUpperCase();
    final fillPct = (race.fillRate * 100).round();

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(
          colors: [AppColors.adminDeep, AppColors.adminPrimary],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.flag,
                  color: Colors.white,
                  size: 28,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      race.name ?? 'Race #${race.raceId}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      race.tournamentName ?? '#${race.tournamentId ?? '—'}',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: raceStatusColor(status).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  raceStatusLabelVi(status),
                  style: TextStyle(
                    color: raceStatusColor(status),
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Stack(
              children: [
                Container(
                  height: 8,
                  color: Colors.white.withValues(alpha: 0.15),
                ),
                FractionallySizedBox(
                  widthFactor: race.fillRate,
                  child: Container(
                    height: 8,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Đã đăng ký ${race.entriesCount}/${race.maxEntries} ($fillPct%)',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionPanel extends StatelessWidget {
  const _ActionPanel({
    required this.isBusy,
    required this.race,
    required this.onEdit,
    required this.onDelete,
    required this.onToggleGate,
    required this.onPublish,
    required this.onUnpublish,
    required this.onAssignReferees,
    required this.onResolveConflict,
    required this.onOpenRefereeManager,
  });

  final bool isBusy;
  final AdminRace race;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onToggleGate;
  final VoidCallback? onPublish;
  final VoidCallback? onUnpublish;
  final VoidCallback? onAssignReferees;
  final VoidCallback? onResolveConflict;
  final VoidCallback? onOpenRefereeManager;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Thao tác nhanh',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.heading,
            ),
          ),
          const SizedBox(height: 12),
          if (isBusy)
            const Center(child: CircularProgressIndicator())
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _ActionButton(
                  icon: Icons.edit_outlined,
                  label: 'Sửa',
                  color: AppColors.adminAccent,
                  onTap: onEdit,
                ),
                _ActionButton(
                  icon: Icons.delete_outline,
                  label: 'Xóa',
                  color: const Color(0xFFDC2626),
                  onTap: onDelete,
                ),
                _ActionButton(
                  icon: race.registrationOpen
                      ? Icons.lock_outline
                      : Icons.lock_open,
                  label: race.registrationOpen
                      ? 'Đóng ĐK'
                      : 'Mở ĐK',
                  color: AppColors.ownerTeal,
                  onTap: onToggleGate,
                ),
                _ActionButton(
                  icon: Icons.sports_score,
                  label: 'Phân công TT',
                  color: const Color(0xFF7C3AED),
                  onTap: onAssignReferees,
                ),
                _ActionButton(
                  icon: Icons.flag_circle_outlined,
                  label: 'Công bố',
                  color: AppColors.ownerTeal,
                  onTap: onPublish,
                ),
                _ActionButton(
                  icon: Icons.undo,
                  label: 'Hủy công bố',
                  color: AppColors.textMuted,
                  onTap: onUnpublish,
                ),
                _ActionButton(
                  icon: Icons.warning_amber_outlined,
                  label: 'Xử lý tranh chấp',
                  color: const Color(0xFFB91C1C),
                  onTap: onResolveConflict,
                ),
                _ActionButton(
                  icon: Icons.assignment_ind,
                  label: 'Quản lý trọng tài',
                  color: const Color(0xFF7C3AED),
                  onTap: onOpenRefereeManager,
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: onTap == null
              ? AppColors.adminBg
              : color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: onTap == null
                ? AppColors.border
                : color.withValues(alpha: 0.35),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: onTap == null ? AppColors.textMuted : color, size: 18),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: onTap == null ? AppColors.textMuted : color,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ],
        ),
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
                    child: Text(
                      r.label,
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
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

class _EntriesCard extends StatelessWidget {
  const _EntriesCard({
    required this.entries,
    required this.loading,
    required this.filter,
    required this.onChangeFilter,
    required this.onBulkReview,
    required this.raceMaxEntries,
    required this.isRegistrationClosed,
    required this.approvedCount,
    required this.onOpenManager,
  });

  final List<RaceEntry> entries;
  final bool loading;
  final String filter;
  final ValueChanged<String> onChangeFilter;
  final VoidCallback onBulkReview;
  final int raceMaxEntries;
  final bool isRegistrationClosed;
  final int approvedCount;
  final VoidCallback onOpenManager;

  @override
  Widget build(BuildContext context) {
    final filters = const ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];
    final pendingCount = entries.where((e) => e.isPending).length;
    final rejectedCount = entries.where((e) => e.isRejected).length;
    final remainingSlots = (raceMaxEntries - approvedCount).clamp(0, raceMaxEntries);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Danh sách entry',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.heading,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Mở trang quản lý đăng ký',
                icon: const Icon(Icons.open_in_full, size: 18),
                onPressed: onOpenManager,
                color: AppColors.adminAccent,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 12,
            runSpacing: 6,
            children: [
              _MiniStat(
                label: 'Slot',
                value: '$approvedCount/$raceMaxEntries',
                color: AppColors.heading,
              ),
              _MiniStat(
                label: 'Còn lại',
                value: '$remainingSlots',
                color: remainingSlots == 0
                    ? AppColors.errorText
                    : AppColors.ownerTeal,
              ),
              _MiniStat(
                label: 'Chờ duyệt',
                value: '$pendingCount',
                color: pendingCount == 0
                    ? AppColors.textMuted
                    : const Color(0xFFD97706),
              ),
              _MiniStat(
                label: 'Từ chối',
                value: '$rejectedCount',
                color: rejectedCount == 0
                    ? AppColors.textMuted
                    : AppColors.errorText,
              ),
            ],
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final f in filters)
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: FilterChip(
                      label: Text(_filterLabel(f)),
                      selected: filter == f,
                      onSelected: (_) => onChangeFilter(f),
                      selectedColor:
                          AppColors.adminAccent.withValues(alpha: 0.2),
                      checkmarkColor: AppColors.adminAccent,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          if (loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child:
                  Center(child: CircularProgressIndicator()),
            )
          else if (entries.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text(
                  'Chưa có entry trong bộ lọc này.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
            )
          else ...[
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: pendingCount == 0 ? null : onBulkReview,
                    icon: const Icon(Icons.checklist),
                    label: const Text('Duyệt hàng loạt'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.adminAccent,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: onOpenManager,
                  icon: const Icon(Icons.open_in_new, size: 18),
                  label: const Text('Quản lý đăng ký'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.adminAccent,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ...entries.take(5).map((e) => _EntryTile(entry: e)),
            if (entries.length > 5) ...[
              const SizedBox(height: 6),
              Center(
                child: TextButton.icon(
                  onPressed: onOpenManager,
                  icon: const Icon(Icons.more_horiz),
                  label: Text('Xem thêm ${entries.length - 5} entry'),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  String _filterLabel(String code) {
    switch (code) {
      case 'PENDING':
        return 'Chờ duyệt';
      case 'APPROVED':
        return 'Đã duyệt';
      case 'REJECTED':
        return 'Từ chối';
      default:
        return 'Tất cả';
    }
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.adminBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label: ',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry});

  final RaceEntry entry;

  @override
  Widget build(BuildContext context) {
    final status = (entry.status ?? '').toUpperCase();
    final color = entryStatusColor(status);
    final bg = entryStatusBg(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.adminBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  entry.horseName ?? 'Ngựa #${entry.entryId}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.heading,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    if (entry.ownerName != null && entry.ownerName!.isNotEmpty)
                      'Chủ: ${entry.ownerName}',
                    if (entry.jockeyName != null && entry.jockeyName!.isNotEmpty)
                      'Kỵ sĩ: ${entry.jockeyName}',
                  ].join(' · '),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
                if (entry.rejectionReason != null && entry.rejectionReason!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Lý do: ${entry.rejectionReason!}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.errorText,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              _statusLabel(status),
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _statusLabel(String code) {
    switch (code) {
      case 'PENDING':
        return 'CHỜ';
      case 'APPROVED':
        return 'DUYỆT';
      case 'REJECTED':
        return 'TỪ CHỐI';
      default:
        return code.isEmpty ? '—' : code;
    }
  }
}

Color entryStatusColor(String code) {
  switch (code.toUpperCase()) {
    case 'PENDING':
      return const Color(0xFFD97706);
    case 'APPROVED':
      return const Color(0xFF065F46);
    case 'REJECTED':
      return AppColors.errorText;
    default:
      return AppColors.textMuted;
  }
}

Color entryStatusBg(String code) {
  switch (code.toUpperCase()) {
    case 'PENDING':
      return const Color(0xFFFEF3C7);
    case 'APPROVED':
      return const Color(0xFFECFDF5);
    case 'REJECTED':
      return AppColors.errorBg;
    default:
      return AppColors.adminBg;
  }
}
