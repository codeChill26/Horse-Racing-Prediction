import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/owner_horse.dart';
import 'token_storage.dart';

class HorsesService {
  Future<Map<String, String>> _authHeaders() async {
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

  List<OwnerHorse> _parseHorseList(dynamic horses) {
    if (horses is! List) return [];
    return horses
        .whereType<Map<String, dynamic>>()
        .map(OwnerHorse.fromJson)
        .toList();
  }

  /// GET /api/horses — danh sách ngựa đã APPROVED (public).
  Future<List<OwnerHorse>> listApprovedHorses() async {
    final res = await http.get(ApiConfig.uri('/api/horses'));
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách ngựa công khai');
    return _parseHorseList(data?['horses']);
  }

  /// GET /api/horses/{id} — chi tiết ngựa công khai (chỉ APPROVED).
  Future<OwnerHorse> getHorseById(int horseId) async {
    final res = await http.get(ApiConfig.uri('/api/horses/$horseId'));
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được thông tin ngựa');
    final horse = data?['horse'];
    if (horse is! Map<String, dynamic>) {
      throw Exception('Dữ liệu ngựa không hợp lệ');
    }
    return OwnerHorse.fromJson(horse);
  }

  /// GET /api/horses/mine — ngựa của chủ đang đăng nhập.
  Future<List<OwnerHorse>> listMyHorses() async {
    final res = await http.get(
      ApiConfig.uri('/api/horses/mine'),
      headers: await _authHeaders(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách ngựa của bạn');
    return _parseHorseList(data?['horses']);
  }
}
