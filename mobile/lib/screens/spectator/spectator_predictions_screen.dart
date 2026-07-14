import 'package:flutter/material.dart';

import '../../models/prediction.dart';
import '../../services/spectator_api.dart';
import '../../theme/app_theme.dart';
import '../../utils/format_utils.dart';

class SpectatorPredictionsScreen extends StatefulWidget {
  const SpectatorPredictionsScreen({
    super.key,
    required this.api,
    required this.onOpenPlaceBet,
  });

  final SpectatorApi api;

  /// Mở màn hình đặt cược. Truyền raceId nếu đặt cho race cụ thể.
  final ValueChanged<int?> onOpenPlaceBet;

  @override
  State<SpectatorPredictionsScreen> createState() => _SpectatorPredictionsScreenState();
}

class _SpectatorPredictionsScreenState extends State<SpectatorPredictionsScreen> {
  List<Prediction> _items = const [];
  bool _loading = true;
  String? _error;
  int? _cancellingId;

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
      final list = await widget.api.listMyPredictions();
      if (!mounted) return;
      setState(() {
        _items = list;
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

  Future<void> _onCancel(Prediction item) async {
    final id = item.predictionId;
    if (id == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hủy cược?'),
        content: Text(
          'Bạn sẽ được hoàn lại ${formatPointsVi(item.betAmount)} điểm về ví. Tiếp tục?',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Không')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Hủy cược', style: TextStyle(color: AppColors.errorText)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _cancellingId = id);
    try {
      await widget.api.cancelPrediction(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã hủy cược, điểm đã hoàn về ví.')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _cancellingId = null);
    }
  }

  Future<void> _openDetail(Prediction item) async {
    final id = item.predictionId;
    if (id == null) return;

    try {
      final detail = await widget.api.getPredictionById(id);
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => _PredictionDetailSheet(prediction: detail),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F5),
      appBar: AppBar(
        title: const Text('Lịch sử cược'),
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        onPressed: () => widget.onOpenPlaceBet(null),
        icon: const Icon(Icons.add),
        label: const Text('Đặt cược'),
      ),
      body: RefreshIndicator(
        color: AppColors.green,
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 240),
          Center(child: CircularProgressIndicator(color: AppColors.green)),
        ],
      );
    }
    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: 200, child: _ErrorState(message: _error!, onRetry: _load)),
        ],
      );
    }
    if (_items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 140),
          _EmptyState(onPlaceBet: () => widget.onOpenPlaceBet(null)),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: _items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = _items[index];
        return _PredictionTile(
          prediction: item,
          cancelling: _cancellingId == item.predictionId,
          onTap: () => _openDetail(item),
          onCancel: () => _onCancel(item),
        );
      },
    );
  }
}

class _PredictionTile extends StatelessWidget {
  const _PredictionTile({
    required this.prediction,
    required this.cancelling,
    required this.onTap,
    required this.onCancel,
  });

  final Prediction prediction;
  final bool cancelling;
  final VoidCallback onTap;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final status = prediction.status ?? 'PENDING';
    final statusInfo = _statusInfo(status);
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
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
                Expanded(
                  child: Text(
                    prediction.race?.name ?? 'Race #${prediction.raceId ?? '?'}',
                    style: const TextStyle(
                      color: AppColors.heading,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                _StatusChip(label: statusInfo.label, color: statusInfo.color, bg: statusInfo.bg),
              ],
            ),
            const SizedBox(height: 8),
            Text(prediction.describeSelections(),
                style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            const SizedBox(height: 10),
            Row(
              children: [
                _Pill(
                  icon: Icons.payments_outlined,
                  text: '${formatPointsVi(prediction.betAmount)} đ',
                ),
                if (prediction.lockedOdds != null) ...[
                  const SizedBox(width: 8),
                  _Pill(
                    icon: Icons.trending_up_outlined,
                    text: 'Odds ${prediction.lockedOdds!.toStringAsFixed(2)}',
                  ),
                ],
                const Spacer(),
                Text(formatDateTimeVi(prediction.createdAt),
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
            if (prediction.canCancel) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: cancelling
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          color: AppColors.errorText,
                          strokeWidth: 2,
                        ),
                      )
                    : OutlinedButton.icon(
                        onPressed: onCancel,
                        icon: const Icon(Icons.cancel_outlined, size: 18),
                        label: const Text('Hủy cược'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.errorText,
                          side: const BorderSide(color: AppColors.errorBorder),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  _StatusInfo _statusInfo(String code) {
    switch (code) {
      case 'WON':
        return _StatusInfo('Thắng', AppColors.green, const Color(0xFFD1FAE5));
      case 'LOST':
        return _StatusInfo('Thua', AppColors.errorText, AppColors.errorBg);
      case 'REFUNDED':
      case 'CANCELLED':
        return _StatusInfo('Đã hủy', AppColors.textMuted, const Color(0xFFE2E8F0));
      case 'PENDING':
      default:
        return _StatusInfo('Đang chờ', AppColors.gold, const Color(0xFFFEF9C3));
    }
  }
}

class _StatusInfo {
  const _StatusInfo(this.label, this.color, this.bg);
  final String label;
  final Color color;
  final Color bg;
}

class _Pill extends StatelessWidget {
  const _Pill({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.textMuted),
          const SizedBox(width: 4),
          Text(text, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color, required this.bg});

  final String label;
  final Color color;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _PredictionDetailSheet extends StatelessWidget {
  const _PredictionDetailSheet({required this.prediction});

  final Prediction prediction;

  @override
  Widget build(BuildContext context) {
    final p = prediction;
    return DraggableScrollableSheet(
      initialChildSize: 0.62,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
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
              const SizedBox(height: 16),
              Text(
                p.race?.name ?? 'Race #${p.raceId ?? '?'}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.heading,
                ),
              ),
              const SizedBox(height: 4),
              Text('Trạng thái: ${p.status ?? '—'}',
                  style: const TextStyle(color: AppColors.textMuted)),
              const SizedBox(height: 20),
              _kv('Loại cược', p.betType ?? '—'),
              _kv('Số tiền', '${formatPointsVi(p.betAmount)} điểm'),
              _kv('Odds đã khóa', p.lockedOdds?.toStringAsFixed(2) ?? '—'),
              _kv(
                'Ngựa #1',
                p.pick1?.horseName ?? 'Entry #${p.entryId1 ?? '?'}',
              ),
              if (p.pick2 != null) _kv('Ngựa #2', p.pick2?.horseName ?? 'Entry #${p.entryId2 ?? '?'}'),
              _kv('Ngày đặt', formatDateTimeVi(p.createdAt)),
              const SizedBox(height: 24),
              OutlinedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Đóng'),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _kv(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 130,
            child: Text(label, style: const TextStyle(color: AppColors.textMuted)),
          ),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(color: AppColors.heading, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.onPlaceBet});

  final VoidCallback onPlaceBet;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          const Icon(Icons.sports_score_outlined, color: AppColors.textMuted, size: 60),
          const SizedBox(height: 12),
          const Text(
            'Bạn chưa đặt cược nào',
            style: TextStyle(color: AppColors.heading, fontSize: 16),
          ),
          const SizedBox(height: 4),
          const Text(
            'Đặt cược cho race sắp tới để có lịch sử ở đây.',
            style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 18),
          ElevatedButton.icon(
            onPressed: onPlaceBet,
            icon: const Icon(Icons.add),
            label: const Text('Đặt cược ngay'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.green,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.cloud_off, color: AppColors.textMuted, size: 56),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.heading)),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử lại'),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.green),
          ),
        ],
      ),
    );
  }
}
