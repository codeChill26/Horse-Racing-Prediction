import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/admin_race.dart';
import 'token_storage.dart';

class AdminRacesService {
  Future<Map<String, String>> _headers() async {
    final token = await TokenStorage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>?> _decodeBody(http.Response res) async {
    try {
      return jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  void _throwIfFailed(http.Response res, Map<String, dynamic>? data, String fallback) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    final msg = data?['error'] ?? data?['message'] ?? '$fallback (${res.statusCode})';
    throw Exception(msg.toString());
  }

  AdminRace _parseRace(Map<String, dynamic>? data, {String fallbackMessage = 'Phản hồi không hợp lệ'}) {
    final race = data?['race'];
    if (race is! Map<String, dynamic>) {
      throw Exception(fallbackMessage);
    }
    return AdminRace.fromJson(race);
  }

  /// GET /api/admin/tournaments/{tournamentId}/races
  Future<List<AdminRace>> listRacesByTournament(int tournamentId) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/tournaments/$tournamentId/races'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách cuộc đua');

    final races = data?['races'];
    if (races is! List) return [];
    return races
        .whereType<Map<String, dynamic>>()
        .map(AdminRace.fromJson)
        .toList();
  }

  /// GET /api/admin/races/{id}
  Future<AdminRace> getRace(int raceId) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/races/$raceId'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được chi tiết cuộc đua');
    return _parseRace(data, fallbackMessage: 'Phản hồi không có dữ liệu cuộc đua');
  }

  /// POST /api/admin/tournaments/{tournamentId}/races
  Future<AdminRace> createRace(int tournamentId, Map<String, dynamic> payload) async {
    final res = await http.post(
      ApiConfig.uri('/api/admin/tournaments/$tournamentId/races'),
      headers: await _headers(),
      body: jsonEncode(payload),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Tạo cuộc đua thất bại');
    return _parseRace(data, fallbackMessage: 'Phản hồi không có dữ liệu cuộc đua');
  }

  /// PATCH /api/admin/races/{id}
  Future<AdminRace> updateRace(int raceId, Map<String, dynamic> payload) async {
    final res = await http.patch(
      ApiConfig.uri('/api/admin/races/$raceId'),
      headers: await _headers(),
      body: jsonEncode(payload),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Cập nhật cuộc đua thất bại');
    return _parseRace(data, fallbackMessage: 'Phản hồi không có dữ liệu cuộc đua');
  }

  /// DELETE /api/admin/races/{id}
  Future<void> deleteRace(int raceId) async {
    final res = await http.delete(
      ApiConfig.uri('/api/admin/races/$raceId'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Xóa cuộc đua thất bại');
  }

  /// GET /api/admin/races/{id}/entries?status=...
  Future<EntriesResponse> listEntries(int raceId, {String? status}) async {
    final normalized = status?.trim().toUpperCase();
    final qs = (normalized == null || normalized.isEmpty || normalized == 'ALL')
        ? ''
        : '?status=${Uri.encodeComponent(normalized)}';
    final res = await http.get(
      ApiConfig.uri('/api/admin/races/$raceId/entries$qs'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách entry');

    if (data == null) {
      return EntriesResponse(
        raceId: raceId,
        entries: const [],
      );
    }
    // Some backend responses may include `raceId` at top level when filter applied.
    if (data['race'] is! Map<String, dynamic> &&
        (data['raceId'] != null || data['raceName'] != null)) {
      data['race'] = {
        'raceId': data['raceId'] ?? raceId,
        'name': data['raceName'],
        'maxEntries': data['maxEntries'],
      };
    }
    return EntriesResponse.fromJson(data);
  }

  /// POST /api/admin/races/{id}/bulk-review
  Future<BulkReviewSummary> bulkReviewEntries(
    int raceId,
    List<Map<String, dynamic>> entries,
  ) async {
    final res = await http.post(
      ApiConfig.uri('/api/admin/races/$raceId/bulk-review'),
      headers: await _headers(),
      body: jsonEncode({'entries': entries}),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Duyệt entry hàng loạt thất bại');

    final summary = data?['summary'];
    return BulkReviewSummary.fromJson(summary is Map<String, dynamic>
        ? summary
        : (data is Map<String, dynamic> ? data : null));
  }

  /// PUT /api/admin/races/{id}/registration-gate
  Future<AdminRace> setRegistrationGate(int raceId, bool isOpen) async {
    final res = await http.put(
      ApiConfig.uri('/api/admin/races/$raceId/registration-gate'),
      headers: await _headers(),
      body: jsonEncode({'isOpen': isOpen}),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Đổi trạng thái cổng đăng ký thất bại');
    return _parseRace(data, fallbackMessage: 'Phản hồi không có dữ liệu cuộc đua');
  }

  /// POST /api/admin/races/{id}/publish
  Future<Map<String, dynamic>> publishRace(int raceId) async {
    final res = await http.post(
      ApiConfig.uri('/api/admin/races/$raceId/publish'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Công bố kết quả thất bại');
    return data ?? const <String, dynamic>{};
  }

  /// POST /api/admin/races/{id}/unpublish
  Future<Map<String, dynamic>> unpublishRace(int raceId) async {
    final res = await http.post(
      ApiConfig.uri('/api/admin/races/$raceId/unpublish'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Hủy công bố thất bại');
    return data ?? const <String, dynamic>{};
  }

  /// GET /api/admin/users/referees — fetch referees an admin can assign.
  /// Backend không hỗ trợ filter `availableFor=raceId`, nên trả tất cả trọng tài
  /// active và để UI tự lọc trọng tài đã bận từ cache _referees/_assigned.
  Future<List<RefereeOption>> listAvailableReferees({int? raceId}) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/users/referees'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách trọng tài');

    final raw = data?['referees'];
    if (raw is! List) return [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(RefereeOption.fromJson)
        .toList();
  }

  /// POST /api/admin/races/{id}/assign-referees
  /// Body theo backend hiện tại: `{ "refereeAId": ..., "refereeBId": ... }`.
  /// Response backend chỉ trả về `{ success, message, data: <Race row> }` — không có
  /// thông tin referee dạng name/email nên caller PHẢI truyền kèm [referees] để
  /// dựng lại `RefereeAssignment` (name/email) cho UI.
  /// RaceId cũng được map lại từ argument.
  Future<List<RefereeAssignment>> assignReferees(
    int raceId,
    List<int> userIds, {
    List<RefereeOption>? referees,
  }) async {
    final sorted = List<int>.from(userIds)..sort();
    if (sorted.length != 2) {
      throw Exception('Cần chọn đúng 2 trọng tài khác nhau.');
    }
    final body = <String, dynamic>{
      'refereeAId': sorted[0],
      'refereeBId': sorted[1],
    };
    final res = await http.post(
      ApiConfig.uri('/api/admin/races/$raceId/assign-referees'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Phân công trọng tài thất bại');

    final lookup = <int, RefereeOption>{};
    if (referees != null) {
      for (final r in referees) {
        lookup[r.userId] = r;
      }
    }
    return sorted.map((id) {
      final r = lookup[id];
      return RefereeAssignment(
        raceId: raceId,
        refereeId: id,
        refereeName: r?.fullName,
        refereeEmail: r?.email,
        assignedAt: DateTime.now(),
      );
    }).toList();
  }

  /// Lấy danh sách trọng tài đang được phân công cho race bằng cách đọc
  /// `refereeAId`/`refereeBId` từ GET /api/admin/races/{id}, sau đó map sang
  /// `RefereeAssignment` dựa trên cache referee truyền vào.
  /// Caller phải đảm bảo `refereesCache` đã được load trước (vd qua
  /// `listAvailableReferees`) để có thể tra name/email; nếu thiếu, trả
  /// stub chỉ chứa userId.
  Future<List<RefereeAssignment>> listAssignedReferees(
    int raceId, {
    List<RefereeOption>? refereesCache,
  }) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/races/$raceId'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được chi tiết cuộc đua');

    final race = data?['race'];
    if (race is! Map<String, dynamic>) return [];

    final lookup = <int, RefereeOption>{};
    if (refereesCache != null) {
      for (final r in refereesCache) {
        lookup[r.userId] = r;
      }
    }

    final ids = <int>[];
    final a = race['refereeAId'];
    if (a is int) {
      ids.add(a);
    } else if (a != null) {
      final parsed = int.tryParse(a.toString());
      if (parsed != null) ids.add(parsed);
    }
    final b = race['refereeBId'];
    if (b is int) {
      ids.add(b);
    } else if (b != null) {
      final parsed = int.tryParse(b.toString());
      if (parsed != null) ids.add(parsed);
    }

    return ids.map((id) {
      final r = lookup[id];
      return RefereeAssignment(
        raceId: raceId,
        refereeId: id,
        refereeName: r?.fullName,
        refereeEmail: r?.email,
      );
    }).toList();
  }

  /// GET /api/admin/races/{id}/review-conflict
  Future<ConflictResponse> reviewConflict(int raceId) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/races/$raceId/review-conflict'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được kết quả trọng tài');

    if (data == null) {
      return ConflictResponse(raceId: raceId);
    }
    if (data['race'] is! Map<String, dynamic> &&
        (data['raceId'] != null || data['raceName'] != null)) {
      data['race'] = {
        'raceId': data['raceId'] ?? raceId,
        'name': data['raceName'],
      };
    }
    return ConflictResponse.fromJson(data);
  }

  /// POST /api/admin/races/{id}/resolve-conflict
  Future<ResolveConflictResult> resolveConflict(
    int raceId, {
    required List<Map<String, dynamic>> rankings,
    required String reason,
  }) async {
    final res = await http.post(
      ApiConfig.uri('/api/admin/races/$raceId/resolve-conflict'),
      headers: await _headers(),
      body: jsonEncode({
        'rankings': rankings,
        'reason': reason,
      }),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Giải quyết tranh chấp thất bại');

    if (data == null) {
      return ResolveConflictResult(raceId: raceId, status: 'PENDING_RESULT');
    }
    return ResolveConflictResult.fromJson(data);
  }

  /// GET /api/admin/races — list all races (optionally filter by status/tournament)
  Future<AdminRacesListResponse> listRaces({
    String? status,
    int? tournamentId,
    int page = 1,
    int pageSize = 20,
  }) async {
    final params = <String, String>{};
    if (status != null && status.isNotEmpty && status != 'ALL') {
      params['status'] = status;
    }
    if (tournamentId != null) {
      params['tournamentId'] = tournamentId.toString();
    }
    params['page'] = page.toString();
    params['pageSize'] = pageSize.toString();

    final qs = params.isEmpty ? '' : '?${Uri(queryParameters: params)}';
    final res = await http.get(
      ApiConfig.uri('/api/admin/races$qs'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách cuộc đua');

    if (data == null) {
      return AdminRacesListResponse();
    }
    return AdminRacesListResponse.fromJson(data);
  }

  /// GET /api/admin/races/{id}/ai-odds — get AI odds suggestions
  Future<AiOddsResponse> getAiOdds(int raceId) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/races/$raceId/ai-odds'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được gợi ý odds từ AI');

    if (data == null) {
      return AiOddsResponse(raceId: raceId);
    }
    return AiOddsResponse.fromJson(data);
  }

  /// GET /api/admin/races/{id}/risk-score?treasury=... — get AI risk assessment
  Future<RiskScoreResponse> getRiskScore(int raceId, {double? treasury}) async {
    final qs = treasury != null ? '?treasury=$treasury' : '';
    final res = await http.get(
      ApiConfig.uri('/api/admin/races/$raceId/risk-score$qs'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được đánh giá rủi ro');

    if (data == null) {
      return RiskScoreResponse(raceId: raceId);
    }
    return RiskScoreResponse.fromJson(data);
  }
}
