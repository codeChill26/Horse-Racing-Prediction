import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/referee_race.dart';
import 'token_storage.dart';

class RefereeService {
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

  /// POST /api/referee/races/{id}/start
  Future<Map<String, dynamic>> startRace(int raceId) async {
    final res = await http.post(
      ApiConfig.uri('/api/referee/races/$raceId/start'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không thể bắt đầu trận đấu');
    return data ?? const <String, dynamic>{};
  }

  /// POST /api/referee/races/{id}/submit
  Future<Map<String, dynamic>> submitResult(int raceId, List<Map<String, dynamic>> rawResults) async {
    final res = await http.post(
      ApiConfig.uri('/api/referee/races/$raceId/submit'),
      headers: await _headers(),
      body: jsonEncode({'rawResults': rawResults}),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Nộp kết quả thất bại');
    return data ?? const <String, dynamic>{};
  }

  /// GET /api/referee/me/races
  Future<List<RefereeRace>> listAssignedRaces({String? status, String? date}) async {
    final qs = <String>[];
    if (status != null && status.trim().isNotEmpty) {
      qs.add('status=${Uri.encodeComponent(status.trim())}');
    }
    if (date != null && date.trim().isNotEmpty) {
      qs.add('date=${Uri.encodeComponent(date.trim())}');
    }
    final path = '/api/referee/me/races${qs.isEmpty ? "" : "?${qs.join("&")}"}';
    final res = await http.get(
      ApiConfig.uri(path),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách trận đấu');

    final races = data?['races'];
    if (races is! List) return [];
    return races
        .whereType<Map<String, dynamic>>()
        .map(RefereeRace.fromJson)
        .toList();
  }

  /// GET /api/referee/me/races/{raceId}
  Future<RefereeRaceDetail> getRaceDetail(int raceId) async {
    final res = await http.get(
      ApiConfig.uri('/api/referee/me/races/$raceId'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được chi tiết trận đấu');

    if (data is! Map<String, dynamic>) {
      throw Exception('Phản hồi chi tiết trận đấu không hợp lệ');
    }
    return RefereeRaceDetail.fromJson(data);
  }

  /// GET /api/referee/me/submissions
  Future<List<RefereeSubmission>> listSubmissions() async {
    final res = await http.get(
      ApiConfig.uri('/api/referee/me/submissions'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được lịch sử nộp kết quả');

    final items = data?['submissions'];
    if (items is! List) return [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(RefereeSubmission.fromJson)
        .toList();
  }

  /// GET /api/referee/me/conflicts
  Future<List<RefereeConflict>> listConflicts() async {
    final res = await http.get(
      ApiConfig.uri('/api/referee/me/conflicts'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách tranh chấp');

    final items = data?['conflicts'];
    if (items is! List) return [];
    return items
        .whereType<Map<String, dynamic>>()
        .map(RefereeConflict.fromJson)
        .toList();
  }

  /// GET /api/referee/me/profile
  Future<RefereeProfile> getProfile() async {
    final res = await http.get(
      ApiConfig.uri('/api/referee/me/profile'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được profile trọng tài');

    if (data is! Map<String, dynamic>) {
      throw Exception('Phản hồi profile không hợp lệ');
    }
    return RefereeProfile.fromJson(data);
  }

  /// GET /api/referee/violations
  Future<List<Map<String, dynamic>>> listViolations() async {
    final res = await http.get(
      ApiConfig.uri('/api/referee/violations'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách vi phạm');

    final items = data?['violations'];
    if (items is! List) return [];
    return items
        .whereType<Map<String, dynamic>>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  /// POST /api/referee/violations
  Future<Map<String, dynamic>> reportViolation(Map<String, dynamic> payload) async {
    final res = await http.post(
      ApiConfig.uri('/api/referee/violations'),
      headers: await _headers(),
      body: jsonEncode(payload),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Báo cáo vi phạm thất bại');
    return data ?? const <String, dynamic>{};
  }

  Future<void> logout() async {
    final token = await TokenStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      try {
        final res = await http.post(
          ApiConfig.uri('/api/auth/logout'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({}),
        );
        if (res.statusCode < 200 || res.statusCode >= 300) {}
      } catch (_) {}
    }
    await TokenStorage.clear();
  }
}
