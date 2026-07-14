import 'package:flutter/material.dart';

import '../../models/admin_race.dart';
import '../../models/admin_tournament.dart';
import '../../services/admin_races_service.dart';
import '../../services/admin_tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';
import '../../utils/tournament_status_labels.dart';
import 'admin_race_detail_screen.dart';
import 'admin_race_form_sheet.dart';

/// Tab Race trong admin shell:
/// - Hiển thị danh sách giải (mặc định lọc OPEN/ONGOING) ở panel trên.
/// - Khi chọn 1 giải → list các cuộc đua của giải đó ở panel dưới.
/// - Bấm race để mở AdminRaceDetailScreen (xem/sửa tất cả action của admin).
class AdminRacesScreen extends StatefulWidget {
  const AdminRacesScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<AdminRacesScreen> createState() => _AdminRacesScreenState();
}

class _AdminRacesScreenState extends State<AdminRacesScreen> {
  final _tournamentService = AdminTournamentsService();
  final _raceService = AdminRacesService();

  List<AdminTournament> _tournaments = [];
  List<AdminRace> _races = [];

  AdminTournament? _selectedTournament;

  String _tournamentFilter = 'OPEN';
  String _statusFilter = 'ALL';
  String _search = '';

  final _searchController = TextEditingController();

  bool _loadingTournaments = true;
  bool _loadingRaces = false;
  String? _error;

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
      _loadingTournaments = true;
      _error = null;
    });
    try {
      final list = await _tournamentService.listTournaments(
        status: _tournamentFilter.isEmpty ? null : _tournamentFilter,
      );
      if (!mounted) return;
      setState(() {
        _tournaments = list;
        _loadingTournaments = false;
      });
      // auto-select first tournament
      if (list.isNotEmpty) {
        if (_selectedTournament == null ||
            !list.any((t) => t.tournamentId == _selectedTournament?.tournamentId)) {
          _selectedTournament = list.first;
          await _loadRacesFor(_selectedTournament!);
        }
      } else {
        _selectedTournament = null;
        _races = [];
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _tournaments = [];
        _error = e.toString().replaceFirst('Exception: ', '');
        _loadingTournaments = false;
      });
    }
  }

  Future<void> _loadRacesFor(AdminTournament t) async {
    if (t.tournamentId == null) return;
    setState(() {
      _loadingRaces = true;
      _error = null;
    });
    try {
      final races = await _raceService.listRacesByTournament(t.tournamentId!);
      if (!mounted) return;
      setState(() {
        _races = races;
        _loadingRaces = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _races = [];
        _error = e.toString().replaceFirst('Exception: ', '');
        _loadingRaces = false;
      });
    }
  }

  Future<void> _onChangeTournamentFilter(String filter) async {
    setState(() => _tournamentFilter = filter);
    await _loadTournaments();
  }

  List<AdminRace> get _filteredRaces {
    final byStatus = _statusFilter == 'ALL'
        ? _races
        : _races.where((r) => (r.status ?? '').toUpperCase() == _statusFilter).toList();
    if (_search.trim().isEmpty) return byStatus;
    final q = _search.trim().toLowerCase();
    return byStatus.where((r) {
      return (r.name?.toLowerCase().contains(q) ?? false) ||
          '${r.raceId}'.contains(q);
    }).toList();
  }

  Future<void> _refreshCurrent() async {
    await _loadTournaments();
    if (_selectedTournament != null) {
      await _loadRacesFor(_selectedTournament!);
    }
  }

  Future<void> _openCreate() async {
    final t = _selectedTournament;
    if (t?.tournamentId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Hãy chọn 1 giải trước khi tạo race')),
      );
      return;
    }
    final ok = await showAdminRaceFormSheet(
      context,
      tournamentId: t!.tournamentId!,
    );
    if (ok == true) await _loadRacesFor(t);
  }

  Future<void> _openDetail(AdminRace r) async {
    if (r.raceId == null || _selectedTournament?.tournamentId == null) return;
    await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => AdminRaceDetailScreen(
          tournamentId: _selectedTournament!.tournamentId!,
          raceId: r.raceId!,
          initialRace: r,
          onChanged: () {
            _loadRacesFor(_selectedTournament!);
          },
        ),
      ),
    );
    await _loadRacesFor(_selectedTournament!);
  }

  @override
  Widget build(BuildContext context) {
    final selected = _selectedTournament;
    final filteredRaces = _filteredRaces;

    return Scaffold(
      backgroundColor: AppColors.adminBg,
      body: RefreshIndicator(
        onRefresh: _refreshCurrent,
        color: AppColors.adminAccent,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverAppBar(
              expandedHeight: 180,
              pinned: true,
              backgroundColor: AppColors.adminDeep,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: const EdgeInsets.only(
                  left: 16,
                  bottom: 14,
                  right: 56,
                ),
                title: const Text(
                  'Quản lý cuộc đua',
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
                      'assets/images/horse-racing-track.jpg',
                      fit: BoxFit.cover,
                    ),
                    Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0x660F172A), Color(0xE60F172A)],
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
                    const Text(
                      '1. Chọn giải đấu',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.heading,
                      ),
                    ),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final f in const [
                            ('OPEN', 'Mở ĐK'),
                            ('ONGOING', 'Đang chạy'),
                            ('DRAFT', 'Nháp'),
                            ('FINISHED', 'Kết thúc'),
                            ('CANCELLED', 'Đã hủy'),
                            ('', 'Tất cả'),
                          ])
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: FilterChip(
                                label: Text(f.$2),
                                selected: _tournamentFilter == f.$1,
                                onSelected:
                                    _loadingTournaments ? null : (_) {
                                  _onChangeTournamentFilter(f.$1);
                                },
                                selectedColor: AppColors.adminAccent
                                    .withValues(alpha: 0.2),
                                checkmarkColor: AppColors.adminAccent,
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_loadingTournaments)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (_tournaments.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: AppColors.border),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'Không có giải phù hợp. Tạo giải trong tab "Giải đấu" trước.',
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                      )
                    else
                      Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(
                            color: selected != null &&
                                    selected.tournamentId ==
                                        _selectedTournament?.tournamentId
                                ? AppColors.adminAccent
                                : AppColors.border,
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<AdminTournament>(
                            isExpanded: true,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                            ),
                            value: selected,
                            items: _tournaments
                                .where((t) => t.tournamentId != null)
                                .map(
                                  (t) => DropdownMenuItem(
                                    value: t,
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '${t.name ?? '—'} '
                                            '(${tournamentStatusLabelVi(t.status)} · ${t.racesCount} race)',
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                )
                                .toList(),
                            onChanged: (t) async {
                              if (t == null) return;
                              setState(() => _selectedTournament = t);
                              await _loadRacesFor(t);
                            },
                          ),
                        ),
                      ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      _ErrorBanner(
                        message: _error!,
                        onRetry: _refreshCurrent,
                      ),
                    ],
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            '2. Cuộc đua trong giải',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppColors.heading,
                            ),
                          ),
                        ),
                        FilledButton.icon(
                          onPressed:
                              selected?.tournamentId == null ? null : _openCreate,
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('Tạo race'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.adminAccent,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _searchController,
                      decoration: const InputDecoration(
                        hintText: 'Tên race hoặc ID…',
                        prefixIcon: Icon(Icons.search, size: 20),
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 8),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final f in const [
                            ('ALL', 'Tất cả'),
                            ('SCHEDULED', 'Đã lên lịch'),
                            ('REGISTRATION_OPEN', 'Đang mở ĐK'),
                            ('REGISTRATION_CLOSED', 'Đã đóng ĐK'),
                            ('IN_PROGRESS', 'Đang chạy'),
                            ('PENDING_RESULT', 'Chờ kết quả'),
                            ('PAUSED', 'Tạm dừng'),
                            ('FINISHED', 'Kết thúc'),
                            ('CANCELLED', 'Đã hủy'),
                          ])
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: FilterChip(
                                label: Text(f.$2),
                                selected: _statusFilter == f.$1,
                                onSelected: (_) {
                                  setState(() => _statusFilter = f.$1);
                                },
                                selectedColor: AppColors.adminAccent
                                    .withValues(alpha: 0.2),
                                checkmarkColor: AppColors.adminAccent,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (_loadingRaces)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (selected == null)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Text(
                    'Chọn 1 giải để xem danh sách race.',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                ),
              )
            else if (filteredRaces.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Text(
                    _races.isEmpty
                        ? 'Giải chưa có race nào. Bấm "Tạo race" để thêm.'
                        : 'Không có race phù hợp bộ lọc.',
                    style: const TextStyle(color: AppColors.textMuted),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
                sliver: SliverList.separated(
                  itemCount: filteredRaces.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final r = filteredRaces[i];
                    return _RaceCard(race: r, onTap: () => _openDetail(r));
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _RaceCard extends StatelessWidget {
  const _RaceCard({required this.race, required this.onTap});

  final AdminRace race;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = (race.status ?? '').toUpperCase();
    final color = raceStatusColor(status);
    final bg = raceStatusBg(status);
    final fillPct = (race.fillRate * 100).round();
    final isRegistrationOpen = race.registrationOpen ||
        status == 'REGISTRATION_OPEN';

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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.adminBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.flag,
                      color: AppColors.adminAccent,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          race.name ?? 'Race #${race.raceId}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                            color: AppColors.heading,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '#${race.raceId} · '
                          '${race.entriesCount}/${race.maxEntries} ngựa · '
                          '${race.predictionsCount} bet',
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: bg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      raceStatusLabelVi(status),
                      style: TextStyle(
                        color: color,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.chevron_right, color: AppColors.textMuted),
                ],
              ),
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: race.fillRate,
                  minHeight: 6,
                  backgroundColor: AppColors.adminBg,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    AppColors.adminAccent,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(
                    isRegistrationOpen
                        ? Icons.lock_open
                        : Icons.lock_outline,
                    size: 14,
                    color: isRegistrationOpen
                        ? AppColors.ownerTeal
                        : AppColors.textMuted,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${isRegistrationOpen ? "Đang mở ĐK" : "Đã đóng ĐK"} · $fillPct%',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const Spacer(),
                  if (race.scheduledAt != null)
                    Text(
                      formatRaceDateTime(race.scheduledAt!.toLocal()),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                ],
              ),
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
