import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/admin_wallet.dart';
import '../models/wallet_transaction.dart';
import 'token_storage.dart';

/// Giao tiếp với nhóm Admin Wallet:
/// * POST /api/admin/wallets/:userId/adjust        — admin nạp/rút điểm
/// * GET  /api/admin/wallets/transactions         — xem tất cả giao dịch
/// * GET  /api/admin/wallets/:userId/transactions — xem giao dịch của 1 user
class AdminWalletsService {
  Future<Map<String, String>> _headers({bool needsBody = false}) async {
    final token = await TokenStorage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw Exception('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
    }
    return {
      if (needsBody) 'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<Map<String, dynamic>?> _decodeBody(http.Response res) async {
    if (res.body.isEmpty) return null;
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

  /// POST /api/admin/wallets/:userId/adjust
  ///
  /// [amount] dương = nạp, âm = rút. [reason] bắt buộc.
  Future<AdminAdjustResult> adjustBalance({
    required int userId,
    required int amount,
    required String reason,
  }) async {
    final res = await http.post(
      ApiConfig.uri('/api/admin/wallets/$userId/adjust'),
      headers: await _headers(needsBody: true),
      body: jsonEncode({
        'amount': amount,
        'reason': reason,
      }),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Điều chỉnh điểm thất bại');
    if (data == null) {
      throw Exception('Phản hồi điều chỉnh điểm không hợp lệ');
    }
    return AdminAdjustResult.fromJson(data);
  }

  /// GET /api/admin/wallets/transactions?page=&limit=
  Future<TransactionPage> getAllTransactions({
    int page = 1,
    int limit = 20,
  }) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/wallets/transactions?page=$page&limit=$limit'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được lịch sử giao dịch');
    return TransactionPage.fromJson(data);
  }

  /// GET /api/admin/wallets/:userId/transactions?page=&limit=
  Future<TransactionPage> getUserTransactions(
    int userId, {
    int page = 1,
    int limit = 20,
  }) async {
    final res = await http.get(
      ApiConfig.uri('/api/admin/wallets/$userId/transactions?page=$page&limit=$limit'),
      headers: await _headers(),
    );
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được lịch sử giao dịch của user');
    return TransactionPage.fromJson(data);
  }
}