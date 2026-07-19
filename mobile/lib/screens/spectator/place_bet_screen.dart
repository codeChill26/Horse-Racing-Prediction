import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/public_tournament.dart';
import '../../models/race_summary.dart';
import '../../models/prediction.dart';
import '../../services/spectator_api.dart';
import '../../services/tournaments_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/race_status_labels.dart';

/// Tham số mở PlaceBetScreen.
///
/// - [raceId] (cũ)        : nếu biết raceId, mở dropdown chọn ngựa của race đó.
/// - [raceName]            : hiển thị tiêu đề phụ.
/// - [availableRaces] (mới): danh sách race cho phép user chọn lại (khi mở từ
///   màn không truyền race cụ thể, vd từ nút "Đặt cược" ở tab Ví/Trang chủ).
/// - [initialRaceDetail]   : nếu đã tải sẵn RaceDetail thì truyền vào để
///   dropdown ngựa có dữ liệu ngay lập tức.
class PlaceBetArgs {
  const PlaceBetArgs({
    this.raceId,
    this.raceName,
    this.availableRaces,
    this.initialRaceDetail,
  });

  final int? raceId;
  final String? raceName;
  final List<RaceSummary>? availableRaces;
  final RaceDetail? initialRaceDetail;
}

class PlaceBetResult {
  const PlaceBetResult({required this.success, this.prediction, this.errorMessage});
  final bool success;
  final Prediction? prediction;
  final String? errorMessage;
}

class PlaceBetScreen extends StatefulWidget {
  const PlaceBetScreen({super.key, required this.api, this.args});

  final SpectatorApi api;
  final PlaceBetArgs? args;

  @override
  State<PlaceBetScreen> createState() => _PlaceBetScreenState();
}

class _PlaceBetScreenState extends State<PlaceBetScreen> {
  static const _betTypes = ['WIN', 'PLACE', 'SHOW', 'QUINELLA', 'EXACTA'];

  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _tournamentsService = TournamentsService();

  String? _betType = 'WIN';

  // Dropdown 3 cấp: Tournament → Race → Entry.
  List<PublicTournament> _tournaments = const [];
  PublicTournament? _selectedTournament;
  bool _loadingTournaments = false;
  String? _tournamentsError;

  List<RaceSummary> _bettableRacesInTournament = const [];
  RaceSummary? _selectedRace;
  bool _loadingRaces = false;
  String? _racesError;

  RaceDetail? _raceDetail;
  bool _loadingRaceDetail = false;
  String? _raceDetailError;

  // Dropdown ngựa (entries chỉ là APPROVED — backend lọc).
  RaceEntryDetail? _pick1;
  RaceEntryDetail? _pick2;

  bool _submitting = false;

  // Gợi ý AI: button ở parent chỉ track loading để disable + show spinner.
  // State thật (result/error) do _AiSuggestionSheet tự quản lý trong route
  // modal — parent setState không rebuild được modal route.
  bool _aiLoading = false;

  @override
  void initState() {
    super.initState();
    _amountController.text = '10';
    _bootstrap();
  }

  /// Khởi tạo: tải tournament → nếu args cho sẵn raceId thì tự chọn tournament/race
  /// tương ứng để dropdown có sẵn giá trị trước khi user chạm vào.
  Future<void> _bootstrap() async {
    final args = widget.args;
    await _loadTournaments();
    if (!mounted) return;

    // Nếu caller truyền sẵn raceId + raceName + danh sách race của tournament đó,
    // thì prefill thẳng 2 dropdown đầu rồi load race detail luôn.
    if (args != null && args.raceId != null && args.raceId! > 0) {
      final preRace = _findRaceInArgs(args);
      if (preRace != null) {
        // Thử chọn tournament theo id khớp; nếu có race nhưng tournamentId chưa
        // có trong cache (race nằm trong tournament đã ONGOING/FINISHED không
        // còn xuất hiện trong /api/tournaments public), vẫn chọn được race.
        final t = _tournaments.firstWhere(
          (t) => t.tournamentId == preRace.tournamentId,
          orElse: () => PublicTournament(
            tournamentId: preRace.tournamentId,
            name: args.raceName ?? 'Tournament #${preRace.tournamentId}',
          ),
        );
        await _onTournamentChanged(t,
            preSelectRaceId: preRace.raceId,
            preSelectRaceName: args.raceName);
        return;
      }
    }
  }

  Future<void> _loadTournaments() async {
    setState(() {
      _loadingTournaments = true;
      _tournamentsError = null;
    });
    try {
      final list = await _tournamentsService.listTournaments();
      if (!mounted) return;
      setState(() {
        _tournaments = list;
        _loadingTournaments = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _tournamentsError = e.toString().replaceFirst('Exception: ', '');
        _loadingTournaments = false;
      });
    }
  }

  Future<void> _onTournamentChanged(
    PublicTournament? tournament, {
    int? preSelectRaceId,
    String? preSelectRaceName,
  }) async {
    setState(() {
      _selectedTournament = tournament;
      _bettableRacesInTournament = const [];
      _selectedRace = null;
      _raceDetail = null;
      _pick1 = null;
      _pick2 = null;
      _aiLoading = false;
    });
    if (tournament == null || tournament.tournamentId == null) return;

    setState(() => _loadingRaces = true);
    try {
      final races = await _tournamentsService.listRacesByTournamentId(
        tournament.tournamentId!,
      );
      if (!mounted) return;
      // Chỉ hiện race SCHEDULED (tức là còn cược được).
      final bettable = races.where((r) => r.isBettable).toList();
      setState(() {
        _bettableRacesInTournament = bettable;
        _loadingRaces = false;
        _racesError = null;
      });

      RaceSummary? pick;
      if (preSelectRaceId != null) {
        for (final r in bettable) {
          if (r.raceId == preSelectRaceId) {
            pick = r;
            break;
          }
        }
      }
      // Nếu không có preSelect nhưng chỉ có 1 race → chọn sẵn cho UX.
      pick ??= bettable.isNotEmpty ? bettable.first : null;
      if (pick != null) {
        await _onRaceChanged(pick);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadingRaces = false;
        _racesError = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  RaceSummary? _findRaceInArgs(PlaceBetArgs args) {
    if (args.availableRaces == null) return null;
    for (final r in args.availableRaces!) {
      if (r.raceId == args.raceId) return r;
    }
    return null;
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  bool get _needsSecondPick => _betType == 'QUINELLA' || _betType == 'EXACTA';

  Future<void> _loadRaceDetail(int raceId) async {
    setState(() {
      _loadingRaceDetail = true;
      _raceDetailError = null;
      _raceDetail = null;
      _pick1 = null;
      _pick2 = null;
      _aiLoading = false;
    });
    try {
      final detail = await _tournamentsService.getRaceDetail(raceId);
      if (!mounted) return;
      setState(() {
        _raceDetail = detail;
        _pick1 = detail.entries.isNotEmpty ? detail.entries.first : null;
        _loadingRaceDetail = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _raceDetailError = e.toString().replaceFirst('Exception: ', '');
        _loadingRaceDetail = false;
      });
    }
  }

  Future<void> _onRaceChanged(RaceSummary? race) async {
    if (race == null) return;
    setState(() {
      _selectedRace = race;
      _aiLoading = false;
    });
    await _loadRaceDetail(race.raceId);
  }

  Future<void> _openAiSheet() async {
    final raceId = _selectedRace?.raceId ?? widget.args?.raceId;
    if (raceId == null) {
      _showError('Vui lòng chọn chặng đua trước');
      return;
    }
    // Hỏi xác nhận trước khi trừ điểm. Nếu user bấm "Huỷ" thì không mở sheet,
    // không gọi API, không tốn 15 điểm.
    final confirmed = await _confirmAiCharge();
    if (!mounted || confirmed != true) return;

    // Sheet tự quản lý state (loading/result/error) và tự gọi API trong
    // initState. Parent setState không rebuild được modal route — đó là lý do
    // trước đây sheet kẹt spinner. Cách này: _AiSuggestionSheet là
    // StatefulWidget với state nội bộ, không phụ thuộc parent.
    setState(() => _aiLoading = true);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _AiSuggestionSheet(
        raceId: raceId,
        api: widget.api,
      ),
    );
    if (mounted) setState(() => _aiLoading = false);
  }

  /// Dialog xác nhận trước khi gọi API AI — mỗi lần xem tốn [15] điểm.
  /// Trả về `true` nếu user bấm "Xem", `false`/`null` nếu huỷ.
  Future<bool?> _confirmAiCharge() {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.auto_awesome, color: AppColors.green, size: 22),
            const SizedBox(width: 8),
            const Text('Xem gợi ý AI'),
          ],
        ),
        content: const Text(
          'Bạn có muốn xem gợi ý từ AI không?\n\n'
          'Mỗi lần xem sẽ mất 15 điểm trong ví. '
          'Chỉ hiển thị tỉ lệ thắng tham khảo.',
          style: TextStyle(height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.green,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Xem'),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final raceId = _selectedRace?.raceId;
    if (raceId == null) {
      _showError('Vui lòng chọn chặng đua');
      return;
    }
    final pick1 = _pick1;
    if (pick1 == null) {
      _showError('Vui lòng chọn ngựa #1');
      return;
    }
    if (pick1.oddsFinal == null) {
      _showError(
        'Ngựa "${pick1.displayLabel}" chưa có odds. Vui lòng đợi hệ thống tính '
        'odds hoặc bấm "Tải lại" để cập nhật.',
      );
      return;
    }
    final entryIds = <int>[pick1.entryId];
    if (_needsSecondPick) {
      final pick2 = _pick2;
      if (pick2 == null) {
        _showError('Vui lòng chọn ngựa #2');
        return;
      }
      if (pick2.entryId == pick1.entryId) {
        _showError('QUINELLA/EXACTA cần chọn 2 ngựa khác nhau');
        return;
      }
      if (pick2.oddsFinal == null) {
        _showError(
          'Ngựa "${pick2.displayLabel}" chưa có odds. Vui lòng đợi hệ thống '
          'tính odds hoặc bấm "Tải lại" để cập nhật.',
        );
        return;
      }
      entryIds.add(pick2.entryId);
    }

    setState(() => _submitting = true);
    try {
      final prediction = await widget.api.placeBet(
        raceId: raceId,
        betType: _betType!,
        entryIds: entryIds,
        betAmount: int.parse(_amountController.text),
      );
      if (!mounted) return;
      Navigator.of(context).pop<PlaceBetResult>(
        PlaceBetResult(success: true, prediction: prediction),
      );
    } catch (e) {
      if (!mounted) return;
      _showError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.errorText,
        duration: const Duration(seconds: 5),
        action: SnackBarAction(
          label: 'Tải lại',
          textColor: Colors.white,
          onPressed: () {
            final id = _selectedRace?.raceId ?? widget.args?.raceId;
            if (id != null) _loadRaceDetail(id);
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final args = widget.args;

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7F5),
      appBar: AppBar(
        title: const Text('Đặt cược'),
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                if (args?.raceName != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      args!.raceName!,
                      style: const TextStyle(
                        color: AppColors.heading,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                _buildOddsNotReadyBanner(),
                _buildTournamentDropdown(),
                const SizedBox(height: 16),
                _buildRaceDropdown(),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: _betType,
                  decoration: const InputDecoration(
                    labelText: 'Loại cược',
                    prefixIcon: Icon(Icons.casino_outlined),
                  ),
                  items: _betTypes
                      .map(
                        (e) => DropdownMenuItem(
                          value: e,
                          child: Text(_betTypeLabel(e)),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _betType = v),
                ),
                const SizedBox(height: 12),
                _buildAiSuggestionButton(),
                const SizedBox(height: 16),
                _buildHorsePicker(
                  label: _needsSecondPick ? 'Ngựa #1' : 'Chọn ngựa',
                  value: _pick1,
                  excludeEntryId: null,
                  onChanged: (e) => setState(() => _pick1 = e),
                ),
                if (_needsSecondPick) ...[
                  const SizedBox(height: 16),
                  _buildHorsePicker(
                    label: 'Ngựa #2',
                    value: _pick2,
                    excludeEntryId: _pick1?.entryId,
                    onChanged: (e) => setState(() => _pick2 = e),
                  ),
                ],
                const SizedBox(height: 16),
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Số điểm cược',
                    hintText: 'Tối thiểu 10 điểm, tối đa 50% số dư',
                    prefixIcon: Icon(Icons.tag_outlined),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return 'Vui lòng nhập số điểm';
                    }
                    final n = int.tryParse(v.trim());
                    if (n == null || n <= 0) return 'Số điểm phải là số nguyên dương';
                    if (n < 10) return 'Tối thiểu 10 điểm';
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                SizedBox(
                  height: 50,
                  child: ElevatedButton.icon(
                    onPressed: _submitting ? null : _submit,
                    icon: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.check_circle_outline),
                    label: Text(
                      _submitting ? 'Đang đặt cược...' : 'Xác nhận đặt cược',
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.green,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOddsNotReadyBanner() {
    final detail = _raceDetail;
    if (detail == null) return const SizedBox.shrink();
    final hasAnyOdds = detail.entries.any((e) => e.oddsFinal != null);
    if (hasAnyOdds) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          border: Border.all(color: const Color(0xFFFDE68A)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.hourglass_top, color: Color(0xFF854D0E), size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Hệ thống chưa tính odds cho chặng đua này. Bấm "Tải lại" sau vài giây để cập nhật.',
                style: TextStyle(
                  color: const Color(0xFF713F12).withValues(alpha: 0.95),
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ),
            TextButton(
              onPressed: () {
                final id = _selectedRace?.raceId ?? widget.args?.raceId;
                if (id != null) _loadRaceDetail(id);
              },
              child: const Text('Tải lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTournamentDropdown() {
    if (_loadingTournaments) {
      return InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Giải đấu',
          prefixIcon: Icon(Icons.emoji_events_outlined),
        ),
        child: Row(
          children: const [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 10),
            Text('Đang tải danh sách giải đấu...',
                style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
          ],
        ),
      );
    }
    if (_tournamentsError != null) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: 'Giải đấu',
          prefixIcon: const Icon(Icons.emoji_events_outlined,
              color: AppColors.errorText),
          errorText: _tournamentsError,
        ),
        child: TextButton(
          onPressed: _loadTournaments,
          child: const Text('Tải lại'),
        ),
      );
    }
    if (_tournaments.isEmpty) {
      return InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Giải đấu',
          prefixIcon: Icon(Icons.emoji_events_outlined),
        ),
        child: TextButton(
          onPressed: _loadTournaments,
          child: const Text('Tải lại danh sách giải đấu'),
        ),
      );
    }
    return DropdownButtonFormField<PublicTournament>(
      initialValue: _selectedTournament,
      isExpanded: true,
      decoration: const InputDecoration(
        labelText: 'Giải đấu',
        prefixIcon: Icon(Icons.emoji_events_outlined),
      ),
      items: _tournaments
          .map(
            (t) => DropdownMenuItem<PublicTournament>(
              value: t,
              child: Text(
                t.name ?? 'Giải đấu #${t.tournamentId}',
              ),
            ),
          )
          .toList(),
      onChanged: (t) => _onTournamentChanged(t),
      validator: (v) => v == null ? 'Vui lòng chọn giải đấu' : null,
    );
  }

  Widget _buildRaceDropdown() {
    if (_selectedTournament == null) {
      return InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Chặng đua',
          prefixIcon: Icon(Icons.sports_score_outlined),
        ),
        child: const Text(
          'Vui lòng chọn giải đấu trước',
          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
        ),
      );
    }
    if (_loadingRaces) {
      return InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Chặng đua (SCHEDULED)',
          prefixIcon: Icon(Icons.sports_score_outlined),
        ),
        child: Row(
          children: const [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 10),
            Text('Đang tải danh sách chặng đua...',
                style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
          ],
        ),
      );
    }
    if (_racesError != null) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: 'Chặng đua',
          prefixIcon: const Icon(Icons.sports_score_outlined,
              color: AppColors.errorText),
          errorText: _racesError,
        ),
        child: TextButton(
          onPressed: () =>
              _onTournamentChanged(_selectedTournament),
          child: const Text('Tải lại'),
        ),
      );
    }
    final races = _bettableRacesInTournament;
    if (races.isEmpty) {
      return InputDecorator(
        decoration: const InputDecoration(
          labelText: 'Chặng đua',
          prefixIcon: Icon(Icons.sports_score_outlined),
          helperText:
              'Giải đấu này hiện chưa có chặng SCHEDULED nào để đặt cược.',
        ),
        child: const SizedBox.shrink(),
      );
    }
    return DropdownButtonFormField<RaceSummary>(
      initialValue: _selectedRace,
      isExpanded: true,
      decoration: const InputDecoration(
        labelText: 'Chặng đua',
        prefixIcon: Icon(Icons.sports_score_outlined),
      ),
      items: races
          .map(
            (r) => DropdownMenuItem<RaceSummary>(
              value: r,
              child: Text(
                '${r.name} · ${raceStatusLabelVi(r.status)}',
              ),
            ),
          )
          .toList(),
      onChanged: _onRaceChanged,
      validator: (v) => v == null ? 'Vui lòng chọn chặng đua' : null,
    );
  }

  Widget _buildHorsePicker({
    required String label,
    required RaceEntryDetail? value,
    required int? excludeEntryId,
    required ValueChanged<RaceEntryDetail?> onChanged,
  }) {
    if (_loadingRaceDetail) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.pets_outlined),
        ),
        child: Row(
          children: const [
            SizedBox(
              width: 14,
              height: 14,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 10),
            Text(
              'Đang tải danh sách ngựa...',
              style: TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ],
        ),
      );
    }
    if (_raceDetailError != null) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.pets_outlined, color: AppColors.errorText),
          errorText: _raceDetailError,
        ),
        child: TextButton(
          onPressed: () {
            final id = _selectedRace?.raceId ?? widget.args?.raceId;
            if (id != null) _loadRaceDetail(id);
          },
          child: const Text('Tải lại'),
        ),
      );
    }
    final entries = (_raceDetail?.entries ?? const <RaceEntryDetail>[])
        .where((e) => e.entryId != excludeEntryId)
        .toList();
    if (entries.isEmpty) {
      return InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.pets_outlined),
          errorText: _raceDetail == null
              ? 'Chưa chọn chặng đua'
              : 'Chặng này chưa có ngựa APPROVED',
        ),
        child: const SizedBox.shrink(),
      );
    }
    if (value != null && !entries.any((e) => e.entryId == value.entryId)) {
      // Picker hiện tại không còn hợp lệ (vd đổi loại cược) → reset.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) onChanged(null);
      });
    }
    return DropdownButtonFormField<RaceEntryDetail>(
      initialValue: (value != null && entries.any((e) => e.entryId == value.entryId))
          ? value
          : null,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.pets_outlined),
      ),
      items: entries
          .map(
            (e) => DropdownMenuItem<RaceEntryDetail>(
              value: e,
              child: Text(
                e.oddsLabel != null
                    ? '${e.displayLabel}  ·  Odds ${e.oddsLabel}'
                    : '${e.displayLabel}  ·  Chưa có odds',
                style: e.oddsFinal == null
                    ? const TextStyle(
                        color: AppColors.textMuted,
                        fontStyle: FontStyle.italic,
                      )
                    : null,
              ),
            ),
          )
          .toList(),
      onChanged: onChanged,
      validator: (v) {
        if (v == null) return 'Vui lòng chọn ngựa';
        if (v.oddsFinal == null) {
          return 'Ngựa này chưa có odds — hãy đợi hoặc chọn ngựa khác';
        }
        return null;
      },
    );
  }

  String _betTypeLabel(String code) {
    switch (code) {
      case 'WIN':
        return 'WIN — Thắng (chọn 1 ngựa)';
      case 'PLACE':
        return 'PLACE — Về nhì (chọn 1 ngựa)';
      case 'SHOW':
        return 'SHOW — Về ba (chọn 1 ngựa)';
      case 'QUINELLA':
        return 'QUINELLA — Hai ngựa về nhất–nhì (không cần thứ tự)';
      case 'EXACTA':
        return 'EXACTA — Hai ngựa về nhất–nhì (đúng thứ tự)';
      default:
        return code;
    }
  }

  Widget _buildAiSuggestionButton() {
    final raceId = _selectedRace?.raceId ?? widget.args?.raceId;
    final enabled = raceId != null && !_aiLoading;
    return Align(
      alignment: Alignment.centerLeft,
      child: TextButton.icon(
        onPressed: enabled ? _openAiSheet : null,
        icon: _aiLoading
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.auto_awesome, size: 18),
        label: const Text('Gợi ý AI'),
        style: TextButton.styleFrom(
          foregroundColor: AppColors.green,
        ),
      ),
    );
  }
}

/// Bottom sheet hiển thị gợi ý AI cho spectator — chỉ winProbability, không odds.
///
/// Tự quản lý state (loading/result/error) và tự gọi API trong `initState`.
/// Trước đây sheet là route độc lập nên setState của parent không rebuild nó —
/// dẫn đến kẹt loading spinner. Cách này giải quyết bằng cách để sheet là
/// StatefulWidget với state nội bộ.
class _AiSuggestionSheet extends StatefulWidget {
  const _AiSuggestionSheet({
    required this.raceId,
    required this.api,
  });

  final int raceId;
  final SpectatorApi api;

  @override
  State<_AiSuggestionSheet> createState() => _AiSuggestionSheetState();
}

class _AiSuggestionSheetState extends State<_AiSuggestionSheet> {
  AiSuggestionResult? _result;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Tự gọi API khi sheet mở — không phụ thuộc parent state.
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetch());
  }

  Future<void> _fetch() async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await widget.api.viewAiSuggestion(widget.raceId);
      if (!mounted) return;
      setState(() {
        _result = result;
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
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, color: AppColors.green, size: 22),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Gợi ý từ AI',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppColors.heading,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _error!,
                      style: const TextStyle(color: AppColors.errorText),
                    ),
                    const SizedBox(height: 8),
                    TextButton(onPressed: _fetch, child: const Text('Thử lại')),
                  ],
                ),
              )
            else if (_result != null) ...[
              Text(
                _result!.raceName,
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.45,
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _result!.predictions.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final p = _result!.predictions[i];
                    final pct = p.winProbability;
                    final highlight = i == 0;
                    return Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: highlight
                            ? const Color(0xFFE8F5E9)
                            : const Color(0xFFF5F5F5),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: highlight
                              ? AppColors.green.withValues(alpha: 0.4)
                              : const Color(0xFFE0E0E0),
                        ),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: highlight
                                ? AppColors.green
                                : AppColors.textMuted,
                            foregroundColor: Colors.white,
                            child: Text(
                              '#${p.rank}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              p.horseName,
                              style: TextStyle(
                                fontWeight: highlight
                                    ? FontWeight.w600
                                    : FontWeight.w500,
                                color: AppColors.heading,
                              ),
                            ),
                          ),
                          Text(
                            '${pct.toStringAsFixed(2)}%',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: highlight
                                  ? AppColors.green
                                  : AppColors.heading,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Số dư ví sau khi trừ phí: ${_result!.walletBalance} điểm',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}