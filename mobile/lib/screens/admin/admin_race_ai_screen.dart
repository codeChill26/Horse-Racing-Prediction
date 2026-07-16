import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/admin_race.dart';
import '../../services/admin_races_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';
import '../../utils/format_utils.dart';

/// Màn hình xem danh sách races (GET /api/admin/races)
/// và các API AI: ai-odds, risk-score
class AdminRaceAiScreen extends StatefulWidget {
  const AdminRaceAiScreen({super.key});

  @override
  State<AdminRaceAiScreen> createState() => _AdminRaceAiScreenState();
}

class _AdminRaceAiScreenState extends State<AdminRaceAiScreen>
    with SingleTickerProviderStateMixin {
  final _raceService = AdminRacesService();
  final _treasuryController = TextEditingController(text: '10000');

  late TabController _tabController;

  // State cho tab Races
  List<AdminRace> _races = [];
  bool _loadingRaces = false;
  String? _errorRaces;
  String _raceStatusFilter = 'ALL';
  int _racePage = 1;
  bool _hasMoreRaces = false;

  // State cho tab AI Odds
  int? _selectedRaceId;
  AiOddsResponse? _aiOdds;
  bool _loadingAiOdds = false;
  String? _errorAiOdds;

  // State cho tab Risk Score
  RiskScoreResponse? _riskScore;
  bool _loadingRiskScore = false;
  String? _errorRiskScore;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadRaces();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _treasuryController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.index == 1 && _selectedRaceId != null && _aiOdds == null) {
      _loadAiOdds();
    } else if (_tabController.index == 2 && _selectedRaceId != null && _riskScore == null) {
      _loadRiskScore();
    }
  }

  Future<void> _loadRaces({bool append = false}) async {
    if (!append) {
      setState(() {
        _loadingRaces = true;
        _errorRaces = null;
      });
    }

    try {
      final response = await _raceService.listRaces(
        status: _raceStatusFilter,
        page: append ? _racePage + 1 : 1,
      );

      if (!mounted) return;
      setState(() {
        if (append) {
          _races.addAll(response.races);
          _racePage++;
        } else {
          _races = response.races;
          _racePage = 1;
        }
        _hasMoreRaces = response.hasMore;
        _loadingRaces = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorRaces = e.toString().replaceFirst('Exception: ', '');
        _loadingRaces = false;
      });
    }
  }

  Future<void> _loadAiOdds() async {
    if (_selectedRaceId == null) return;

    setState(() {
      _loadingAiOdds = true;
      _errorAiOdds = null;
    });

    try {
      final response = await _raceService.getAiOdds(_selectedRaceId!);
      if (!mounted) return;
      setState(() {
        _aiOdds = response;
        _loadingAiOdds = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorAiOdds = e.toString().replaceFirst('Exception: ', '');
        _loadingAiOdds = false;
      });
    }
  }

  Future<void> _loadRiskScore() async {
    if (_selectedRaceId == null) return;

    final treasury = double.tryParse(_treasuryController.text) ?? 10000;

    setState(() {
      _loadingRiskScore = true;
      _errorRiskScore = null;
    });

    try {
      final response = await _raceService.getRiskScore(
        _selectedRaceId!,
        treasury: treasury,
      );
      if (!mounted) return;
      setState(() {
        _riskScore = response;
        _loadingRiskScore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorRiskScore = e.toString().replaceFirst('Exception: ', '');
        _loadingRiskScore = false;
      });
    }
  }

  void _selectRace(AdminRace race) {
    setState(() {
      _selectedRaceId = race.raceId;
      _aiOdds = null;
      _riskScore = null;
    });

    // Chuyển sang tab AI Odds
    _tabController.animateTo(1);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.adminBg,
      appBar: AppBar(
        title: const Text('Race & AI Analysis'),
        backgroundColor: AppColors.adminDeep,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Danh sách Race', icon: Icon(Icons.flag)),
            Tab(text: 'AI Odds', icon: Icon(Icons.analytics)),
            Tab(text: 'Risk Score', icon: Icon(Icons.warning_amber)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRacesTab(),
          _buildAiOddsTab(),
          _buildRiskScoreTab(),
        ],
      ),
    );
  }

  Widget _buildRacesTab() {
    return Column(
      children: [
        // Filter
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final f in const [
                  ('ALL', 'Tất cả'),
                  ('SCHEDULED', 'Đã lên lịch'),
                  ('IN_PROGRESS', 'Đang chạy'),
                  ('PENDING_RESULT', 'Chờ kết quả'),
                  ('PAUSED', 'Tạm dừng'),
                  ('FINISHED', 'Kết thúc'),
                ])
                  Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: FilterChip(
                      label: Text(f.$2, style: const TextStyle(fontSize: 12)),
                      selected: _raceStatusFilter == f.$1,
                      onSelected: _loadingRaces
                          ? null
                          : (_) {
                              setState(() => _raceStatusFilter = f.$1);
                              _loadRaces();
                            },
                      selectedColor: AppColors.adminAccent.withValues(alpha: 0.2),
                      checkmarkColor: AppColors.adminAccent,
                    ),
                  ),
              ],
            ),
          ),
        ),

        // List
        Expanded(
          child: _buildRefreshIndicator(
            onRefresh: () => _loadRaces(),
            child: _buildRacesList(),
          ),
        ),
      ],
    );
  }

  Widget _buildRacesList() {
    if (_loadingRaces && _races.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorRaces != null && _races.isEmpty) {
      return _buildErrorState(_errorRaces!, onRetry: _loadRaces);
    }

    if (_races.isEmpty) {
      return const Center(
        child: Text(
          'Không có race nào',
          style: TextStyle(color: AppColors.textMuted),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: _races.length + (_hasMoreRaces ? 1 : 0),
      itemBuilder: (ctx, i) {
        if (i >= _races.length) {
          return _buildLoadMore(() => _loadRaces(append: true));
        }

        final race = _races[i];
        return _RaceListTile(
          race: race,
          isSelected: race.raceId == _selectedRaceId,
          onTap: () => _selectRace(race),
        );
      },
    );
  }

  Widget _buildAiOddsTab() {
    if (_selectedRaceId == null) {
      return _buildSelectRaceHint('Chọn 1 race từ tab "Danh sách Race" để xem AI Odds');
    }

    if (_loadingAiOdds) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorAiOdds != null) {
      return _buildErrorState(_errorAiOdds!, onRetry: _loadAiOdds);
    }

    if (_aiOdds == null) {
      return const Center(child: Text('Chưa có dữ liệu'));
    }

    return _buildRefreshIndicator(
      onRefresh: _loadAiOdds,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSummaryCard(),
            const SizedBox(height: 16),
            _buildOddsTable(),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard() {
    final summary = _aiOdds!.summary;
    final generatedAt = _aiOdds!.generatedAt;
    final source = _aiOdds!.source;
    final note = _aiOdds!.note;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppColors.adminAccent),
              const SizedBox(width: 8),
              Text(
                _aiOdds!.raceName ?? 'Race #${_aiOdds!.raceId}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              if (source != null && source.isNotEmpty) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.adminAccent.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    source,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.adminAccent,
                    ),
                  ),
                ),
              ],
            ],
          ),
          if (note != null && note.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              note,
              style: const TextStyle(
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: AppColors.textMuted,
              ),
            ),
          ],
          const SizedBox(height: 12),
          if (summary != null)
            Row(
              children: [
                _buildStatChip(
                  'Tổng ngựa',
                  '${summary.totalEntries}',
                  Icons.pets,
                ),
                const SizedBox(width: 12),
                _buildStatChip(
                  'Độ tin cậy TB',
                  summary.avgConfidence,
                  Icons.verified,
                ),
                const SizedBox(width: 12),
                _buildStatChip(
                  'Biến động',
                  summary.marketVolatility.toStringAsFixed(2),
                  Icons.trending_up,
                ),
              ],
            )
          else
            Row(
              children: [
                _buildStatChip(
                  'Tổng ngựa',
                  '${_aiOdds!.suggestions.length}',
                  Icons.pets,
                ),
              ],
            ),
          if (generatedAt != null) ...[
            const SizedBox(height: 8),
            Text(
              'Cập nhật: ${DateFormat('HH:mm dd/MM/yyyy').format(generatedAt.toLocal())}',
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.textMuted,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStatChip(String label, String value, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.adminBg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: AppColors.adminAccent),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            Text(
              label,
              style: const TextStyle(
                fontSize: 10,
                color: AppColors.textMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOddsTable() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Gợi ý Odds từ AI',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
          const Divider(height: 1),
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.adminBg,
            child: const Row(
              children: [
                SizedBox(width: 28, child: Text('#', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12), textAlign: TextAlign.center)),
                Expanded(flex: 2, child: Text('Ngựa / Jockey', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12))),
                Expanded(child: Text('P(Thắng)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12), textAlign: TextAlign.center)),
                Expanded(child: Text('Odds Fair', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12), textAlign: TextAlign.center)),
                Expanded(child: Text('Gợi ý', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12), textAlign: TextAlign.center)),
                Expanded(child: Text('Đánh giá', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12), textAlign: TextAlign.center)),
              ],
            ),
          ),
          // Rows
          for (final s in _aiOdds!.suggestions)
            _buildOddsRow(s),
        ],
      ),
    );
  }

  Widget _buildOddsRow(AiOddsSuggestion s) {
    final isUndervalued = s.suggestedOdds > s.fairOdds;
    final confidence = s.effectiveConfidence;
    final confidenceColor = confidence == 'HIGH'
        ? Colors.green
        : confidence == 'MEDIUM'
            ? Colors.orange
            : Colors.grey;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 28,
            child: s.rank != null
                ? Container(
                    alignment: Alignment.center,
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    decoration: BoxDecoration(
                      color: s.rank == 1
                          ? Colors.amber.withValues(alpha: 0.2)
                          : s.rank == 2
                              ? Colors.grey.withValues(alpha: 0.2)
                              : s.rank == 3
                                  ? Colors.brown.withValues(alpha: 0.15)
                                  : AppColors.adminBg,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '${s.rank}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  )
                : const SizedBox.shrink(),
          ),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  s.horseName ?? 'Entry #${s.entryId}',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  overflow: TextOverflow.ellipsis,
                ),
                if (s.jockeyName != null && s.jockeyName!.isNotEmpty)
                  Text(
                    'Jockey: ${s.jockeyName}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
          Expanded(
            child: Text(
              '${(s.winProbability * 100).toStringAsFixed(1)}%',
              style: const TextStyle(fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: Text(
              s.fairOdds.toStringAsFixed(2),
              style: const TextStyle(fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: Text(
              s.suggestedOdds.toStringAsFixed(2),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: AppColors.adminAccent,
              ),
              textAlign: TextAlign.center,
            ),
          ),
          Expanded(
            child: Tooltip(
              message: 'Độ tin cậy: $confidence',
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isUndervalued
                      ? Colors.green.withValues(alpha: 0.1)
                      : Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: confidenceColor, width: 0.5),
                ),
                child: Text(
                  isUndervalued ? '↓ Hời' : '↑ Đắt',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isUndervalued ? Colors.green : Colors.red,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRiskScoreTab() {
    if (_selectedRaceId == null) {
      return _buildSelectRaceHint('Chọn 1 race từ tab "Danh sách Race" để xem Risk Score');
    }

    return Column(
      children: [
        // Treasury input
        Container(
          color: Colors.white,
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Treasury (ví):',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              SizedBox(
                width: 150,
                child: TextField(
                  controller: _treasuryController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(),
                    hintText: 'VD: 10000',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: _loadRiskScore,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.adminAccent,
                ),
                child: const Text('Tính'),
              ),
            ],
          ),
        ),

        // Content
        Expanded(
          child: _buildRefreshIndicator(
            onRefresh: _loadRiskScore,
            child: _buildRiskContent(),
          ),
        ),
      ],
    );
  }

  Widget _buildRiskContent() {
    if (_loadingRiskScore) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorRiskScore != null) {
      return _buildErrorState(_errorRiskScore!, onRetry: _loadRiskScore);
    }

    if (_riskScore == null) {
      return const Center(child: Text('Nhấn "Tính" để xem kết quả'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildRiskOverviewCard(),
          const SizedBox(height: 16),
          _buildHorseTable(),
          const SizedBox(height: 16),
          _buildRecommendationsCard(),
        ],
      ),
    );
  }

  Widget _buildRiskOverviewCard() {
    final riskColor = _riskScore!.riskLevel == 'LOW'
        ? Colors.green
        : _riskScore!.riskLevel == 'MEDIUM'
            ? Colors.orange
            : _riskScore!.riskLevel == 'HIGH'
                ? Colors.red
                : Colors.purple;
    final source = _riskScore!.source;
    final note = _riskScore!.note;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            _riskScore!.raceName ?? 'Race #${_riskScore!.raceId}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (source != null && source.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.adminAccent.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              source,
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppColors.adminAccent,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Treasury: ${formatCurrency(_riskScore!.treasury.toInt())}',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: riskColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: riskColor),
                ),
                child: Text(
                  _riskScore!.riskLevel,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: riskColor,
                  ),
                ),
              ),
            ],
          ),
          if (note != null && note.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              note,
              style: const TextStyle(
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: AppColors.textMuted,
              ),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildRiskMetric(
                  'Risk Score',
                  _riskScore!.riskScore.toStringAsFixed(1),
                  Icons.speed,
                  riskColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildRiskMetric(
                  'Total Pool',
                  formatCurrency(_riskScore!.totalPool.toInt()),
                  Icons.account_balance_wallet,
                  AppColors.adminAccent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildRiskMetric(
                  'Worst Case',
                  formatCurrency(_riskScore!.worstCaseLiability.toInt()),
                  Icons.warning,
                  Colors.red,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(
                _riskScore!.isHealthyCoverage
                    ? Icons.check_circle
                    : Icons.error,
                color: _riskScore!.isHealthyCoverage ? Colors.green : Colors.red,
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _riskScore!.isHealthyCoverage
                      ? 'Coverage ratio: ${_riskScore!.coverageRatio.toStringAsFixed(2)}x ✓ An toàn'
                      : 'Coverage ratio: ${_riskScore!.coverageRatio.toStringAsFixed(2)}x ⚠️ Thiếu ${formatCurrency((_riskScore!.worstCaseLiability - _riskScore!.treasury).toInt())}',
                  style: TextStyle(
                    color: _riskScore!.isHealthyCoverage ? Colors.green : Colors.red,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRiskMetric(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.adminBg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 13,
              color: color,
            ),
            textAlign: TextAlign.center,
          ),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHorseTable() {
    if (_riskScore!.horses.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text(
              'Chi tiết rủi ro theo ngựa',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
          const Divider(height: 1),
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            color: AppColors.adminBg,
            child: const Row(
              children: [
                Expanded(flex: 2, child: Text('Ngựa', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 11))),
                Expanded(child: Text('Odds HT', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 11), textAlign: TextAlign.center)),
                Expanded(child: Text('AI gợi ý', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 11), textAlign: TextAlign.center)),
                Expanded(child: Text('Pool', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 11), textAlign: TextAlign.center)),
                Expanded(child: Text('Liability', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 11), textAlign: TextAlign.center)),
              ],
            ),
          ),
          // Rows
          for (final h in _riskScore!.horses) _buildHorseRow(h),
        ],
      ),
    );
  }

  Widget _buildHorseRow(RiskHorse h) {
    final delta = h.oddsDelta;
    final isUp = delta > 0.001;
    final isDown = delta < -0.001;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                flex: 2,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      h.horseName ?? 'Entry #${h.entryId}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (h.numBettors > 0 || h.totalBet > 0)
                      Text(
                        '${h.numBettors} người · ${formatCurrency(h.totalBet.toInt())} · ${(h.poolShare * 100).toStringAsFixed(1)}%',
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppColors.textMuted,
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: Text(
                  h.currentOdds.toStringAsFixed(2),
                  style: const TextStyle(fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ),
              Expanded(
                child: Tooltip(
                  message: h.reason ?? 'AI không kèm lý do',
                  child: Text(
                    h.suggestedOdds.toStringAsFixed(2),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isUp
                          ? Colors.red
                          : isDown
                              ? Colors.green
                              : AppColors.adminAccent,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              Expanded(
                child: Text(
                  h.totalBet > 0
                      ? formatCurrency(h.totalBet.toInt())
                      : '—',
                  style: const TextStyle(fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ),
              Expanded(
                child: Text(
                  h.liabilityIfWin > 0
                      ? formatCurrency(h.liabilityIfWin.toInt())
                      : '—',
                  style: TextStyle(
                    fontSize: 12,
                    color: h.liabilityIfWin > 0 ? Colors.red : AppColors.textMuted,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
          if (h.reason != null && h.reason!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isUp
                    ? Colors.red.withValues(alpha: 0.08)
                    : isDown
                        ? Colors.green.withValues(alpha: 0.08)
                        : AppColors.adminBg,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    isUp
                        ? Icons.arrow_upward
                        : isDown
                            ? Icons.arrow_downward
                            : Icons.horizontal_rule,
                    size: 12,
                    color: isUp
                        ? Colors.red
                        : isDown
                            ? Colors.green
                            : AppColors.textMuted,
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      h.reason!,
                      style: TextStyle(
                        fontSize: 11,
                        fontStyle: FontStyle.italic,
                        color: isUp
                            ? Colors.red
                            : isDown
                                ? Colors.green
                                : AppColors.textMuted,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildRecommendationsCard() {
    if (_riskScore!.recommendations.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.lightbulb, color: Colors.amber, size: 20),
              SizedBox(width: 8),
              Text(
                'Khuyến nghị',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ],
          ),
          const SizedBox(height: 12),
          for (final rec in _riskScore!.recommendations)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('• ', style: TextStyle(fontSize: 14)),
                  Expanded(
                    child: Text(
                      rec,
                      style: const TextStyle(fontSize: 13, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSelectRaceHint(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.touch_app,
              size: 64,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRefreshIndicator({
    required Future<void> Function() onRefresh,
    required Widget child,
  }) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.adminAccent,
      child: child,
    );
  }

  Widget _buildErrorState(String message, {required VoidCallback onRetry}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: AppColors.errorText,
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.errorText),
            ),
            const SizedBox(height: 16),
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

  Widget _buildLoadMore(VoidCallback onLoadMore) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Center(
        child: _hasMoreRaces
            ? FilledButton(
                onPressed: onLoadMore,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.adminAccent,
                ),
                child: const Text('Tải thêm'),
              )
            : const Text(
                'Đã hiển thị tất cả',
                style: TextStyle(color: AppColors.textMuted),
              ),
      ),
    );
  }
}

class _RaceListTile extends StatelessWidget {
  const _RaceListTile({
    required this.race,
    required this.isSelected,
    required this.onTap,
  });

  final AdminRace race;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final status = (race.status ?? '').toUpperCase();
    final statusColor = raceStatusColor(status);
    final statusBg = raceStatusBg(status);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: isSelected ? 3 : 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? AppColors.adminAccent : Colors.transparent,
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.adminAccent.withValues(alpha: 0.1)
                      : AppColors.adminBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.flag,
                  color: isSelected ? AppColors.adminAccent : AppColors.textMuted,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      race.name ?? 'Race #${race.raceId}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${race.entriesCount}/${race.maxEntries} ngựa · ${race.predictionsCount} bet',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  raceStatusLabelVi(status),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (isSelected) ...[
                const SizedBox(width: 8),
                const Icon(
                  Icons.check_circle,
                  color: AppColors.adminAccent,
                  size: 20,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
