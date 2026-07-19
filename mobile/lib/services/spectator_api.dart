import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/prediction.dart';
import '../models/wallet_info.dart';
import '../models/wallet_transaction.dart';
import 'token_storage.dart';

class SpectatorApiException implements Exception {
  SpectatorApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() {
    if (statusCode == null) return message;
    return '$message (HTTP $statusCode)';
  }
}

/// Giao tiếp với backend cho 3 nhóm API của Spectator:
/// * Wallet  : GET /api/wallet, GET /api/wallet/transactions
/// * Predictions: GET / POST /api/predictions, GET / PUT :id/cancel
class SpectatorApi {
  Future<Map<String, String>> _headers({bool needsBody = false}) async {
    final token = await TokenStorage.getAccessToken();
    if (token == null || token.isEmpty) {
      throw SpectatorApiException(
        'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
        statusCode: 401,
      );
    }
    return {
      if (needsBody) 'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> _decode(http.Response res) async {
    if (res.body.isEmpty) return null;
    try {
      return jsonDecode(res.body);
    } catch (_) {
      return null;
    }
  }

  void _throwIfError(http.Response res, dynamic data, String fallback) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String message;
    if (data is Map<String, dynamic>) {
      message = data['error']?.toString() ??
          data['message']?.toString() ??
          '$fallback (${res.statusCode})';
    } else if (res.statusCode == 401) {
      message = 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
    } else {
      message = '$fallback (${res.statusCode})';
    }
    throw SpectatorApiException(message, statusCode: res.statusCode);
  }

  // ─────────────────────────── WALLET ───────────────────────────

  /// GET /api/wallet — Số dư ví điểm của tôi.
  Future<WalletInfo> getMyWallet() async {
    final res = await http.get(
      ApiConfig.uri('/api/wallet'),
      headers: await _headers(),
    );
    final data = await _decode(res);
    _throwIfError(res, data, 'Không tải được số dư ví');

    final wallet = data is Map<String, dynamic> ? data['wallet'] : null;
    if (wallet is! Map<String, dynamic>) {
      throw SpectatorApiException('Phản hồi ví không hợp lệ');
    }
    return WalletInfo.fromJson(wallet);
  }

  /// GET /api/wallet/transactions?page=…&limit=…
  Future<TransactionPage> getMyTransactions({int page = 1, int limit = 20}) async {
    final res = await http.get(
      ApiConfig.uri('/api/wallet/transactions?page=$page&limit=$limit'),
      headers: await _headers(),
    );
    final data = await _decode(res);
    _throwIfError(res, data, 'Không tải được lịch sử giao dịch');

    final map = data is Map<String, dynamic> ? data : <String, dynamic>{};
    return TransactionPage.fromJson(map);
  }

  // ───────────────────────── PREDICTIONS ────────────────────────

  /// GET /api/predictions — Lịch sử cược của tôi.
  Future<List<Prediction>> listMyPredictions() async {
    final res = await http.get(
      ApiConfig.uri('/api/predictions'),
      headers: await _headers(),
    );
    final data = await _decode(res);
    _throwIfError(res, data, 'Không tải được danh sách cược');

    final list = data is Map<String, dynamic> ? data['predictions'] : null;
    if (list is! List) return <Prediction>[];
    return list
        .whereType<Map<String, dynamic>>()
        .map(Prediction.fromJson)
        .toList();
  }

  /// GET /api/predictions/:id — Chi tiết 1 cược.
  Future<Prediction> getPredictionById(int predictionId) async {
    final res = await http.get(
      ApiConfig.uri('/api/predictions/$predictionId'),
      headers: await _headers(),
    );
    final data = await _decode(res);
    _throwIfError(res, data, 'Không tải được chi tiết cược');

    final map = data is Map<String, dynamic> ? data['prediction'] : null;
    if (map is! Map<String, dynamic>) {
      throw SpectatorApiException('Phản hồi chi tiết cược không hợp lệ');
    }
    return Prediction.fromJson(map);
  }

  /// POST /api/predictions — Đặt cược.
  ///
  /// [entryIds] nhận 1 phần tử (WIN/PLACE/SHOW) hoặc 2 phần tử (QUINELLA/EXACTA).
  Future<Prediction> placeBet({
    required int raceId,
    required String betType,
    required List<int> entryIds,
    required int betAmount,
  }) async {
    final res = await http.post(
      ApiConfig.uri('/api/predictions'),
      headers: await _headers(needsBody: true),
      body: jsonEncode({
        'raceId': raceId,
        'betType': betType,
        'entryIds': entryIds,
        'betAmount': betAmount,
      }),
    );
    final data = await _decode(res);
    _throwIfError(res, data, 'Đặt cược thất bại');

    final map = data is Map<String, dynamic> ? data['prediction'] : null;
    if (map is! Map<String, dynamic>) {
      throw SpectatorApiException('Phản hồi đặt cược không hợp lệ');
    }
    return Prediction.fromJson(map);
  }

  /// PUT /api/predictions/:id/cancel — Hủy cược (chỉ PENDING).
  Future<Prediction> cancelPrediction(int predictionId) async {
    final res = await http.put(
      ApiConfig.uri('/api/predictions/$predictionId/cancel'),
      headers: await _headers(needsBody: true),
    );
    final data = await _decode(res);
    _throwIfError(res, data, 'Hủy cược thất bại');

    final map = data is Map<String, dynamic> ? data['prediction'] : null;
    if (map is! Map<String, dynamic>) {
      throw SpectatorApiException('Phản hồi hủy cược không hợp lệ');
    }
    return Prediction.fromJson(map);
  }

  /// POST /api/predictions/races/:raceId/ai-suggestion — Spectator trả điểm
  /// để xem gợi ý AI (CHỈ tỉ lệ thắng `winProbability`, không lộ odds hay
  /// các thông tin định giá nội bộ của Admin).
  ///
  /// Trả về map gồm: raceId, raceName, source, note, pointsCharged,
  /// walletBalance, predictions[] (mỗi item có horseName, rank, winProbability).
  Future<AiSuggestionResult> viewAiSuggestion(int raceId) async {
    final res = await http.post(
      ApiConfig.uri('/api/predictions/races/$raceId/ai-suggestion'),
      headers: await _headers(needsBody: true),
    );
    final data = await _decode(res);
    _throwIfError(res, data, 'Không tải được gợi ý AI');

    if (data is! Map<String, dynamic>) {
      throw SpectatorApiException('Phản hồi gợi ý AI không hợp lệ');
    }
    return AiSuggestionResult.fromJson(data);
  }
}

/// Kết quả trả về từ `SpectatorApi.viewAiSuggestion` — chỉ chứa
/// `winProbability` (ẩn mọi odds / fair odds để tránh lộ công cụ định giá
/// nội bộ của Admin).
class AiSuggestionResult {
  const AiSuggestionResult({
    required this.raceId,
    required this.raceName,
    required this.source,
    required this.note,
    required this.pointsCharged,
    required this.walletBalance,
    required this.predictions,
  });

  final int raceId;
  final String raceName;
  final String source;
  final String note;
  final int pointsCharged;
  final int walletBalance;
  final List<AiHorsePrediction> predictions;

  factory AiSuggestionResult.fromJson(Map<String, dynamic> json) {
    final raw = json['predictions'];
    final list = raw is List
        ? raw
            .whereType<Map<String, dynamic>>()
            .map(AiHorsePrediction.fromJson)
            .toList()
        : <AiHorsePrediction>[];
    return AiSuggestionResult(
      raceId: (json['raceId'] as num?)?.toInt() ?? 0,
      raceName: json['raceName']?.toString() ?? '',
      source: json['source']?.toString() ?? '',
      note: json['note']?.toString() ?? '',
      pointsCharged: (json['pointsCharged'] as num?)?.toInt() ?? 0,
      walletBalance: (json['walletBalance'] as num?)?.toInt() ?? 0,
      predictions: list,
    );
  }
}

/// 1 dòng gợi ý AI cho 1 ngựa (chỉ `winProbability`, không có odds).
class AiHorsePrediction {
  const AiHorsePrediction({
    required this.horseId,
    required this.horseName,
    required this.rank,
    required this.winProbability,
  });

  final int? horseId;
  final String horseName;
  final int rank;

  /// Tỉ lệ thắng (%). Đã làm tròn 2 chữ số thập phân ở backend.
  final double winProbability;

  factory AiHorsePrediction.fromJson(Map<String, dynamic> json) {
    return AiHorsePrediction(
      horseId: (json['horseId'] as num?)?.toInt(),
      horseName: json['horseName']?.toString() ?? '',
      rank: (json['rank'] as num?)?.toInt() ?? 0,
      winProbability: (json['winProbability'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
