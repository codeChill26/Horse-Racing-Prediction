import 'package:flutter/material.dart';

import '../../models/owner_horse.dart';
import '../../services/horses_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/horse_status_labels.dart';
import 'horse_detail_screen.dart';

class HorseOwnerHorsesScreen extends StatefulWidget {
  const HorseOwnerHorsesScreen({super.key});

  @override
  State<HorseOwnerHorsesScreen> createState() => _HorseOwnerHorsesScreenState();
}

class _HorseOwnerHorsesScreenState extends State<HorseOwnerHorsesScreen>
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
        title: const Text('Thông tin ngựa'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.ownerGold,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Ngựa công khai'),
            Tab(text: 'Ngựa của tôi'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: const [
          _PublicHorsesTab(),
          _MyHorsesTab(),
        ],
      ),
    );
  }
}

class _PublicHorsesTab extends StatefulWidget {
  const _PublicHorsesTab();

  @override
  State<_PublicHorsesTab> createState() => _PublicHorsesTabState();
}

class _PublicHorsesTabState extends State<_PublicHorsesTab> {
  final _service = HorsesService();
  List<OwnerHorse> _horses = [];
  bool _loading = true;
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
      final list = await _service.listApprovedHorses();
      if (!mounted) return;
      setState(() {
        _horses = list;
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

  void _openDetail(OwnerHorse horse) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => HorseDetailScreen(
          horseId: horse.horseId,
          initialHorse: horse,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _HorseListBody(
      loading: _loading,
      error: _error,
      horses: _horses,
      emptyMessage: 'Chưa có ngựa nào được duyệt công khai.',
      showStatus: false,
      onRefresh: _load,
      onTap: _openDetail,
    );
  }
}

class _MyHorsesTab extends StatefulWidget {
  const _MyHorsesTab();

  @override
  State<_MyHorsesTab> createState() => _MyHorsesTabState();
}

class _MyHorsesTabState extends State<_MyHorsesTab> {
  final _service = HorsesService();
  List<OwnerHorse> _horses = [];
  bool _loading = true;
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
      final list = await _service.listMyHorses();
      if (!mounted) return;
      setState(() {
        _horses = list;
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

  void _openDetail(OwnerHorse horse) {
    if (horse.isApproved) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => HorseDetailScreen(
            horseId: horse.horseId,
            initialHorse: horse,
          ),
        ),
      );
      return;
    }

    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => _MyHorsePreviewSheet(horse: horse),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _HorseListBody(
      loading: _loading,
      error: _error,
      horses: _horses,
      emptyMessage: 'Bạn chưa đăng ký ngựa nào.\nHãy thêm ngựa qua web hoặc liên hệ admin.',
      showStatus: true,
      onRefresh: _load,
      onTap: _openDetail,
    );
  }
}

class _HorseListBody extends StatelessWidget {
  const _HorseListBody({
    required this.loading,
    required this.error,
    required this.horses,
    required this.emptyMessage,
    required this.showStatus,
    required this.onRefresh,
    required this.onTap,
  });

  final bool loading;
  final String? error;
  final List<OwnerHorse> horses;
  final String emptyMessage;
  final bool showStatus;
  final Future<void> Function() onRefresh;
  final void Function(OwnerHorse horse) onTap;

  @override
  Widget build(BuildContext context) {
    if (loading && horses.isEmpty) {
      return const Center(child: CircularProgressIndicator(color: AppColors.ownerTeal));
    }

    if (error != null && horses.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: onRefresh,
                style: FilledButton.styleFrom(backgroundColor: AppColors.ownerTeal),
                child: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      );
    }

    if (horses.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        color: AppColors.ownerTeal,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const SizedBox(height: 80),
            Icon(Icons.pets_outlined, size: 56, color: AppColors.textMuted.withValues(alpha: 0.5)),
            const SizedBox(height: 12),
            Text(
              emptyMessage,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.ownerTeal,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        itemCount: horses.length,
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final horse = horses[index];
          return _HorseListTile(
            horse: horse,
            showStatus: showStatus,
            onTap: () => onTap(horse),
          );
        },
      ),
    );
  }
}

class _HorseListTile extends StatelessWidget {
  const _HorseListTile({
    required this.horse,
    required this.showStatus,
    required this.onTap,
  });

  final OwnerHorse horse;
  final bool showStatus;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final metrics = horse.careerMetrics;
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
                  color: AppColors.ownerMuted,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.pets, color: AppColors.ownerPrimary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      horse.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 16,
                        color: AppColors.heading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      horse.subtitle,
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                    if (metrics != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        '${metrics.wins} thắng / ${metrics.totalStarts} trận · ${metrics.winRate.toStringAsFixed(0)}%',
                        style: const TextStyle(
                          color: AppColors.ownerTeal,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (showStatus && horse.status != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: horseStatusColor(horse.status).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    horseStatusLabelVi(horse.status),
                    style: TextStyle(
                      color: horseStatusColor(horse.status),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                )
              else
                const Icon(Icons.chevron_right, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _MyHorsePreviewSheet extends StatelessWidget {
  const _MyHorsePreviewSheet({required this.horse});

  final OwnerHorse horse;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
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
            horse.name,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          if (horse.status != null)
            Text(
              'Trạng thái: ${horseStatusLabelVi(horse.status)}',
              style: TextStyle(color: horseStatusColor(horse.status), fontWeight: FontWeight.w600),
            ),
          const SizedBox(height: 8),
          Text(horse.subtitle, style: const TextStyle(color: AppColors.textMuted)),
          if (horse.rejectionReason != null && horse.rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Lý do từ chối: ${horse.rejectionReason}',
              style: const TextStyle(color: AppColors.errorText, fontSize: 13),
            ),
          ],
          if (!horse.isApproved) ...[
            const SizedBox(height: 12),
            const Text(
              'Ngựa chưa được duyệt nên chưa xem chi tiết công khai được.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.pop(context),
              style: FilledButton.styleFrom(backgroundColor: AppColors.ownerTeal),
              child: const Text('Đóng'),
            ),
          ),
        ],
      ),
    );
  }
}
