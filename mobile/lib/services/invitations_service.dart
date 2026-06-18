import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/jockey_invitation.dart';
import '../models/jockey_profile.dart';
import 'token_storage.dart';

class InvitationsService {
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

  Future<List<JockeyProfile>> searchJockeys({String? name}) async {
    final query = name != null && name.trim().isNotEmpty
        ? '?name=${Uri.encodeComponent(name.trim())}'
        : '';
    final res = await http.get(
      ApiConfig.uri('/api/invitations/jockeys$query'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tìm được kỵ sĩ');

    final jockeys = data?['jockeys'];
    if (jockeys is! List) return [];
    return jockeys
        .whereType<Map<String, dynamic>>()
        .map(JockeyProfile.fromJson)
        .toList();
  }

  Future<List<JockeyInvitation>> listInvitations({String? status}) async {
    final query = status != null && status.isNotEmpty
        ? '?status=${Uri.encodeComponent(status)}'
        : '';
    final res = await http.get(
      ApiConfig.uri('/api/invitations$query'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được lời mời');

    final invitations = data?['invitations'];
    if (invitations is! List) return [];
    return invitations
        .whereType<Map<String, dynamic>>()
        .map(JockeyInvitation.fromJson)
        .toList();
  }

  Future<JockeyInvitation> sendInvitation({
    required int raceId,
    required int horseId,
    required int jockeyId,
  }) async {
    final res = await http.post(
      ApiConfig.uri('/api/invitations'),
      headers: await _headers(),
      body: jsonEncode({
        'raceId': raceId,
        'horseId': horseId,
        'jockeyId': jockeyId,
      }),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Gửi lời mời thất bại');

    final invitation = data?['invitation'];
    if (invitation is! Map<String, dynamic>) {
      throw Exception('Phản hồi không có dữ liệu lời mời');
    }
    return JockeyInvitation.fromJson(invitation);
  }

  Future<void> confirmJockey(int invitationId) async {
    final res = await http.post(
      ApiConfig.uri('/api/invitations/$invitationId/confirm'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Chốt kỵ sĩ thất bại');
  }

  Future<JockeyInvitation> respondInvitation({
    required int invitationId,
    required String status,
    String? declineReason,
  }) async {
    final body = <String, dynamic>{'status': status};
    if (status == 'DECLINED') {
      body['declineReason'] = declineReason?.trim() ?? '';
    }

    final res = await http.put(
      ApiConfig.uri('/api/invitations/$invitationId/respond'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Phản hồi lời mời thất bại');

    final invitation = data?['invitation'];
    if (invitation is! Map<String, dynamic>) {
      throw Exception('Phản hồi không có dữ liệu lời mời');
    }
    return JockeyInvitation.fromJson(invitation);
  }
}
