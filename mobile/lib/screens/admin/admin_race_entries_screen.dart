import 'package:flutter/material.dart';

import '../../models/admin_race.dart';
import '../../services/admin_races_service.dart';
import '../../theme/app_theme.dart';
import 'admin_race_bulk_review_sheet.dart';

/// Mở màn hình quản lý đăng ký ngựa (entries) cho 1 race:
/// - GET /api/admin/races/{id}/entries?status=...
/// - POST /api/admin/races/{id}/bulk-review
Future<bool?> pushEntriesManager(
  BuildContext context, {
  required int raceId,
  required String raceName,
  required int maxEntries,
  required VoidCallback onChanged,
}) {
  return Navigator.push<bool>(
    context,
    MaterialPageRoute(
      builder: (_) => _RaceEntriesScreen(
        raceId: raceId,
        raceName: raceName,
        maxEntries: maxEntries,
        onChanged: onChanged,
      ),
    ),
  );
}

class _RaceEntriesScreen extends StatefulWidget {
  const _RaceEntriesScreen({
    required this.raceId,
    required this.raceName,
    required this.maxEntries,
    required this.onChanged,
  });

  final int raceId;
  final String raceName;
  final int maxEntries;
  final VoidCallback onChanged;

  @override
  State<_RaceEntriesScreen> createState() => _RaceEntriesScreenState();
}

class _RaceEntriesScreenState extends State<_RaceEntriesScreen> {
  final _service = AdminRacesService();
  final _searchCtrl = TextEditingController();

  EntriesResponse? _meta;
  String _filter = 'ALL';
  String _search = '';

  bool _loading = true;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() {
      setState(() => _search = _searchCtrl.text);
    });
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final m = await _service.listEntries(widget.raceId, status: _filter);
      if (!mounted) return;
      setState(() {
        _meta = m;
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

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _changeFilter(String code) async {
    if (code == _filter) return;
    setState(() => _filter = code);
    await _load();
  }

  Future<void> _openBulk() async {
    if (_meta == null) return;
    final res = await showBulkReviewSheet(
      context,
      raceId: widget.raceId,
      entries: _meta!.entries,
      approvedCount: _meta!.approvedCount,
      maxEntries: _meta!.maxEntries,
    );
    if (res is Map<String, dynamic> && res['ok'] == true) {
      widget.onChanged();
      await _load();
      final s = res['summary'];
      if (s is BulkReviewSummary) {
        _snack(
          'Đã duyệt ${s.approved} · từ chối ${s.rejected}'
          '${s.hasErrors ? " · ${s.errors.length} lỗi" : ""}.',
        );
      }
    }
  }

  List<RaceEntry> get _filtered {
    final list = _meta?.entries ?? const [];
    if (_search.trim().isEmpty) return list;
    final q = _search.trim().toLowerCase();
    return list.where((e) {
      return (e.horseName?.toLowerCase().contains(q) ?? false) ||
          (e.ownerName?.toLowerCase().contains(q) ?? false) ||
          (e.jockeyName?.toLowerCase().contains(q) ?? false) ||
          '${e.entryId}'.contains(q) ||
          '${e.horseId}'.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final m = _meta;
    final allEntries = m?.entries ?? const <RaceEntry>[];
    final pending = allEntries.where((e) => e.isPending).toList();
    final approved = allEntries.where((e) => e.isApproved).toList();
    final rejected = allEntries.where((e) => e.isRejected).toList();
    final remaining =
        m == null ? widget.maxEntries : (m.maxEntries - m.approvedCount).clamp(0, m.maxEntries);

    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Quản lý đăng ký ngựa',
              style: TextStyle(fontSize: 16),
            ),
            Text(
              '#${widget.raceId} · ${widget.raceName}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
            ),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          _busy = true;
          widget.onChanged();
          await _load();
        },
        color: AppColors.adminAccent,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SlotBar(
                      total: widget.maxEntries,
                      approved: m?.approvedCount ?? 0,
                      pending: pending.length,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchCtrl,
                            decoration: InputDecoration(
                              hintText: 'Tên ngựa, chủ, kỵ sĩ…',
                              prefixIcon: const Icon(Icons.search),
                              isDense: true,
                              filled: true,
                              fillColor: Colors.white,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide:
                                    const BorderSide(color: AppColors.border),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton.icon(
                          onPressed: _busy || pending.isEmpty ? null : _openBulk,
                          icon: const Icon(Icons.checklist),
                          label: const Text('Duyệt loạt'),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.adminAccent,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final f in const [
                            ('ALL', 'Tất cả'),
                            ('PENDING', 'Chờ duyệt'),
                            ('APPROVED', 'Đã duyệt'),
                            ('REJECTED', 'Từ chối'),
                          ])
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: FilterChip(
                                label: Text(f.$2),
                                selected: _filter == f.$1,
                                onSelected: _loading
                                    ? null
                                    : (_) => _changeFilter(f.$1),
                                selectedColor: AppColors.adminAccent
                                    .withValues(alpha: 0.2),
                                checkmarkColor: AppColors.adminAccent,
                              ),
                            ),
                        ],
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
                          style: const TextStyle(color: AppColors.errorText),
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _Tag(label: 'Đã duyệt', value: '${approved.length}', color: AppColors.ownerTeal),
                        _Tag(label: 'Chờ', value: '${pending.length}', color: const Color(0xFFD97706)),
                        _Tag(label: 'Từ chối', value: '${rejected.length}', color: AppColors.errorText),
                        _Tag(label: 'Còn slot', value: '$remaining', color: remaining == 0 ? AppColors.errorText : AppColors.adminAccent),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            if (_loading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (allEntries.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Center(
                  child: Text(
                    'Chưa có entry nào trong race này.',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                ),
              )
            else ...[
              if (_filtered.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(
                    child: Text(
                      'Không có entry khớp từ khóa/bộ lọc.',
                      style: TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  sliver: SliverList.separated(
                    itemCount: _filtered.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (ctx, i) {
                      final e = _filtered[i];
                      return _EntryCard(entry: e);
                    },
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

class _SlotBar extends StatelessWidget {
  const _SlotBar({
    required this.total,
    required this.approved,
    required this.pending,
  });

  final int total;
  final int approved;
  final int pending;

  @override
  Widget build(BuildContext context) {
    final remaining = (total - approved).clamp(0, total);
    final pct = total == 0 ? 0.0 : (approved / total).clamp(0, 1).toDouble();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.adminDeep, AppColors.adminPrimary],
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.event_seat, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Slot ngựa: $approved/$total đã duyệt · còn lại $remaining',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                '${(pct * 100).round()}%',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Stack(
              children: [
                Container(
                  height: 8,
                  color: Colors.white.withValues(alpha: 0.15),
                ),
                FractionallySizedBox(
                  widthFactor: pct,
                  child: Container(height: 8, color: Colors.white),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '$pending entry đang chờ duyệt · APPROVED tự động block khi đủ slot',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.85),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label: ',
            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _EntryCard extends StatelessWidget {
  const _EntryCard({required this.entry});

  final RaceEntry entry;

  @override
  Widget build(BuildContext context) {
    final status = (entry.status ?? '').toUpperCase();
    final color = _statusColor(status);
    final bg = _statusBg(status);

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
              CircleAvatar(
                backgroundColor: AppColors.adminAccent.withValues(alpha: 0.15),
                child: const Icon(Icons.pets, color: AppColors.adminAccent),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.horseName ?? 'Entry #${entry.entryId}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppColors.heading,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        Text(
                          'Mã: #${entry.entryId}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted,
                          ),
                        ),
                        if (entry.ownerName != null &&
                            entry.ownerName!.isNotEmpty)
                          Text(
                            'Chủ: ${entry.ownerName}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                        if (entry.jockeyName != null &&
                            entry.jockeyName!.isNotEmpty)
                          Text(
                            'Kỵ sĩ: ${entry.jockeyName}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                        if (entry.jockeyWeight != null)
                          Text(
                            'Weight: ${entry.jockeyWeight}kg',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: bg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _statusLabel(status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          if (entry.odds != null || entry.reviewedAt != null) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 12,
              children: [
                if (entry.odds != null)
                  Text(
                    'Odds: ${entry.odds}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.adminAccent,
                    ),
                  ),
                if (entry.reviewedAt != null)
                  Text(
                    'Duyệt lúc ${_formatDate(entry.reviewedAt!.toLocal())}'
                    '${entry.reviewedByName != null && entry.reviewedByName!.isNotEmpty ? " bởi ${entry.reviewedByName}" : ""}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
              ],
            ),
          ],
          if (entry.rejectionReason != null &&
              entry.rejectionReason!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.errorBg,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.errorBorder),
              ),
              child: Text(
                'Lý do từ chối: ${entry.rejectionReason!}',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.errorText,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _statusLabel(String code) {
    switch (code) {
      case 'PENDING':
        return 'CHỜ';
      case 'APPROVED':
        return 'ĐÃ DUYỆT';
      case 'REJECTED':
        return 'TỪ CHỐI';
      default:
        return code.isEmpty ? '—' : code;
    }
  }

  Color _statusColor(String code) {
    switch (code.toUpperCase()) {
      case 'PENDING':
        return const Color(0xFFD97706);
      case 'APPROVED':
        return const Color(0xFF065F46);
      case 'REJECTED':
        return AppColors.errorText;
      default:
        return AppColors.textMuted;
    }
  }

  Color _statusBg(String code) {
    switch (code.toUpperCase()) {
      case 'PENDING':
        return const Color(0xFFFEF3C7);
      case 'APPROVED':
        return const Color(0xFFECFDF5);
      case 'REJECTED':
        return AppColors.errorBg;
      default:
        return AppColors.adminBg;
    }
  }

  String _formatDate(DateTime d) {
    final dd = d.day.toString().padLeft(2, '0');
    final mm = d.month.toString().padLeft(2, '0');
    final hh = d.hour.toString().padLeft(2, '0');
    final mn = d.minute.toString().padLeft(2, '0');
    return '$dd/$mm/${d.year} $hh:$mn';
  }
}
