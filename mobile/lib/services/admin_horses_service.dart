import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/owner_horse.dart';
import 'token_storage.dart';

class AdminHorsesService {
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

  OwnerHorse _parseHorse(Map<String, dynamic>? data) {
    final horse = data?['horse'];
    if (horse is! Map<String, dynamic>) {
      throw Exception('Phản hồi không có dữ liệu ngựa');
    }
    return OwnerHorse.fromJson(horse);
  }

  /// GET /api/admin/horses?status=PENDING|APPROVED|REJECTED|ALL
  Future<List<OwnerHorse>> listHorses({String? status}) async {
    final normalized = status?.trim().toUpperCase();
    final qs = normalized != null &&
            normalized.isNotEmpty &&
            normalized != 'ALL'
        ? '?status=${Uri.encodeComponent(normalized)}'
        : '';
    final res = await http.get(
      ApiConfig.uri('/api/admin/horses$qs'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách ngựa');

    final horses = data?['horses'];
    if (horses is! List) return [];
    return horses
        .whereType<Map<String, dynamic>>()
        .map(OwnerHorse.fromJson)
        .toList();
  }

  /// GET /api/admin/horses/{id}
  Future<OwnerHorse> getHorseById(int horseId) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/horses/$horseId'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được thông tin ngựa');
    return _parseHorse(data);
  }

  /// PATCH /api/admin/horses/{id}/status
  Future<OwnerHorse> reviewHorse(
    int horseId, {
    required String status,
    String? reason,
  }) async {
    final body = <String, dynamic>{'status': status};
    if (status == 'REJECTED' && reason != null && reason.trim().isNotEmpty) {
      body['reason'] = reason.trim();
    }

    final res = await http.patch(
      ApiConfig.uri('/api/admin/horses/$horseId/status'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Duyệt ngựa thất bại');
    return _parseHorse(data);
  }
}
