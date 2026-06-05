import 'package:flutter/material.dart';

import '../../models/public_tournament.dart';
import '../../services/tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/tournament_status_labels.dart';
import 'tournament_view_theme.dart';

class PublicTournamentDetailScreen extends StatefulWidget {
  const PublicTournamentDetailScreen({
    super.key,
    required this.tournamentId,
    required this.theme,
  });

  final int tournamentId;
  final TournamentViewTheme theme;

  @override
  State<PublicTournamentDetailScreen> createState() => _PublicTournamentDetailScreenState();
}

class _PublicTournamentDetailScreenState extends State<PublicTournamentDetailScreen> {
  final _service = TournamentsService();
  PublicTournament? _tournament;
  bool _loading = true;
  String? _error;

  TournamentViewTheme get _t => widget.theme;

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
              ? _ErrorBody(message: _error!, accent: _t.accentColor, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
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
                      ],
                    ),
                  ),
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
