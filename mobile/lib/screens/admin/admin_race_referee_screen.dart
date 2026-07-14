import 'package:flutter/material.dart';

import '../../models/admin_race.dart';
import '../../services/admin_races_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';

/// Mở màn hình quản lý trọng tài / tranh chấp cho 1 race.
Future<bool?> pushRefereeManager(
  BuildContext context, {
  required int raceId,
  required String raceName,
  required String raceStatus,
}) {
  return Navigator.push<bool>(
    context,
    MaterialPageRoute(
      builder: (_) => _RaceRefereeScreen(
        raceId: raceId,
        raceName: raceName,
        raceStatus: raceStatus,
      ),
    ),
  );
}

class _RaceRefereeScreen extends StatefulWidget {
  const _RaceRefereeScreen({
    required this.raceId,
    required this.raceName,
    required this.raceStatus,
  });

  final int raceId;
  final String raceName;
  final String raceStatus;

  @override
  State<_RaceRefereeScreen> createState() => _RaceRefereeScreenState();
}

class _RaceRefereeScreenState extends State<_RaceRefereeScreen>
    with SingleTickerProviderStateMixin {
  final _service = AdminRacesService();

  late TabController _tabs;
  int _index = 0;

  // ----- Data -----
  List<RefereeOption> _referees = [];
  List<RefereeAssignment> _assigned = [];
  ConflictResponse? _conflict;
  ResolveConflictResult? _lastResult;

  // Assignment state
  final Set<int> _selected = {};
  bool _loadingReferees = true;
  bool _loadingAssigned = true;
  bool _busyAssign = false;

  // Conflict state
  bool _loadingConflict = true;
  bool _busyResolve = false;
  final TextEditingController _reasonCtrl = TextEditingController();
  final Map<int, int> _ranks = {};

  String? _error;

  bool get _isPaused => widget.raceStatus.toUpperCase() == 'PAUSED';
  bool get _isScheduled =>
      widget.raceStatus.toUpperCase() == 'SCHEDULED' ||
      widget.raceStatus.toUpperCase() == 'REGISTRATION_OPEN';

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _tabs.addListener(() {
      if (!_tabs.indexIsChanging) {
        setState(() => _index = _tabs.index);
        _reloadForTab();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _reloadForTab());
  }

  @override
  void dispose() {
    _tabs.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _reloadForTab() async {
    setState(() => _error = null);
    if (_index == 0) {
      await _loadAssigned();
      await _loadAvailable();
    } else if (_index == 1) {
      await _loadConflict();
    }
  }

  Future<void> _loadAssigned() async {
    setState(() {
      _loadingAssigned = true;
    });
    try {
      final list = await _service.listAssignedReferees(widget.raceId);
      if (!mounted) return;
      setState(() {
        _assigned = list;
        _loadingAssigned = false;
        _selected
          ..clear()
          ..addAll(list.where((e) => e.refereeId != null).map((e) => e.refereeId!));
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loadingAssigned = false;
      });
    }
  }

  Future<void> _loadAvailable() async {
    setState(() {
      _loadingReferees = true;
    });
    try {
      final list = await _service.listAvailableReferees(raceId: widget.raceId);
      if (!mounted) return;
      setState(() {
        _referees = list;
        _loadingReferees = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loadingReferees = false;
      });
    }
  }

  Future<void> _loadConflict() async {
    setState(() {
      _loadingConflict = true;
    });
    try {
      final res = await _service.reviewConflict(widget.raceId);
      if (!mounted) return;
      setState(() {
        _conflict = res;
        _loadingConflict = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loadingConflict = false;
      });
    }
  }

  // ----- Assign tab handlers -----

  void _toggleSelect(RefereeOption r) {
    setState(() {
      if (_selected.contains(r.userId)) {
        _selected.remove(r.userId);
      } else {
        if (_selected.length >= 2) {
          _error = 'Chỉ được chọn tối đa 2 trọng tài.';
          return;
        }
        _selected.add(r.userId);
        _error = null;
      }
    });
  }

  Future<void> _saveAssignment() async {
    if (_selected.length != 2) {
      setState(() => _error = 'Cần chọn đúng 2 trọng tài khác nhau.');
      return;
    }
    setState(() {
      _busyAssign = true;
      _error = null;
    });
    try {
      final list = await _service.assignReferees(
        widget.raceId,
        _selected.toList()..sort(),
      );
      if (!mounted) return;
      setState(() {
        _assigned = list;
        _busyAssign = false;
      });
      _snack('Đã phân công ${list.length} trọng tài.');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _busyAssign = false;
      });
    }
  }

  // ----- Resolve tab handlers -----

  List<ConflictRanking> get _entries {
    final subs = _conflict?.submissions ?? const [];
    final byId = <int, ConflictRanking>{};
    for (final sub in subs) {
      for (final r in sub.rankings) {
        if (r.entryId != null) byId[r.entryId!] = r;
      }
    }
    return byId.values.toList();
  }

  Future<void> _submitResolution() async {
    final subs = _conflict?.submissions ?? const [];
    final reason = _reasonCtrl.text.trim();
    if (reason.length < 5) {
      setState(() => _error = 'Lý do bắt buộc tối thiểu 5 ký tự.');
      return;
    }
    final ranked = _ranks.entries
        .where((kv) => kv.value > 0)
        .map((kv) => {'entryId': kv.key, 'rank': kv.value})
        .toList()
      ..sort((a, b) => (a['rank'] as int).compareTo(b['rank'] as int));

    if (ranked.isEmpty) {
      setState(() => _error = 'Vui lòng nhập thứ hạng ít nhất cho 1 ngựa.');
      return;
    }
    if (subs.length < 2) {
      setState(
        () => _error =
            'Cần đủ 2 trọng tài nộp kết quả trước khi giải quyết tranh chấp.',
      );
      return;
    }

    setState(() {
      _busyResolve = true;
      _error = null;
    });
    try {
      final result = await _service.resolveConflict(
        widget.raceId,
        rankings: ranked,
        reason: reason,
      );
      if (!mounted) return;
      _lastResult = result;
      setState(() => _busyResolve = false);
      _snack(
        'Đã giải quyết · ${result.recordedRankings} rank · race = ${raceStatusLabelVi(result.status ?? "")}',
      );
      await _loadConflict();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _busyResolve = false;
      });
    }
  }

  void _snack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Trọng tài & Tranh chấp',
              style: const TextStyle(fontSize: 16),
            ),
            Text(
              '#${widget.raceId} · ${widget.raceName}',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: AppColors.adminAccent,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.assignment_ind, size: 18), text: 'Phân công'),
            Tab(
              icon: Icon(Icons.compare_arrows, size: 18),
              text: 'Đối chiếu',
            ),
            Tab(icon: Icon(Icons.gavel, size: 18), text: 'Giải quyết'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          _buildAssignTab(),
          _buildConflictTab(),
          _buildResolveTab(),
        ],
      ),
    );
  }

  // ===== TAB 1: PHÂN CÔNG =====

  Widget _buildAssignTab() {
    if (!_isScheduled && !_isPaused) {
      return _StatusGate(
        icon: Icons.lock_clock,
        title: 'Chỉ phân công khi race ở trạng thái SCHEDULED',
        subtitle:
            'Hiện tại race ở trạng thái "${raceStatusLabelVi(widget.raceStatus)}". '
            'Hoàn tác publish (nếu có) để chuyển race về trạng thái phù hợp.',
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        await _loadAssigned();
        await _loadAvailable();
      },
      color: AppColors.adminAccent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          _SectionTitle(
            '1. Trọng tài đang được phân công',
            subtitle: 'Race cần đúng 2 trọng tài khác nhau.',
          ),
          const SizedBox(height: 8),
          if (_loadingAssigned)
            const Center(child: CircularProgressIndicator())
          else if (_assigned.isEmpty)
            _EmptyState(
              icon: Icons.person_search,
              text: 'Chưa có trọng tài nào được phân công cho race này.',
            )
          else
            ..._assigned.map(
              (a) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppColors.adminAccent.withValues(alpha: 0.35),
                  ),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppColors.adminAccent
                          .withValues(alpha: 0.15),
                      child: const Icon(
                        Icons.sports_score,
                        color: AppColors.adminAccent,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            a.refereeName ?? 'Trọng tài #${a.refereeId ?? '?'}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (a.refereeEmail != null &&
                              a.refereeEmail!.isNotEmpty)
                            Text(
                              a.refereeEmail!,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textMuted,
                              ),
                            ),
                          if (a.assignedAt != null)
                            Text(
                              'Phân công ${formatRaceDateTime(a.assignedAt!.toLocal())}',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.textMuted,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 16),
          _SectionTitle(
            '2. Chọn 2 trọng tài khả dụng',
            subtitle: 'Đã chọn ${_selected.length}/2 (mỗi người 1 lần duy nhất).',
          ),
          const SizedBox(height: 8),
          if (_loadingReferees)
            const Center(child: CircularProgressIndicator())
          else if (_referees.isEmpty)
            _EmptyState(
              icon: Icons.person_off,
              text:
                  'Không có trọng tài khả dụng. Cần tạo user với role "RACE_REFEREE" trước.',
            )
          else
            ..._referees.map(_buildRefereeTile),
          if (_error != null) ...[
            const SizedBox(height: 12),
            _ErrorBanner(message: _error!),
          ],
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed:
                (_busyAssign || _selected.length != 2) ? null : _saveAssignment,
            icon: const Icon(Icons.save),
            label: Text(_busyAssign ? 'Đang lưu…' : 'Phân công trọng tài'),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.adminAccent,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRefereeTile(RefereeOption r) {
    final isSelected = _selected.contains(r.userId);
    final alreadyAssigned = _assigned.any((a) => a.refereeId == r.userId);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isSelected
            ? AppColors.adminAccent.withValues(alpha: 0.08)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSelected ? AppColors.adminAccent : AppColors.border,
        ),
      ),
      child: CheckboxListTile(
        value: isSelected,
        onChanged: alreadyAssigned ? null : (_) => _toggleSelect(r),
        controlAffinity: ListTileControlAffinity.trailing,
        secondary: CircleAvatar(
          backgroundColor: AppColors.adminBg,
          child: const Icon(
            Icons.sports_score,
            color: AppColors.adminAccent,
          ),
        ),
        title: Text(
          r.fullName,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (r.email != null && r.email!.isNotEmpty)
              Text(r.email!),
            if (alreadyAssigned)
              const Text(
                'Đang phân công · bỏ tick trọng tài cũ trước khi chọn lại',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.errorText,
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ===== TAB 2: ĐỐI CHIẾU =====

  Widget _buildConflictTab() {
    return RefreshIndicator(
      onRefresh: _loadConflict,
      color: AppColors.adminAccent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [_buildConflictBody()],
      ),
    );
  }

  Widget _buildConflictBody() {
    if (_loadingConflict) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_conflict == null) {
      return _ErrorBody(message: _error ?? 'Không tải được dữ liệu', onRetry: _loadConflict);
    }
    if (!_isPaused) {
      return _StatusGate(
        icon: Icons.compare_arrows,
        title:
            'Chỉ đối chiếu khi race ở trạng thái PAUSED (do 2 trọng tài nộp lệch).',
        subtitle:
            'Hiện tại race ở "${raceStatusLabelVi(widget.raceStatus)}". Nếu hệ thống phát hiện trọng tài nộp khác nhau, race sẽ tự động chuyển sang PAUSED.',
      );
    }
    if (_conflict!.alreadyAgreed) {
      return const _StatusGate(
        icon: Icons.handshake,
        title: 'Hai trọng tài đã đồng thuận',
        subtitle:
            'Race tự động chuyển về PENDING_RESULT. Admin không cần can thiệp — chỉ cần bấm "Công bố" trong màn hình chi tiết race.',
        positive: true,
      );
    }

    final subs = _conflict!.submissions;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          'Kết quả 2 trọng tài',
          subtitle: subs.length < 2
              ? 'Chưa đủ — race sẽ tự chuyển khi cả 2 nộp.'
              : 'So sánh từng cặp entry bên dưới để xác định điểm lệch.',
        ),
        const SizedBox(height: 10),
        if (subs.length < 2)
          _EmptyState(
            icon: Icons.hourglass_empty,
            text: 'Chỉ có ${subs.length}/2 trọng tài đã nộp kết quả.',
          )
        else ...[
          _SubmissionCompare(submissions: subs),
          const SizedBox(height: 12),
          _DiffTable(submissions: subs),
        ],
      ],
    );
  }

  // ===== TAB 3: GIẢI QUYẾT =====

  Widget _buildResolveTab() {
    return RefreshIndicator(
      onRefresh: _loadConflict,
      color: AppColors.adminAccent,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        children: [
          if (_lastResult != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: Color(0xFF065F46),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Lần can thiệp gần nhất: ghi ${_lastResult!.recordedRankings} hạng · '
                      'trạng thái = "${raceStatusLabelVi(_lastResult!.status ?? "")}"',
                      style: const TextStyle(
                        color: Color(0xFF065F46),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Ghi đè kết quả chính thức',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.heading,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Hành động này sẽ cập nhật thứ hạng cuối cho race và chuyển race về PENDING_RESULT — sau đó bạn có thể công bố.',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 12),
                if (_loadingConflict)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (!_isPaused)
                  _StatusGate(
                    icon: Icons.pause_circle_outline,
                    title:
                        'Chỉ giải quyết khi race PAUSED (2 trọng tài nộp lệch).',
                    subtitle:
                        'Hiện tại race ở trạng thái "${raceStatusLabelVi(widget.raceStatus)}".',
                  )
                else if (_conflict?.alreadyAgreed == true)
                  const _StatusGate(
                    icon: Icons.handshake,
                    title: '2 trọng tài đã đồng thuận',
                    subtitle:
                        'Hệ thống tự xử lý — không cần ghi đè, chỉ cần công bố.',
                    positive: true,
                  )
                else ...[
                  _entries.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Text(
                            'Chưa có entry nào để xếp hạng.',
                            style: TextStyle(color: AppColors.textMuted),
                          ),
                        )
                      : Column(
                          children:
                              _entries.map(_buildRankRow).toList(),
                        ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _reasonCtrl,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Lý do can thiệp * (≥ 5 ký tự)',
                      hintText: 'Mô tả ngắn gọn lý do ghi đè…',
                    ),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  _ErrorBanner(message: _error!),
                ],
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: (_busyResolve ||
                          _conflict?.alreadyAgreed == true ||
                          _entries.isEmpty ||
                          _reasonCtrl.text.trim().length < 5)
                      ? null
                      : _submitResolution,
                  icon: const Icon(Icons.gavel),
                  label: Text(
                    _busyResolve ? 'Đang lưu…' : 'Xác nhận & ghi đè',
                  ),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.adminAccent,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).pop(true),
            icon: const Icon(Icons.check),
            label: const Text('Hoàn tất — quay lại chi tiết race'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.adminAccent,
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankRow(ConflictRanking r) {
    final id = r.entryId ?? 0;
    final submissions = _conflict?.submissions ?? const <ConflictSubmission>[];
    final ctrlA = submissions.isNotEmpty
        ? submissions[0].rankingsByEntry[id]?.rank
        : null;
    final ctrlB = submissions.length > 1
        ? submissions[1].rankingsByEntry[id]?.rank
        : null;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  r.horseName ?? 'Ngựa #$id',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: AppColors.heading,
                  ),
                ),
                Text(
                  [
                    if (ctrlA != null) 'TT1: #$ctrlA',
                    if (ctrlB != null) 'TT2: #$ctrlB',
                  ].join(' · '),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 64,
            child: TextField(
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              decoration: const InputDecoration(
                hintText: 'rank',
                isDense: true,
                contentPadding: EdgeInsets.symmetric(vertical: 8),
              ),
              onChanged: (v) {
                final n = int.tryParse(v.trim());
                setState(() {
                  if (n == null || n < 1) {
                    _ranks.remove(id);
                  } else {
                    _ranks[id] = n;
                  }
                });
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ===== Shared widgets =====

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {this.subtitle});
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: AppColors.heading,
          ),
        ),
        if (subtitle != null)
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text(
              subtitle!,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ),
      ],
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(icon, color: AppColors.textMuted, size: 28),
          const SizedBox(height: 6),
          Text(text, style: const TextStyle(color: AppColors.textMuted)),
        ],
      ),
    );
  }
}

class _StatusGate extends StatelessWidget {
  const _StatusGate({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.positive = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool positive;

  @override
  Widget build(BuildContext context) {
    final color = positive
        ? const Color(0xFF065F46)
        : AppColors.errorText;
    final bg = positive ? const Color(0xFFECFDF5) : AppColors.errorBg;
    final border = positive
        ? const Color(0xFFA7F3D0)
        : AppColors.errorBorder;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(fontSize: 12)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SubmissionCompare extends StatelessWidget {
  const _SubmissionCompare({required this.submissions});

  final List<ConflictSubmission> submissions;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: submissions.map(
        (s) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              const Icon(Icons.sports_score, color: AppColors.adminAccent),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      s.refereeName ??
                          'Trọng tài #${s.refereeId ?? '?'}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (s.note != null && s.note!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          'Note: ${s.note!}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              if (s.submittedAt != null)
                Text(
                  formatRaceDateTime(s.submittedAt!.toLocal()),
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
            ],
          ),
        ),
      ).toList(),
    );
  }
}

class _DiffTable extends StatelessWidget {
  const _DiffTable({required this.submissions});

  final List<ConflictSubmission> submissions;

  @override
  Widget build(BuildContext context) {
    final a = submissions[0].rankingsByEntry;
    final b = submissions.length > 1
        ? submissions[1].rankingsByEntry
        : <int, ConflictRanking>{};

    final keys = {...a.keys, ...b.keys}.toList();

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: const BoxDecoration(
              color: AppColors.adminBg,
              borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: const [
                Expanded(
                  child: Text(
                    'Ngựa',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
                SizedBox(
                  width: 48,
                  child: Center(
                    child: Text(
                      'TT1',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
                SizedBox(
                  width: 48,
                  child: Center(
                    child: Text(
                      'TT2',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
                SizedBox(
                  width: 40,
                  child: Center(
                    child: Text(
                      'Lệch',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          ...keys.map((entryId) {
            final rA = a[entryId];
            final rB = b[entryId];
            final diff = rA == null || rB == null || rA.rank != rB.rank;
            return Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: AppColors.border.withValues(alpha: 0.4),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      rA?.horseName ?? rB?.horseName ?? 'Entry #$entryId',
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                  ),
                  SizedBox(
                    width: 48,
                    child: Center(
                      child: Text(
                        '${rA?.rank ?? '—'}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.adminAccent,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 48,
                    child: Center(
                      child: Text(
                        '${rB?.rank ?? '—'}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: AppColors.adminAccent,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 40,
                    child: Center(
                      child: Icon(
                        diff ? Icons.warning_amber : Icons.check,
                        size: 18,
                        color: diff
                            ? const Color(0xFFD97706)
                            : const Color(0xFF065F46),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
          if (keys.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Cả 2 phía chưa có rank để so sánh.',
                style: TextStyle(color: AppColors.textMuted),
              ),
            ),
        ],
      ),
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.errorBorder),
      ),
      child: Text(message, style: const TextStyle(color: AppColors.errorText)),
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
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: onRetry,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.adminAccent,
              ),
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}
