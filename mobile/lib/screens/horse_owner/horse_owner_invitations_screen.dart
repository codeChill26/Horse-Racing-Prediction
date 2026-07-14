import 'package:flutter/material.dart';

import '../../models/jockey_invitation.dart';
import '../../models/jockey_profile.dart';
import '../../models/owner_horse.dart';
import '../../models/public_tournament.dart';
import '../../models/race_summary.dart';
import '../../services/horses_service.dart';
import '../../services/invitations_service.dart';
import '../../services/tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/invitation_status_labels.dart';

class HorseOwnerInvitationsScreen extends StatefulWidget {
  const HorseOwnerInvitationsScreen({super.key});

  @override
  State<HorseOwnerInvitationsScreen> createState() => _HorseOwnerInvitationsScreenState();
}

class _HorseOwnerInvitationsScreenState extends State<HorseOwnerInvitationsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      appBar: AppBar(
        backgroundColor: AppColors.ownerDeep,
        foregroundColor: Colors.white,
        title: const Text('Mời kỵ sĩ'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.ownerGold,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Lời mời đã gửi'),
            Tab(text: 'Gửi lời mời mới'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _SentInvitationsTab(),
          _NewInvitationTab(),
        ],
      ),
    );
  }
}

// ─── Tab 1: Outbox ───────────────────────────────────────────────────────────

class _SentInvitationsTab extends StatefulWidget {
  const _SentInvitationsTab();

  @override
  State<_SentInvitationsTab> createState() => _SentInvitationsTabState();
}

class _SentInvitationsTabState extends State<_SentInvitationsTab> {
  final _service = InvitationsService();
  List<JockeyInvitation> _invitations = [];
  String? _statusFilter;
  bool _loading = true;
  String? _error;
  int? _confirmingId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _service.listInvitations(status: _statusFilter);
      if (!mounted) return;
      setState(() {
        _invitations = list;
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

  Future<void> _confirm(JockeyInvitation inv) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Chốt kỵ sĩ?'),
        content: Text(
          'Xác nhận ${inv.jockeyName ?? 'kỵ sĩ'} cho ngựa ${inv.horseName ?? ''} '
          'tại chặng ${inv.raceName ?? ''}?\n\n'
          'Các lời mời kỵ sĩ khác cho cùng ngựa sẽ bị hủy tự động.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Hủy')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.ownerTeal),
            child: const Text('Chốt kỵ sĩ'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    setState(() => _confirmingId = inv.invitationId);
    try {
      await _service.confirmJockey(inv.invitationId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã chốt kỵ sĩ thành công!')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _confirmingId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: [
              _FilterChip(
                label: 'Tất cả',
                selected: _statusFilter == null,
                onTap: () {
                  setState(() => _statusFilter = null);
                  _load();
                },
              ),
              _FilterChip(
                label: 'Đang chờ',
                selected: _statusFilter == 'PENDING',
                onTap: () {
                  setState(() => _statusFilter = 'PENDING');
                  _load();
                },
              ),
              _FilterChip(
                label: 'Đã đồng ý',
                selected: _statusFilter == 'ACCEPTED',
                onTap: () {
                  setState(() => _statusFilter = 'ACCEPTED');
                  _load();
                },
              ),
              _FilterChip(
                label: 'Đã từ chối',
                selected: _statusFilter == 'DECLINED',
                onTap: () {
                  setState(() => _statusFilter = 'DECLINED');
                  _load();
                },
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.ownerTeal))
              : _error != null
                  ? _ErrorPane(message: _error!, onRetry: _load)
                  : _invitations.isEmpty
                      ? _EmptyPane(
                          icon: Icons.mail_outline,
                          title: 'Chưa có lời mời',
                          subtitle: 'Chuyển sang tab "Gửi lời mời mới" để mời kỵ sĩ.',
                        )
                      : RefreshIndicator(
                          onRefresh: _load,
                          color: AppColors.ownerTeal,
                          child: ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(16),
                            itemCount: _invitations.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 10),
                            itemBuilder: (context, i) {
                              final inv = _invitations[i];
                              return _InvitationCard(
                                invitation: inv,
                                confirming: _confirmingId == inv.invitationId,
                                onConfirm: inv.canConfirm ? () => _confirm(inv) : null,
                              );
                            },
                          ),
                        ),
        ),
      ],
    );
  }
}

class _InvitationCard extends StatelessWidget {
  const _InvitationCard({
    required this.invitation,
    required this.confirming,
    this.onConfirm,
  });

  final JockeyInvitation invitation;
  final bool confirming;
  final VoidCallback? onConfirm;

  @override
  Widget build(BuildContext context) {
    final statusColor = invitationStatusColor(invitation.status);

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
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.ownerMuted,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text('🏇', style: TextStyle(fontSize: 20)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      invitation.jockeyName ?? 'Kỵ sĩ #${invitation.jockeyId}',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.heading,
                      ),
                    ),
                    if (invitation.jockeyEmail != null)
                      Text(
                        invitation.jockeyEmail!,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  invitationStatusLabelVi(invitation.status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _InfoRow(icon: Icons.emoji_events_outlined, text: invitation.raceName ?? 'Chặng #${invitation.raceId}'),
          _InfoRow(icon: Icons.pets_outlined, text: invitation.horseName ?? 'Ngựa #${invitation.horseId}'),
          if (invitation.declineReason != null && invitation.declineReason!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Lý do từ chối: ${invitation.declineReason}',
              style: const TextStyle(fontSize: 12, color: AppColors.errorText),
            ),
          ],
          if (onConfirm != null) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: confirming ? null : onConfirm,
                icon: confirming
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.check_circle_outline, size: 18),
                label: Text(confirming ? 'Đang xử lý…' : 'Chốt kỵ sĩ này'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.ownerTeal,
                  foregroundColor: Colors.white,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppColors.textMuted),
          const SizedBox(width: 6),
          Expanded(
            child: Text(text, style: const TextStyle(fontSize: 13, color: AppColors.heading)),
          ),
        ],
      ),
    );
  }
}

// ─── Tab 2: New invitation ───────────────────────────────────────────────────

class _NewInvitationTab extends StatefulWidget {
  const _NewInvitationTab();

  @override
  State<_NewInvitationTab> createState() => _NewInvitationTabState();
}

class _NewInvitationTabState extends State<_NewInvitationTab> {
  final _invitationsService = InvitationsService();
  final _horsesService = HorsesService();
  final _tournamentsService = TournamentsService();
  final _jockeySearchController = TextEditingController();

  List<PublicTournament> _tournaments = [];
  List<RaceSummary> _races = [];
  List<OwnerHorse> _horses = [];
  List<JockeyProfile> _jockeys = [];

  PublicTournament? _selectedTournament;
  RaceSummary? _selectedRace;
  OwnerHorse? _selectedHorse;
  JockeyProfile? _selectedJockey;

  bool _loadingInit = true;
  bool _loadingRaces = false;
  bool _searchingJockeys = false;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadInitial();
  }

  @override
  void dispose() {
    _jockeySearchController.dispose();
    super.dispose();
  }

  Future<void> _loadInitial() async {
    setState(() {
      _loadingInit = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _tournamentsService.listTournaments(),
        _horsesService.listMyHorses(),
        _invitationsService.searchJockeys(),
      ]);
      if (!mounted) return;
      setState(() {
        _tournaments = results[0] as List<PublicTournament>;
        _horses = (results[1] as List<OwnerHorse>).where((h) => h.isApproved).toList();
        _jockeys = results[2] as List<JockeyProfile>;
        _loadingInit = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loadingInit = false;
      });
    }
  }

  Future<void> _onTournamentChanged(PublicTournament? t) async {
    setState(() {
      _selectedTournament = t;
      _selectedRace = null;
      _races = [];
      _loadingRaces = t != null;
    });
    if (t?.tournamentId == null) return;
    try {
      final races = await _tournamentsService.listRacesByTournamentId(t!.tournamentId!);
      if (!mounted) return;
      setState(() {
        _races = races;
        _selectedRace = races.isEmpty
            ? null
            : races.firstWhere((r) => r.registrationOpen, orElse: () => races.first);
        _loadingRaces = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingRaces = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _searchJockeys() async {
    setState(() => _searchingJockeys = true);
    try {
      final list = await _invitationsService.searchJockeys(
        name: _jockeySearchController.text,
      );
      if (!mounted) return;
      setState(() {
        _jockeys = list;
        _searchingJockeys = false;
        if (_selectedJockey != null &&
            !list.any((j) => j.userId == _selectedJockey!.userId)) {
          _selectedJockey = null;
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _searchingJockeys = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  Future<void> _onRaceChanged(RaceSummary? r) async {
    setState(() {
      _selectedRace = r;
      if (r != null && r.tournamentId != _selectedTournament?.tournamentId) {
        _selectedTournament = null;
        _races = [];
        _loadingRaces = false;
      }
    });
  }

  Future<void> _send() async {
    if (_selectedRace == null || _selectedHorse == null || _selectedJockey == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn đủ giải, chặng đua, ngựa và kỵ sĩ.')),
      );
      return;
    }
    final selectedTournamentId = _selectedTournament?.tournamentId;
    if (selectedTournamentId == null ||
        _selectedRace!.tournamentId != selectedTournamentId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chặng đua không thuộc giải đấu đã chọn.')),
      );
      return;
    }
    if (!_selectedRace!.registrationOpen) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chặng đua này đã đóng đăng ký.')),
      );
      return;
    }

    setState(() => _sending = true);
    try {
      await _invitationsService.sendInvitation(
        raceId: _selectedRace!.raceId,
        horseId: _selectedHorse!.horseId,
        jockeyId: _selectedJockey!.userId,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã gửi lời mời! Chuyển sang tab "Lời mời đã gửi" để theo dõi.'),
        ),
      );
      setState(() {
        _selectedJockey = null;
        _sending = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _sending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingInit) {
      return const Center(child: CircularProgressIndicator(color: AppColors.ownerTeal));
    }
    if (_error != null && _tournaments.isEmpty && _horses.isEmpty) {
      return _ErrorPane(message: _error!, onRetry: _loadInitial);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _StepHeader(
            step: 1,
            title: 'Chọn giải & chặng đua',
            subtitle: 'Chỉ chặng đang mở đăng ký mới gửi được lời mời',
          ),
          const SizedBox(height: 10),
          _SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<PublicTournament>(
                  initialValue: _selectedTournament,
                  decoration: const InputDecoration(
                    labelText: 'Giải đấu',
                    border: OutlineInputBorder(),
                  ),
                  hint: const Text('Chọn giải đấu'),
                  items: _tournaments
                      .map(
                        (t) => DropdownMenuItem(
                          value: t,
                          child: Text(t.name ?? 'Giải #${t.tournamentId}'),
                        ),
                      )
                      .toList(),
                  onChanged: _onTournamentChanged,
                ),
                const SizedBox(height: 12),
                if (_loadingRaces)
                  const Center(child: Padding(
                    padding: EdgeInsets.all(8),
                    child: CircularProgressIndicator(color: AppColors.ownerTeal),
                  ))
                else if (_selectedTournament != null && _races.isEmpty)
                  const Text(
                    'Giải này chưa có chặng đua.',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                  )
                else if (_races.isNotEmpty)
                  DropdownButtonFormField<RaceSummary>(
                    initialValue: _selectedRace,
                    decoration: const InputDecoration(
                      labelText: 'Chặng đua',
                      border: OutlineInputBorder(),
                    ),
                    hint: const Text('Chọn chặng đua'),
                    items: _races
                        .map(
                          (r) => DropdownMenuItem(
                            value: r,
                            child: Row(
                              children: [
                                Expanded(child: Text(r.name)),
                                if (!r.registrationOpen)
                                  const Text(
                                    ' · Đóng ĐK',
                                    style: TextStyle(fontSize: 11, color: AppColors.errorText),
                                  ),
                              ],
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: _onRaceChanged,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const _StepHeader(
            step: 2,
            title: 'Chọn ngựa của bạn',
            subtitle: 'Chỉ ngựa đã được duyệt (APPROVED)',
          ),
          const SizedBox(height: 10),
          if (_horses.isEmpty)
            const _SectionCard(
              child: Text(
                'Bạn chưa có ngựa được duyệt. Hãy đăng ký ngựa và chờ admin phê duyệt.',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted),
              ),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _horses.map((horse) {
                final selected = _selectedHorse?.horseId == horse.horseId;
                return ChoiceChip(
                  label: Text(horse.name),
                  selected: selected,
                  selectedColor: AppColors.ownerTeal.withValues(alpha: 0.2),
                  onSelected: (_) => setState(() => _selectedHorse = horse),
                );
              }).toList(),
            ),
          const SizedBox(height: 20),
          const _StepHeader(
            step: 3,
            title: 'Tìm & chọn kỵ sĩ',
            subtitle: 'Chỉ hiện kỵ sĩ đã hoàn thiện hồ sơ',
          ),
          const SizedBox(height: 10),
          _SectionCard(
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _jockeySearchController,
                        decoration: const InputDecoration(
                          labelText: 'Tìm theo tên',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.search),
                        ),
                        onSubmitted: (_) => _searchJockeys(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: _searchingJockeys ? null : _searchJockeys,
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.ownerPrimary,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      ),
                      child: _searchingJockeys
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.search),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_jockeys.isEmpty)
                  const Text(
                    'Không tìm thấy kỵ sĩ phù hợp.',
                    style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                  )
                else
                  ..._jockeys.map((j) {
                    final selected = _selectedJockey?.userId == j.userId;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: AppColors.ownerMuted,
                        child: Text(
                          j.fullName.isNotEmpty ? j.fullName[0].toUpperCase() : '?',
                          style: const TextStyle(
                            color: AppColors.ownerPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      title: Text(
                        j.fullName,
                        style: TextStyle(
                          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                        ),
                      ),
                      subtitle: Text(
                        [
                          if (j.licenseNumber != null) 'GP: ${j.licenseNumber}',
                          if (j.weight != null) '${j.weight} kg',
                        ].join(' · '),
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: selected
                          ? const Icon(Icons.check_circle, color: AppColors.ownerTeal)
                          : const Icon(Icons.radio_button_unchecked, color: AppColors.border),
                      onTap: () => setState(() => _selectedJockey = j),
                    );
                  }),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _sending ? null : _send,
              icon: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.send_rounded),
              label: Text(_sending ? 'Đang gửi…' : 'Gửi lời mời'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.ownerTeal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ─── Shared widgets ──────────────────────────────────────────────────────────

class _StepHeader extends StatelessWidget {
  const _StepHeader({
    required this.step,
    required this.title,
    required this.subtitle,
  });

  final int step;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: AppColors.ownerTeal,
          child: Text(
            '$step',
            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
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
              Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
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
        selectedColor: AppColors.ownerTeal.withValues(alpha: 0.2),
        checkmarkColor: AppColors.ownerTeal,
      ),
    );
  }
}

class _ErrorPane extends StatelessWidget {
  const _ErrorPane({required this.message, required this.onRetry});

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
            const Icon(Icons.error_outline, color: AppColors.errorText, size: 40),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.errorText)),
            const SizedBox(height: 12),
            TextButton(onPressed: onRetry, child: const Text('Thử lại')),
          ],
        ),
      ),
    );
  }
}

class _EmptyPane extends StatelessWidget {
  const _EmptyPane({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.heading),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
