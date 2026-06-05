import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/admin_user.dart';
import 'token_storage.dart';

class AdminUsersService {
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

  AdminUser _parseUser(Map<String, dynamic>? data) {
    final user = data?['user'];
    if (user is! Map<String, dynamic>) {
      throw Exception('Phản hồi không có dữ liệu người dùng');
    }
    return AdminUser.fromJson(user);
  }

  Future<List<AdminUser>> listUsers({String? roleCode}) async {
    final qs = roleCode != null && roleCode.isNotEmpty
        ? '?roleCode=${Uri.encodeComponent(roleCode)}'
        : '';
    final res = await http.get(
      ApiConfig.uri('/api/admin/users$qs'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách người dùng');

    final users = data?['users'];
    if (users is! List) return [];
    return users
        .whereType<Map<String, dynamic>>()
        .map(AdminUser.fromJson)
        .toList();
  }

  Future<AdminUser> getUserById(int userId) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/users/$userId'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được người dùng');
    return _parseUser(data);
  }

  Future<AdminUser> updateUser(int userId, Map<String, dynamic> payload) async {
    final res = await http.patch(
      ApiConfig.uri('/api/admin/users/$userId'),
      headers: await _headers(),
      body: jsonEncode(payload),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Cập nhật người dùng thất bại');
    return _parseUser(data);
  }

  Future<AdminUser> createUser(Map<String, dynamic> payload) async {
    final res = await http.post(
      ApiConfig.uri('/api/admin/users'),
      headers: await _headers(),
      body: jsonEncode(payload),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Tạo người dùng thất bại');
    return _parseUser(data);
  }

  Future<AdminUser> toggleActive(int userId) async {
    final res = await http.patch(
      ApiConfig.uri('/api/admin/users/$userId/toggle-active'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Đổi trạng thái thất bại');
    return _parseUser(data);
  }

  Future<AdminUser> changeRole(int userId, String roleCode) async {
    final res = await http.patch(
      ApiConfig.uri('/api/admin/users/$userId/role'),
      headers: await _headers(),
      body: jsonEncode({'roleCode': roleCode, 'confirm': true}),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Đổi vai trò thất bại');
    return _parseUser(data);
  }

  Future<AdminUser> deactivate(int userId) async {
    final res = await http.delete(
      ApiConfig.uri('/api/admin/users/$userId'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Vô hiệu hóa người dùng thất bại');
    return _parseUser(data);
  }
}
