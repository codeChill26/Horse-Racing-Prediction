import 'package:flutter/material.dart';

import '../../models/admin_tournament.dart';
import '../../services/admin_tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/tournament_status_labels.dart';
import 'admin_tournament_form_sheet.dart';

class AdminTournamentsScreen extends StatefulWidget {
  const AdminTournamentsScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<AdminTournamentsScreen> createState() => _AdminTournamentsScreenState();
}

class _AdminTournamentsScreenState extends State<AdminTournamentsScreen> {
  final _service = AdminTournamentsService();
  final _searchController = TextEditingController();

  List<AdminTournament> _tournaments = [];
  bool _loading = true;
  String? _error;
  String _statusFilter = '';
  String _search = '';
  int? _busyId;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _search = _searchController.text);
    });
    _loadTournaments();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTournaments() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _service.listTournaments(
        status: _statusFilter.isEmpty ? null : _statusFilter,
      );
      if (!mounted) return;
      setState(() {
        _tournaments = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _tournaments = [];
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  List<AdminTournament> get _filtered {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) return _tournaments;
    return _tournaments.where((t) {
      return (t.name?.toLowerCase().contains(q) ?? false) ||
          (t.description?.toLowerCase().contains(q) ?? false) ||
          '${t.tournamentId}'.contains(q);
    }).toList();
  }

  ({int total, int open, int draft, int races}) get _stats {
    var races = 0;
    for (final t in _tournaments) {
      races += t.racesCount;
    }
    return (
      total: _tournaments.length,
      open: _tournaments.where((t) => t.status == 'OPEN').length,
      draft: _tournaments.where((t) => t.status == 'DRAFT').length,
      races: races,
    );
  }

  void _replaceTournament(AdminTournament updated) {
    setState(() {
      _tournaments = _tournaments
          .map((t) => t.tournamentId == updated.tournamentId ? updated : t)
          .toList();
    });
  }

  void _removeTournament(int id) {
    setState(() {
      _tournaments = _tournaments.where((t) => t.tournamentId != id).toList();
    });
  }

  Future<void> _openCreate() async {
    final ok = await showAdminTournamentFormSheet(context);
    if (ok == true) await _loadTournaments();
  }

  Future<void> _openEdit(AdminTournament t) async {
    if (t.tournamentId == null) return;
    final ok = await showAdminTournamentFormSheet(context, tournamentId: t.tournamentId);
    if (ok == true) await _loadTournaments();
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

  Future<void> _onChangeStatus(AdminTournament t, String nextStatus) async {
    if (t.tournamentId == null) return;

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
            '#${t.tournamentId} ${t.name}\n\n'
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

    setState(() => _busyId = t.tournamentId);
    setState(() => _error = null);
    try {
      final updated = await _service.changeStatus(
        t.tournamentId!,
        status: nextStatus,
        cancelReason: cancelReason,
      );
      _replaceTournament(updated);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _showStatusPicker(AdminTournament t) async {
    final options = nextStatusesFor(t.status);
    if (options.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Giải này không thể đổi trạng thái.')),
      );
      return;
    }

    final picked = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Chuyển trạng thái',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
            ),
            ...options.map(
              (code) => ListTile(
                title: Text(tournamentStatusLabelVi(code)),
                onTap: () => Navigator.pop(ctx, code),
              ),
            ),
          ],
        ),
      ),
    );
    if (picked != null) await _onChangeStatus(t, picked);
  }

  Future<void> _onDelete(AdminTournament t) async {
    if (t.tournamentId == null) return;

    String? reason;
    if (t.racesCount > 0) {
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

    setState(() => _busyId = t.tournamentId);
    setState(() => _error = null);
    try {
      final result = await _service.deleteTournament(t.tournamentId!, reason: reason);
      if (result.deleted) {
        _removeTournament(t.tournamentId!);
      } else if (result.tournament != null) {
        _replaceTournament(result.tournament!);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.deleted ? 'Đã xóa giải đấu.' : 'Giải có cuộc đua — đã chuyển sang Đã hủy.',
          ),
        ),
      );
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = _stats;
    final filtered = _filtered;

    return RefreshIndicator(
      onRefresh: _loadTournaments,
      color: AppColors.adminAccent,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.adminDeep,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 16, bottom: 14, right: 56),
              title: const Text(
                'Quản lý giải đấu',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    'assets/images/anh-dua-ngua-7.jpg',
                    fit: BoxFit.cover,
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0x550F172A),
                          Color(0xCC0F172A),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              IconButton(
                tooltip: 'Đăng xuất',
                onPressed: widget.onLogout,
                icon: const Icon(Icons.logout_rounded),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _TournamentStatsRow(
                    loading: _loading,
                    total: s.total,
                    open: s.open,
                    draft: s.draft,
                    races: s.races,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Tìm theo tên, mô tả, ID…',
                            prefixIcon: const Icon(Icons.search, size: 22),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton.icon(
                        onPressed: _openCreate,
                        icon: const Icon(Icons.add, size: 20),
                        label: const Text('Tạo'),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.adminAccent,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _FilterChip(
                          label: 'Tất cả',
                          selected: _statusFilter.isEmpty,
                          onTap: () {
                            setState(() => _statusFilter = '');
                            _loadTournaments();
                          },
                        ),
                        ...tournamentStatusCodes.map(
                          (code) => _FilterChip(
                            label: tournamentStatusLabelVi(code),
                            selected: _statusFilter == code,
                            onTap: () {
                              setState(() => _statusFilter = code);
                              _loadTournaments();
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    _ErrorBanner(message: _error!, onRetry: _loadTournaments),
                  ],
                ],
              ),
            ),
          ),
          if (_loading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else if (filtered.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Text(
                  'Không có giải đấu phù hợp.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final t = filtered[index];
                    return _TournamentCard(
                      tournament: t,
                      busy: _busyId == t.tournamentId,
                      onEdit: () => _openEdit(t),
                      onStatus: () => _showStatusPicker(t),
                      onDelete: () => _onDelete(t),
                    );
                  },
                  childCount: filtered.length,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
        selectedColor: AppColors.adminAccent.withValues(alpha: 0.2),
        checkmarkColor: AppColors.adminAccent,
      ),
    );
  }
}

class _TournamentStatsRow extends StatelessWidget {
  const _TournamentStatsRow({
    required this.loading,
    required this.total,
    required this.open,
    required this.draft,
    required this.races,
  });

  final bool loading;
  final int total;
  final int open;
  final int draft;
  final int races;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _StatCard(width: w, label: 'Tổng giải', value: loading ? '—' : '$total'),
            _StatCard(
              width: w,
              label: 'Mở đăng ký',
              value: loading ? '—' : '$open',
              accent: true,
            ),
            _StatCard(width: w, label: 'Nháp', value: loading ? '—' : '$draft'),
            _StatCard(
              width: w,
              label: 'Tổng cuộc đua',
              value: loading ? '—' : '$races',
              success: true,
            ),
          ],
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.width,
    required this.label,
    required this.value,
    this.success = false,
    this.accent = false,
  });

  final double width;
  final String label;
  final String value;
  final bool success;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    Color? border;
    Color? bg;
    Color valueColor = AppColors.heading;

    if (success) {
      bg = const Color(0xFFECFDF5);
      border = const Color(0xFFA7F3D0);
      valueColor = const Color(0xFF065F46);
    } else if (accent) {
      bg = AppColors.adminAccent.withValues(alpha: 0.08);
      border = AppColors.adminAccent.withValues(alpha: 0.35);
      valueColor = AppColors.adminAccent;
    }

    return SizedBox(
      width: width,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: bg ?? Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: border ?? AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: valueColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TournamentCard extends StatelessWidget {
  const _TournamentCard({
    required this.tournament,
    required this.busy,
    required this.onEdit,
    required this.onStatus,
    required this.onDelete,
  });

  final AdminTournament tournament;
  final bool busy;
  final VoidCallback onEdit;
  final VoidCallback onStatus;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final status = tournament.status ?? '';
    final statusColor = tournamentStatusColor(status);
    final statusBg = tournamentStatusBg(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        tournament.name ?? '—',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.heading,
                        ),
                      ),
                      if (tournament.description?.isNotEmpty == true)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            tournament.description!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                        ),
                    ],
                  ),
                ),
                Text(
                  '#${tournament.tournamentId}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    tournamentStatusLabelVi(status),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: statusColor,
                    ),
                  ),
                ),
                Text(
                  '${tournament.racesCount} cuộc đua',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${formatTournamentDateTime(tournament.startAt)} → ${formatTournamentDateTime(tournament.endAt)}',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
            if (tournament.cancelReason?.isNotEmpty == true) ...[
              const SizedBox(height: 6),
              Text(
                'Lý do hủy: ${tournament.cancelReason}',
                style: const TextStyle(fontSize: 11, color: AppColors.errorText),
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: busy || !tournament.isEditable ? null : onEdit,
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    label: const Text('Sửa'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.adminAccent,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: busy || nextStatusesFor(status).isEmpty ? null : onStatus,
                    icon: const Icon(Icons.swap_horiz, size: 18),
                    label: const Text('Trạng thái'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: busy || status == 'FINISHED' ? null : onDelete,
                icon: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                label: Text(tournament.racesCount > 0 ? 'Hủy giải' : 'Xóa'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFDC2626),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.errorBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(message, style: const TextStyle(color: AppColors.errorText)),
          const SizedBox(height: 8),
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}
