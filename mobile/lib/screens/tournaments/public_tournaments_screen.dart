import 'package:flutter/material.dart';

import '../../models/public_tournament.dart';
import '../../services/tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/tournament_status_labels.dart';
import 'public_tournament_detail_screen.dart';
import 'tournament_view_theme.dart';

/// GET /api/tournaments — dùng chung cho Chủ ngựa, Kỵ sĩ, Khán giả.
class PublicTournamentsScreen extends StatefulWidget {
  const PublicTournamentsScreen({
    super.key,
    required this.theme,
    this.onOpenDetail,
  });

  final TournamentViewTheme theme;

  /// Callback tuỳ chọn khi user bấm vào 1 giải đấu. Nếu null → dùng
  /// hành vi cũ (mở `PublicTournamentDetailScreen` mặc định).
  final void Function(PublicTournament tournament)? onOpenDetail;

  @override
  State<PublicTournamentsScreen> createState() => _PublicTournamentsScreenState();
}

class _PublicTournamentsScreenState extends State<PublicTournamentsScreen> {
  final _service = TournamentsService();
  List<PublicTournament> _tournaments = [];
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
      final list = await _service.listTournaments();
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

  void _openDetail(PublicTournament t) {
    if (widget.onOpenDetail != null) {
      widget.onOpenDetail!(t);
      return;
    }
    final id = t.tournamentId;
    if (id == null) return;
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicTournamentDetailScreen(
          tournamentId: id,
          theme: _t,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _t.backgroundColor,
      body: RefreshIndicator(
        onRefresh: _load,
        color: _t.accentColor,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverAppBar(
              expandedHeight: 180,
              pinned: true,
              backgroundColor: _t.appBarColor,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: const EdgeInsets.only(left: 16, bottom: 14),
                title: const Text(
                  'Giải đấu',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(_t.headerImageAsset, fit: BoxFit.cover),
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [_t.headerGradientTop, _t.headerGradientBottom],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (_error != null)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: _ErrorBanner(message: _error!, onRetry: _load),
                ),
              ),
            if (_loading)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator(color: _t.accentColor)),
              )
            else if (_tournaments.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'Chưa có giải đấu công khai.\n(OPEN, ONGOING, FINISHED)',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final t = _tournaments[index];
                      return _TournamentListCard(
                        tournament: t,
                        onTap: () => _openDetail(t),
                      );
                    },
                    childCount: _tournaments.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _TournamentListCard extends StatelessWidget {
  const _TournamentListCard({required this.tournament, required this.onTap});

  final PublicTournament tournament;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = tournament.status ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        tournament.name ?? '—',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.heading,
                        ),
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: AppColors.textMuted),
                  ],
                ),
                if (tournament.description?.isNotEmpty == true) ...[
                  const SizedBox(height: 6),
                  Text(
                    tournament.description!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ],
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
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
                    Text(
                      formatTournamentDateTime(tournament.startAt),
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ],
            ),
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
