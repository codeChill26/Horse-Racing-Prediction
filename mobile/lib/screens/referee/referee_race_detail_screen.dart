import 'package:flutter/material.dart';

import '../../models/referee_race.dart';
import '../../services/referee_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';
import 'referee_submit_result_sheet.dart';

class RefereeRaceDetailScreen extends StatefulWidget {
  const RefereeRaceDetailScreen({super.key, required this.raceId});

  final int raceId;

  @override
  State<RefereeRaceDetailScreen> createState() => _RefereeRaceDetailScreenState();
}

class _RefereeRaceDetailScreenState extends State<RefereeRaceDetailScreen> {
  final _service = RefereeService();
  RefereeRaceDetail? _race;
  bool _loading = true;
  bool _busy = false;
  String? _error;

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
      final race = await _service.getRaceDetail(widget.raceId);
      if (!mounted) return;
      setState(() {
        _race = race;
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

  Future<void> _onStart() async {
    if (_race == null) return;
    setState(() => _busy = true);
    try {
      final data = await _service.startRace(widget.raceId);
      if (!mounted) return;
      final msg = data['message'] ?? 'Đã bắt đầu trận đấu.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _onSubmit() async {
    if (_race == null) return;
    final result = await showRefereeSubmitResultSheet(
      context,
      raceId: widget.raceId,
      horses: _race!.legs.expand((e) => e.horses).toList(),
    );
    if (result == null) return;
    setState(() => _busy = true);
    try {
      final data = await _service.submitResult(widget.raceId, result);
      if (!mounted) return;
      final msg = data['message'] ?? 'Đã nộp kết quả.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = _race;
    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: Text(r?.name ?? 'Chi tiết trận đấu'),
        actions: [
          IconButton(
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _buildBody(r),
    );
  }

  Widget _buildBody(RefereeRaceDetail? race) {
    if (_loading || race == null) {
      return const Center(child: CircularProgressIndicator(color: AppColors.adminAccent));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh),
                label: const Text('Thử lại'),
                style: FilledButton.styleFrom(backgroundColor: AppColors.adminAccent),
              ),
            ],
          ),
        ),
      );
    }

    final status = (race.status ?? '').toUpperCase();
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      children: [
        _InfoCard(
          title: race.name ?? 'Race #${race.raceId}',
          subtitle: '${race.tournamentName ?? "Giải đấu"} · ${raceStatusLabelVi(race.status)}',
          children: [
            _InfoRow('Vai trò', race.assignedRole ?? 'Trọng tài'),
            _InfoRow('Đối tác', race.otherRefereeName ?? '—'),
            _InfoRow('Trạng thái', raceStatusLabelVi(race.status)),
            _InfoRow('Đăng ký', race.registrationOpen == true ? 'Đang mở' : 'Đã đóng'),
            if (race.scheduledStartTime != null)
              _InfoRow('Lịch chạy', '${race.scheduledStartTime!.day.toString().padLeft(2, "0")}/${race.scheduledStartTime!.month.toString().padLeft(2, "0")}/${race.scheduledStartTime!.year} ${race.scheduledStartTime!.hour.toString().padLeft(2, "0")}:${race.scheduledStartTime!.minute.toString().padLeft(2, "0")}'),
            _InfoRow('Đã nộp', race.hasSubmittedMyResult ? 'Có' : 'Chưa'),
          ],
        ),
        const SizedBox(height: 16),
        if (status == 'SCHEDULED')
          FilledButton.icon(
            onPressed: _busy ? null : _onStart,
            icon: const Icon(Icons.play_arrow),
            label: Text(_busy ? 'Đang xử lý…' : 'Bắt đầu trận đấu'),
            style: FilledButton.styleFrom(backgroundColor: AppColors.adminAccent),
          ),
        if (status == 'IN_PROGRESS')
          FilledButton.icon(
            onPressed: _busy ? null : _onSubmit,
            icon: const Icon(Icons.upload_file),
            label: Text(_busy ? 'Đang xử lý…' : 'Nộp kết quả'),
            style: FilledButton.styleFrom(backgroundColor: AppColors.adminAccent),
          ),
        const SizedBox(height: 16),
        const Text(
          'Danh sách ngựa',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
        ),
        const SizedBox(height: 10),
        ...race.legs.expand((leg) => leg.horses).toList().map((horse) {
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.adminAccent.withValues(alpha: 0.12),
                  child: Text('#${horse.gateNumber ?? "?"}'),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(horse.horseName ?? 'Ngựa #${horse.horseId ?? "?"}', style: const TextStyle(fontWeight: FontWeight.w600)),
                      if (horse.jockeyName != null && horse.jockeyName!.isNotEmpty)
                        Text(horse.jockeyName!, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ],
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.subtitle, required this.children});

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
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
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 110, child: Text(label, style: const TextStyle(color: AppColors.textMuted))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}
