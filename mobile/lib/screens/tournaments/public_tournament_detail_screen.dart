import 'package:flutter/material.dart';

import '../../models/public_tournament.dart';
import '../../models/race_summary.dart';
import '../../services/tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';
import '../../utils/tournament_status_labels.dart';
import 'tournament_view_theme.dart';

class PublicTournamentDetailScreen extends StatefulWidget {
  const PublicTournamentDetailScreen({
    super.key,
    required this.tournamentId,
    required this.theme,
    this.onPlaceBet,
  });

  final int tournamentId;
  final TournamentViewTheme theme;

  /// Callback khi khán giả nhấn "Đặt cược" ở 1 race trong giải.
  /// Truyền (raceId, raceName, availableRaces). availableRaces dùng cho dropdown
  /// chọn lại race trong màn đặt cược. Khi null → màn không hiển thị nút đặt cược.
  final void Function(int raceId, String raceName, List<RaceSummary> races)?
      onPlaceBet;

  @override
  State<PublicTournamentDetailScreen> createState() =>
      _PublicTournamentDetailScreenState();
}

class _PublicTournamentDetailScreenState
    extends State<PublicTournamentDetailScreen> {
  final _service = TournamentsService();
  PublicTournament? _tournament;
  List<RaceSummary> _races = [];
  bool _loading = true;
  bool _loadingRaces = true;
  String? _error;
  String? _racesError;

  TournamentViewTheme get _t => widget.theme;

  @override
  void initState() {
    super.initState();
    _load();
    _loadRaces();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final t = await _service.getTournamentById(widget.tournamentId);
      if (!mounted) return;
      setState(() {
        _tournament = t;
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

  Future<void> _loadRaces() async {
    setState(() {
      _loadingRaces = true;
      _racesError = null;
    });
    try {
      final list = await _service.listRacesByTournamentId(widget.tournamentId);
      if (!mounted) return;
      setState(() {
        _races = list;
        _loadingRaces = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _racesError = e.toString().replaceFirst('Exception: ', '');
        _loadingRaces = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = _tournament;
    final status = t?.status ?? '';

    return Scaffold(
      backgroundColor: _t.backgroundColor,
      appBar: AppBar(
        backgroundColor: _t.appBarColor,
        foregroundColor: Colors.white,
        title: const Text('Chi tiết giải đấu'),
      ),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: _t.accentColor))
          : _error != null
              ? _ErrorBody(
                  message: _error!,
                  accent: _t.accentColor,
                  onRetry: _load,
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    await Future.wait([_load(), _loadRaces()]);
                  },
                  color: _t.accentColor,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Image.asset(
                            _t.cardImageAsset,
                            height: 160,
                            fit: BoxFit.cover,
                          ),
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
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      t?.name ?? '—',
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.heading,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '#${t?.tournamentId}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 5,
                                ),
                                decoration: BoxDecoration(
                                  color: tournamentStatusBg(status),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  tournamentStatusLabelVi(status),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: tournamentStatusColor(status),
                                  ),
                                ),
                              ),
                              if (t?.description?.isNotEmpty == true) ...[
                                const SizedBox(height: 14),
                                Text(
                                  t!.description!,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    height: 1.5,
                                    color: AppColors.heading,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),
                              _DetailRow(
                                icon: Icons.calendar_today_outlined,
                                label: 'Bắt đầu',
                                value: formatTournamentDateTime(t?.startAt),
                                iconColor: _t.accentColor,
                              ),
                              _DetailRow(
                                icon: Icons.event_outlined,
                                label: 'Kết thúc',
                                value: formatTournamentDateTime(t?.endAt),
                                iconColor: _t.accentColor,
                              ),
                              _DetailRow(
                                icon: Icons.update,
                                label: 'Cập nhật',
                                value: formatTournamentDateTime(t?.updatedAt),
                                iconColor: _t.accentColor,
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        _RacesSection(
                          loading: _loadingRaces,
                          error: _racesError,
                          races: _races,
                          accent: _t.accentColor,
                          onRetry: _loadRaces,
                          onPlaceBet: widget.onPlaceBet == null
                              ? null
                              : (raceId, raceName) => widget.onPlaceBet!(
                                    raceId,
                                    raceName,
                                    _races,
                                  ),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }
}

class _RacesSection extends StatelessWidget {
  const _RacesSection({
    required this.loading,
    required this.error,
    required this.races,
    required this.accent,
    required this.onRetry,
    this.onPlaceBet,
  });

  final bool loading;
  final String? error;
  final List<RaceSummary> races;
  final Color accent;
  final VoidCallback onRetry;
  final void Function(int raceId, String raceName)? onPlaceBet;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
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
              const Icon(Icons.sports_score_outlined, size: 20, color: AppColors.heading),
              const SizedBox(width: 8),
              const Text(
                'Danh sách chặng đua',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.heading,
                ),
              ),
              const Spacer(),
              if (loading)
                SizedBox(
                  width: 14,
                  height: 14,
                  child: CircularProgressIndicator(strokeWidth: 2, color: accent),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (error != null)
            _ErrorBlock(message: error!, onRetry: onRetry)
          else if (!loading && races.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Giải đấu chưa có chặng đua nào.',
                style: TextStyle(color: AppColors.textMuted, fontSize: 13),
              ),
            )
          else
            ...races.map(
              (r) => _RaceRow(
                race: r,
                accent: accent,
                onPlaceBet: onPlaceBet,
              ),
            ),
        ],
      ),
    );
  }
}

class _RaceRow extends StatelessWidget {
  const _RaceRow({
    required this.race,
    required this.accent,
    this.onPlaceBet,
  });

  final RaceSummary race;
  final Color accent;
  final void Function(int raceId, String raceName)? onPlaceBet;

  @override
  Widget build(BuildContext context) {
    final statusCode = race.status ?? '';
    final bettable = race.isBettable;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      race.name,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.heading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Race #${race.raceId} · ${formatRaceDateTime(_parseDate(race.scheduledAt))}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: raceStatusBg(statusCode),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  raceStatusLabelVi(statusCode),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: raceStatusColor(statusCode),
                  ),
                ),
              ),
            ],
          ),
          if (onPlaceBet != null) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: bettable
                    ? () => onPlaceBet!(race.raceId, race.name)
                    : null,
                icon: const Icon(Icons.casino_outlined, size: 18),
                label: Text(
                  bettable ? 'Đặt cược chặng này' : 'Không mở cược',
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: accent,
                  disabledBackgroundColor: const Color(0xFFCBD5E1),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  DateTime? _parseDate(String? iso) {
    if (iso == null || iso.isEmpty) return null;
    return DateTime.tryParse(iso)?.toLocal();
  }
}

class _ErrorBlock extends StatelessWidget {
  const _ErrorBlock({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.errorBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: AppColors.errorText, fontSize: 13),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.iconColor,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: iconColor),
          const SizedBox(width: 10),
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.heading,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({
    required this.message,
    required this.accent,
    required this.onRetry,
  });

  final String message;
  final Color accent;
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
              style: FilledButton.styleFrom(backgroundColor: accent),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}