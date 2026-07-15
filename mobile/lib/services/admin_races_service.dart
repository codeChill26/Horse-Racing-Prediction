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

  /// GET /api/admin/referees?availableFor={raceId} — fetch referees an admin can assign.
  Future<List<RefereeOption>> listAvailableReferees({int? raceId}) async {
    final qs = raceId != null ? '?availableFor=$raceId' : '';
    final res = await http.get(
      ApiConfig.uri('/api/admin/referees$qs'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách trọng tài');

    final raw = data?['referees'] ?? data?['users'] ?? data?['availableReferees'];
    if (raw is! List) return [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(RefereeOption.fromJson)
        .toList();
  }

  /// GET /api/admin/races/{id}/referees — list currently assigned referees.
  Future<List<RefereeAssignment>> listAssignedReferees(int raceId) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/races/$raceId/referees'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được trọng tài được phân công');

    final raw = data?['referees'] ?? data?['assignments'];
    if (raw is! List) return [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(RefereeAssignment.fromJson)
        .toList();
  }

  /// POST /api/admin/races/{id}/assign-referees
  /// Body theo backend hiện tại: `{ "refereeAId": ..., "refereeBId": ... }`.
  Future<List<RefereeAssignment>> assignReferees(
    int raceId,
    List<int> userIds,
  ) async {
    final sorted = List<int>.from(userIds)..sort();
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

    final raw = data?['referees'] ?? data?['assignments'];
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(RefereeAssignment.fromJson)
          .toList();
    }

    // Fallback: refetch danh sách referee đã assign cho race đó
    try {
      return await listAssignedReferees(raceId);
    } catch (_) {
      return userIds
          .map(
            (id) => RefereeAssignment(raceId: raceId, refereeId: id),
          )
          .toList();
    }
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
