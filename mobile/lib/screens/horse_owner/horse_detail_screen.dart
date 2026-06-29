import 'package:flutter/material.dart';

import '../../models/owner_horse.dart';
import '../../services/horses_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/horse_status_labels.dart';

class HorseDetailScreen extends StatefulWidget {
  const HorseDetailScreen({
    super.key,
    required this.horseId,
    this.initialHorse,
  });

  final int horseId;
  final OwnerHorse? initialHorse;

  @override
  State<HorseDetailScreen> createState() => _HorseDetailScreenState();
}

class _HorseDetailScreenState extends State<HorseDetailScreen> {
  final _service = HorsesService();
  OwnerHorse? _horse;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _horse = widget.initialHorse;
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final horse = await _service.getHorseById(widget.horseId);
      if (!mounted) return;
      setState(() {
        _horse = horse;
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
    final horse = _horse;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FA),
      appBar: AppBar(
        backgroundColor: AppColors.ownerDeep,
        foregroundColor: Colors.white,
        title: Text(horse?.name ?? 'Chi tiết ngựa'),
      ),
      body: _loading && horse == null
          ? const Center(child: CircularProgressIndicator(color: AppColors.ownerTeal))
          : _error != null && horse == null
              ? _ErrorBody(message: _error!, onRetry: _load)
              : horse == null
                  ? const Center(child: Text('Không tìm thấy ngựa'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: AppColors.ownerTeal,
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                        children: [
                          _HeroCard(horse: horse),
                          const SizedBox(height: 16),
                          _InfoSection(
                            title: 'Thông tin cơ bản',
                            children: [
                              _InfoRow(label: 'Tên', value: horse.name),
                              _InfoRow(label: 'Giống', value: horse.breed ?? '—'),
                              _InfoRow(label: 'Giới tính', value: horse.sex ?? '—'),
                              _InfoRow(label: 'Màu lông', value: horse.color ?? '—'),
                              _InfoRow(
                                label: 'Ngày sinh',
                                value: horse.dateOfBirth != null
                                    ? _formatDate(horse.dateOfBirth!)
                                    : '—',
                              ),
                              if (horse.ageYears != null)
                                _InfoRow(label: 'Tuổi', value: '${horse.ageYears} tuổi'),
                              if (horse.status != null)
                                _InfoRow(
                                  label: 'Trạng thái',
                                  value: horseStatusLabelVi(horse.status),
                                  valueColor: horseStatusColor(horse.status),
                                ),
                            ],
                          ),
                          if (horse.careerMetrics != null) ...[
                            const SizedBox(height: 16),
                            _CareerSection(metrics: horse.careerMetrics!),
                          ],
                        ],
                      ),
                    ),
    );
  }

  String _formatDate(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year}';
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.horse});

  final OwnerHorse horse;

  @override
  Widget build(BuildContext context) {
    final metrics = horse.careerMetrics;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.ownerDeep, AppColors.ownerPrimary],
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
                child: const Icon(Icons.pets, color: AppColors.ownerGold, size: 32),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      horse.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      horse.subtitle,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (metrics != null) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                _StatPill(label: 'Số trận', value: '${metrics.totalStarts}'),
                const SizedBox(width: 10),
                _StatPill(label: 'Thắng', value: '${metrics.wins}'),
                const SizedBox(width: 10),
                _StatPill(label: 'Tỷ lệ thắng', value: '${metrics.winRate.toStringAsFixed(0)}%'),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  const _StatPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(
                color: AppColors.ownerGold,
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 11),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  const _InfoSection({required this.title, required this.children});

  final String title;
  final List<Widget> children;

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
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 14)),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: valueColor ?? AppColors.heading,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CareerSection extends StatelessWidget {
  const _CareerSection({required this.metrics});

  final HorseCareerMetrics metrics;

  @override
  Widget build(BuildContext context) {
    return _InfoSection(
      title: 'Thành tích thi đấu',
      children: [
        _InfoRow(label: 'Tổng số trận', value: '${metrics.totalStarts}'),
        _InfoRow(label: 'Số trận thắng', value: '${metrics.wins}'),
        _InfoRow(label: 'Tỷ lệ thắng', value: '${metrics.winRate.toStringAsFixed(1)}%'),
        if (metrics.avgFinishPosition != null)
          _InfoRow(
            label: 'Vị trí TB',
            value: metrics.avgFinishPosition!.toStringAsFixed(1),
          ),
        if (metrics.recentFormText != null && metrics.recentFormText!.isNotEmpty)
          _InfoRow(label: 'Form gần đây', value: metrics.recentFormText!),
        if (metrics.recentForm.isNotEmpty) ...[
          const SizedBox(height: 8),
          const Text(
            'Các chặng gần nhất',
            style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.heading),
          ),
          const SizedBox(height: 8),
          ...metrics.recentForm.map((r) => _RecentResultTile(result: r)),
        ],
      ],
    );
  }
}

class _RecentResultTile extends StatelessWidget {
  const _RecentResultTile({required this.result});

  final HorseRecentResult result;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.ownerMuted,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.ownerTeal.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              '#${result.finishPosition}',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                color: AppColors.ownerTeal,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  result.raceName ?? 'Chặng #${result.raceId}',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                if (result.tournamentName != null)
                  Text(
                    result.tournamentName!,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  const _ErrorBody({required this.message, required this.onRetry});

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
            const Icon(Icons.error_outline, color: AppColors.errorText, size: 48),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: onRetry,
              style: FilledButton.styleFrom(backgroundColor: AppColors.ownerTeal),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}
