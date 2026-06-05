import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/admin_tournament.dart';
import 'token_storage.dart';

class AdminTournamentsService {
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

  AdminTournament _parseTournament(Map<String, dynamic>? data) {
    final tournament = data?['tournament'];
    if (tournament is! Map<String, dynamic>) {
      throw Exception('Phản hồi không có dữ liệu giải đấu');
    }
    return AdminTournament.fromJson(tournament);
  }

  Future<List<AdminTournament>> listTournaments({String? status}) async {
    final qs = status != null && status.isNotEmpty
        ? '?status=${Uri.encodeComponent(status)}'
        : '';
    final res = await http.get(
      ApiConfig.uri('/api/admin/tournaments$qs'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách giải đấu');

    final tournaments = data?['tournaments'];
    if (tournaments is! List) return [];
    return tournaments
        .whereType<Map<String, dynamic>>()
        .map(AdminTournament.fromJson)
        .toList();
  }

  Future<AdminTournament> getTournamentById(int tournamentId) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/tournaments/$tournamentId'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được giải đấu');
    return _parseTournament(data);
  }

  Future<AdminTournament> createTournament(Map<String, dynamic> payload) async {
    final res = await http.post(
      ApiConfig.uri('/api/admin/tournaments'),
      headers: await _headers(),
      body: jsonEncode(payload),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Tạo giải đấu thất bại');
    return _parseTournament(data);
  }

  Future<AdminTournament> updateTournament(
    int tournamentId,
    Map<String, dynamic> payload,
  ) async {
    final res = await http.patch(
      ApiConfig.uri('/api/admin/tournaments/$tournamentId'),
      headers: await _headers(),
      body: jsonEncode(payload),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Cập nhật giải đấu thất bại');
    return _parseTournament(data);
  }

  Future<AdminTournament> changeStatus(
    int tournamentId, {
    required String status,
    String? cancelReason,
  }) async {
    final body = <String, dynamic>{'status': status};
    if (cancelReason != null && cancelReason.isNotEmpty) {
      body['cancelReason'] = cancelReason;
    }
    final res = await http.patch(
      ApiConfig.uri('/api/admin/tournaments/$tournamentId/status'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Đổi trạng thái thất bại');
    return _parseTournament(data);
  }

  /// Trả về `deleted: true` nếu xóa hẳn; ngược lại trả tournament đã hủy.
  Future<({bool deleted, AdminTournament? tournament})> deleteTournament(
    int tournamentId, {
    String? reason,
  }) async {
    final body = reason != null && reason.isNotEmpty ? jsonEncode({'reason': reason}) : null;
    final res = await http.delete(
      ApiConfig.uri('/api/admin/tournaments/$tournamentId'),
      headers: await _headers(),
      body: body,
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Xóa giải đấu thất bại');

    final tournament = data?['tournament'];
    if (tournament is Map<String, dynamic>) {
      return (deleted: false, tournament: AdminTournament.fromJson(tournament));
    }
    return (deleted: true, tournament: null);
  }
}
