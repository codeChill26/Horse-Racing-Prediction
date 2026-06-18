import 'package:flutter/material.dart';

import '../../models/admin_tournament.dart';
import '../../services/admin_tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/tournament_status_labels.dart';
import 'admin_tournament_detail_screen.dart';
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

  ({int total, int open, int draft, int ongoing, int finished, int races}) get _stats {
    var races = 0;
    for (final t in _tournaments) {
      races += t.racesCount;
    }
    return (
      total: _tournaments.length,
      open: _tournaments.where((t) => t.status == 'OPEN').length,
      draft: _tournaments.where((t) => t.status == 'DRAFT').length,
      ongoing: _tournaments.where((t) => t.status == 'ONGOING').length,
      finished: _tournaments.where((t) => t.status == 'FINISHED').length,
      races: races,
    );
  }

  Future<void> _openCreate() async {
    final ok = await showAdminTournamentFormSheet(context);
    if (ok == true) await _loadTournaments();
  }

  Future<void> _openDetail(AdminTournament tournament) async {
    if (tournament.tournamentId == null) return;
    await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => AdminTournamentDetailScreen(
          tournamentId: tournament.tournamentId!,
          initialTournament: tournament,
          onChanged: () {},
        ),
      ),
    );
    await _loadTournaments();
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
                    draft: s.draft,
                    open: s.open,
                    ongoing: s.ongoing,
                    finished: s.finished,
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
              sliver: SliverList.separated(
                itemCount: filtered.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final t = filtered[index];
                  return _TournamentListTile(
                    tournament: t,
                    onTap: () => _openDetail(t),
                  );
                },
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
    required this.draft,
    required this.open,
    required this.ongoing,
    required this.finished,
    required this.races,
  });

  final bool loading;
  final int total;
  final int draft;
  final int open;
  final int ongoing;
  final int finished;
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
            _StatCard(width: w, label: 'Nháp', value: loading ? '—' : '$draft'),
            _StatCard(
              width: w,
              label: 'Mở đăng ký',
              value: loading ? '—' : '$open',
              accent: true,
            ),
            _StatCard(
              width: w,
              label: 'Đang diễn ra',
              value: loading ? '—' : '$ongoing',
            ),
            _StatCard(
              width: w,
              label: 'Đã kết thúc',
              value: loading ? '—' : '$finished',
              success: true,
            ),
            _StatCard(
              width: w,
              label: 'Tổng cuộc đua',
              value: loading ? '—' : '$races',
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

class _TournamentListTile extends StatelessWidget {
  const _TournamentListTile({
    required this.tournament,
    required this.onTap,
  });

  final AdminTournament tournament;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = tournament.status ?? '';
    final statusColor = tournamentStatusColor(status);
    final statusBg = tournamentStatusBg(status);

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.adminBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.emoji_events, color: AppColors.adminAccent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  tournament.name ?? '—',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: AppColors.heading,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  tournamentStatusLabelVi(status),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, color: AppColors.textMuted),
            ],
          ),
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
