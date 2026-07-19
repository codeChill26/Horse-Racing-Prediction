import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import 'realtime/notification_center.dart';
import 'realtime/socket_service.dart';
import 'token_storage.dart';

class LoginResult {
  LoginResult({
    required this.accessToken,
    this.refreshToken,
    this.role,
    this.email,
  });

  final String accessToken;
  final String? refreshToken;
  final String? role;
  final String? email;
}

class AuthService {
  Future<LoginResult> login({
    required String email,
    required String password,
  }) async {
    final res = await http.post(
      ApiConfig.uri('/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email.trim(), 'password': password}),
    );

    Map<String, dynamic>? data;
    try {
      data = jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      data = null;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      final msg = data?['error'] ?? data?['message'] ?? 'Đăng nhập thất bại (${res.statusCode})';
      throw Exception(msg.toString());
    }

    final accessToken = data?['accessToken'] as String?;
    if (accessToken == null || accessToken.isEmpty) {
      throw Exception('Phản hồi không có accessToken');
    }

    final refreshToken = data?['refreshToken'] as String?;
    await TokenStorage.saveTokens(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );

    final role = TokenStorage.parseRole(accessToken);
    final emailFromJwt = _parseEmail(accessToken) ?? email.trim();

    return LoginResult(
      accessToken: accessToken,
      refreshToken: refreshToken,
      role: role,
      email: emailFromJwt,
    );
  }

  String? _parseEmail(String token) {
    try {
      final parts = token.split('.');
      if (parts.length < 2) return null;
      final normalized = base64Url.normalize(parts[1]);
      final decoded = utf8.decode(base64Url.decode(normalized));
      final map = jsonDecode(decoded) as Map<String, dynamic>;
      return map['email']?.toString();
    } catch (_) {
      return null;
    }
  }

  Future<void> logout() async {
    final token = await TokenStorage.getAccessToken();
    if (token != null) {
      try {
        await http.post(
          ApiConfig.uri('/api/auth/logout'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({}),
        );
      } catch (_) {
        /* vẫn xóa token local */
      }
    }
    // Ngắt socket + reset notification trước khi xóa token.
    SocketService.instance.disconnect();
    NotificationCenter.instance.reset();
    await TokenStorage.clear();
  }
}
