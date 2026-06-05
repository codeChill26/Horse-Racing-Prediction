import 'package:flutter/material.dart';

import '../models/public_tournament.dart';
import '../screens/tournaments/public_tournament_detail_screen.dart';
import '../screens/tournaments/tournament_view_theme.dart';
import '../services/tournaments_service.dart';
import '../theme/app_theme.dart';
import '../utils/tournament_status_labels.dart';

/// Khối giải đấu trên trang chủ — tải GET /api/tournaments.
class TournamentsHomeSection extends StatefulWidget {
  const TournamentsHomeSection({
    super.key,
    required this.theme,
    required this.onViewAll,
    this.loading = false,
    this.onCountLoaded,
  });

  final TournamentViewTheme theme;
  final VoidCallback onViewAll;
  final bool loading;
  final void Function(int count)? onCountLoaded;

  @override
  State<TournamentsHomeSection> createState() => TournamentsHomeSectionState();
}

class TournamentsHomeSectionState extends State<TournamentsHomeSection> {
  final _service = TournamentsService();
  PublicTournament? _featured;
  int _count = 0;
  bool _loadingTournaments = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    loadTournaments();
  }

  Future<void> loadTournaments() async {
    setState(() {
      _loadingTournaments = true;
      _error = null;
    });
    try {
      final list = await _service.listTournaments();
      if (!mounted) return;
      PublicTournament? featured;
      for (final t in list) {
        if (t.status == 'OPEN') {
          featured = t;
          break;
        }
      }
      featured ??= list.isNotEmpty ? list.first : null;
      setState(() {
        _featured = featured;
        _count = list.length;
        _loadingTournaments = false;
      });
      widget.onCountLoaded?.call(list.length);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loadingTournaments = false;
      });
    }
  }

  int get tournamentCount => _count;

  void _openDetail() {
    final id = _featured?.tournamentId;
    if (id == null) {
      widget.onViewAll();
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicTournamentDetailScreen(
          tournamentId: id,
          theme: widget.theme,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.theme;
    final busy = widget.loading || _loadingTournaments;

    if (_error != null) {
      return _TournamentsError(message: _error!, onRetry: loadTournaments);
    }

    if (busy) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    if (_featured == null) {
      return _EmptyCard(onBrowse: widget.onViewAll, accent: t.accentColor);
    }

    final featured = _featured!;
    final status = featured.status ?? '';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(
          title: 'Giải đấu',
          subtitle: 'Danh sách công khai — OPEN, ONGOING, FINISHED',
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: t.appBarColor.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: _openDetail,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Stack(
                    children: [
                      Image.asset(
                        t.cardImageAsset,
                        height: 120,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                      Container(
                        height: 120,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              t.appBarColor.withValues(alpha: 0.75),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 12,
                        bottom: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: t.badgeColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Giải đấu nổi bật · $_count giải',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: t.badgeTextColor,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          featured.name ?? '—',
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: AppColors.heading,
                          ),
                        ),
                        if (featured.description?.isNotEmpty == true) ...[
                          const SizedBox(height: 8),
                          Text(
                            featured.description!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Text(
                          '${formatTournamentDateTime(featured.startAt)} → ${formatTournamentDateTime(featured.endAt)}',
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: tournamentStatusBg(status),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                tournamentStatusLabelVi(status),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: tournamentStatusColor(status),
                                ),
                              ),
                            ),
                            const Spacer(),
                            TextButton(
                              onPressed: widget.onViewAll,
                              child: const Text('Tất cả'),
                            ),
                            FilledButton(
                              onPressed: _openDetail,
                              style: FilledButton.styleFrom(
                                backgroundColor: t.primaryButtonColor,
                              ),
                              child: const Text('Chi tiết'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.heading,
          ),
        ),
        const SizedBox(height: 2),
        Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
      ],
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({required this.onBrowse, required this.accent});

  final VoidCallback onBrowse;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionHeader(
          title: 'Giải đấu',
          subtitle: 'Chưa có giải công khai trên hệ thống',
        ),
        const SizedBox(height: 12),
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
                'Chưa có giải đấu',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                'Chỉ hiển thị giải OPEN, ONGOING hoặc FINISHED.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: onBrowse,
                style: FilledButton.styleFrom(backgroundColor: accent),
                child: const Text('Xem danh sách giải'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TournamentsError extends StatelessWidget {
  const _TournamentsError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
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
          TextButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
}
