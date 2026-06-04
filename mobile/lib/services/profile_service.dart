import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/user_profile.dart';
import 'token_storage.dart';

class ProfileService {
  Future<UserProfile> getMyProfile() async {
    final token = await TokenStorage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }

    final res = await http.get(
      ApiConfig.uri('/api/auth/profile'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      data = null;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      final msg =
          data?['error'] ?? data?['message'] ?? 'Không tải được hồ sơ (${res.statusCode})';
      throw Exception(msg.toString());
    }

    final user = data?['user'];
    if (user is! Map<String, dynamic>) {
      throw Exception('Phản hồi không có dữ liệu người dùng');
    }

    return UserProfile.fromJson(user);
  }
}
