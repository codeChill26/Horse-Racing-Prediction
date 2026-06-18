import 'package:flutter/material.dart';

import '../../models/admin_user.dart';
import '../../models/owner_horse.dart';
import '../../services/admin_horses_service.dart';
import '../../services/admin_users_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/horse_status_labels.dart';
import 'admin_horse_review_screen.dart';

const _statusFilters = [
  ('', 'Tất cả'),
  ('PENDING', 'Chờ duyệt'),
  ('APPROVED', 'Đã duyệt'),
  ('REJECTED', 'Từ chối'),
];

class AdminHorsesScreen extends StatefulWidget {
  const AdminHorsesScreen({super.key, required this.onLogout});

  final VoidCallback onLogout;

  @override
  State<AdminHorsesScreen> createState() => _AdminHorsesScreenState();
}

class _AdminHorsesScreenState extends State<AdminHorsesScreen> {
  final _service = AdminHorsesService();
  final _usersService = AdminUsersService();
  final _searchController = TextEditingController();

  List<OwnerHorse> _horses = [];
  bool _loading = true;
  String? _error;
  String _statusFilter = 'PENDING';
  String _search = '';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() => _search = _searchController.text);
    });
    _loadHorses();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<List<OwnerHorse>> _attachOwnerNames(List<OwnerHorse> horses) async {
    if (horses.isEmpty) return horses;

    try {
      final users = await _usersService.listUsers();
      final ownerById = <int, AdminUser>{
        for (final user in users)
          if (user.userId != null) user.userId!: user,
      };

      return horses.map((horse) {
        final owner = horse.ownerId != null ? ownerById[horse.ownerId] : null;
        if (owner == null) return horse;
        return horse.copyWith(
          ownerName: owner.fullName,
          ownerEmail: owner.email,
        );
      }).toList();
    } catch (_) {
      return horses;
    }
  }

  Future<void> _loadHorses() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _service.listHorses(
        status: _statusFilter.isEmpty ? null : _statusFilter,
      );
      final enriched = await _attachOwnerNames(list);
      if (!mounted) return;
      setState(() {
        _horses = enriched;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _horses = [];
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  List<OwnerHorse> get _filteredHorses {
    final q = _search.trim().toLowerCase();
    if (q.isEmpty) return _horses;
    return _horses.where((h) {
      return h.name.toLowerCase().contains(q) ||
          '${h.horseId}'.contains(q) ||
          (h.breed?.toLowerCase().contains(q) ?? false) ||
          h.displayOwner.toLowerCase().contains(q) ||
          (h.ownerEmail?.toLowerCase().contains(q) ?? false);
    }).toList();
  }

  ({int total, int pending, int approved, int rejected}) get _stats {
    return (
      total: _horses.length,
      pending: _horses.where((h) => h.status == 'PENDING').length,
      approved: _horses.where((h) => h.status == 'APPROVED').length,
      rejected: _horses.where((h) => h.status == 'REJECTED').length,
    );
  }

  Future<void> _openReview(OwnerHorse horse) async {
    final reviewed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => AdminHorseReviewScreen(
          horseId: horse.horseId,
          initialHorse: horse,
          onReviewed: () {},
        ),
      ),
    );
    if (reviewed == true) await _loadHorses();
  }

  @override
  Widget build(BuildContext context) {
    final s = _stats;
    final filtered = _filteredHorses;

    return RefreshIndicator(
      onRefresh: _loadHorses,
      color: AppColors.adminAccent,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppColors.adminDeep,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 16, bottom: 14, right: 56),
              title: const Text(
                'Duyệt ngựa',
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
                    'assets/images/horse-racing-hero.jpg',
                    fit: BoxFit.cover,
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Color(0x660F172A),
                          Color(0xE60F172A),
                        ],
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
                  _StatsRow(
                    loading: _loading,
                    total: s.total,
                    pending: s.pending,
                    approved: s.approved,
                    rejected: s.rejected,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Tên ngựa, ID, giống, chủ…',
                      prefixIcon: const Icon(Icons.search),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _statusFilters.map((filter) {
                        final code = filter.$1;
                        final label = filter.$2;
                        final selected = _statusFilter == code;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(label),
                            selected: selected,
                            onSelected: _loading
                                ? null
                                : (_) {
                                    setState(() => _statusFilter = code);
                                    _loadHorses();
                                  },
                            selectedColor: AppColors.adminAccent.withValues(alpha: 0.2),
                            checkmarkColor: AppColors.adminAccent,
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.errorBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.errorBorder),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: AppColors.errorText, fontSize: 13),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (_loading && _horses.isEmpty)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator(color: AppColors.adminAccent)),
            )
          else if (filtered.isEmpty)
            SliverFillRemaining(
              child: Center(
                child: Text(
                  _horses.isEmpty
                      ? 'Không có ngựa trong bộ lọc này.'
                      : 'Không khớp từ khóa tìm kiếm.',
                  style: const TextStyle(color: AppColors.textMuted),
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              sliver: SliverList.separated(
                itemCount: filtered.length,
                separatorBuilder: (context, index) => const SizedBox(height: 10),
                itemBuilder: (context, index) {
                  final horse = filtered[index];
                  return _HorseCard(
                    horse: horse,
                    onTap: () => _openReview(horse),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.loading,
    required this.total,
    required this.pending,
    required this.approved,
    required this.rejected,
  });

  final bool loading;
  final int total;
  final int pending;
  final int approved;
  final int rejected;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = (constraints.maxWidth - 12) / 2;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _StatBox(width: w, label: 'Trong danh sách', value: loading ? '…' : '$total'),
            _StatBox(
              width: w,
              label: 'Chờ duyệt',
              value: loading ? '…' : '$pending',
              accent: true,
            ),
            _StatBox(width: w, label: 'Đã duyệt', value: loading ? '…' : '$approved'),
            _StatBox(width: w, label: 'Từ chối', value: loading ? '…' : '$rejected'),
          ],
        );
      },
    );
  }
}

class _StatBox extends StatelessWidget {
  const _StatBox({
    required this.width,
    required this.label,
    required this.value,
    this.accent = false,
  });

  final double width;
  final String label;
  final String value;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: accent ? AppColors.adminAccent.withValues(alpha: 0.08) : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: accent ? AppColors.adminAccent.withValues(alpha: 0.35) : AppColors.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: accent ? AppColors.adminAccent : AppColors.heading,
            ),
          ),
        ],
      ),
    );
  }
}

class _HorseCard extends StatelessWidget {
  const _HorseCard({required this.horse, required this.onTap});

  final OwnerHorse horse;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isPending = horse.status == 'PENDING';

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
            border: Border.all(
              color: isPending
                  ? AppColors.adminAccent.withValues(alpha: 0.4)
                  : AppColors.border,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.adminBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.pets, color: AppColors.adminAccent),
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
                      '#${horse.horseId}'
                      '${horse.displayOwner != '—' ? ' · ${horse.displayOwner}' : ''}'
                      '${horse.breed != null && horse.breed!.isNotEmpty ? ' · ${horse.breed}' : ''}',
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (horse.status != null)
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
                ),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_right, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
