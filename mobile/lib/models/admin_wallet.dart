import '../utils/format_utils.dart';

num _asNum(dynamic v) {
  if (v is num) return v;
  if (v is String) return num.tryParse(v) ?? 0;
  return 0;
}

/// Kết quả trả về từ POST /api/admin/wallets/:userId/adjust.
///
/// Backend response shape:
/// ```json
/// {
///   "message": "Balance adjusted successfully",
///   "walletId": 12,
///   "userId": 5,
///   "balance": 750,
///   "adjustment": 100,
///   "reason": "Bồi thường do giải bị hủy"
/// }
/// ```
class AdminAdjustResult {
  AdminAdjustResult({
    this.walletId,
    this.userId,
    this.balance = 0,
    this.adjustment = 0,
    this.reason,
    this.message,
  });

  factory AdminAdjustResult.fromJson(Map<String, dynamic> json) {
    return AdminAdjustResult(
      walletId: json['walletId'] is num
          ? (json['walletId'] as num).toInt()
          : int.tryParse(json['walletId']?.toString() ?? ''),
      userId: json['userId'] is num
          ? (json['userId'] as num).toInt()
          : int.tryParse(json['userId']?.toString() ?? ''),
      balance: _asNum(json['balance']),
      adjustment: _asNum(json['adjustment']),
      reason: json['reason']?.toString(),
      message: json['message']?.toString(),
    );
  }

  final int? walletId;
  final int? userId;
  final num balance;
  final num adjustment;
  final String? reason;
  final String? message;

  bool get isDeposit => adjustment > 0;
  bool get isWithdraw => adjustment < 0;

  String get balanceLabel => formatPointsVi(balance);
  String get adjustmentLabel {
    final sign = isDeposit ? '+' : '';
    return '$sign${formatPointsVi(adjustment)}';
  }

  /// Số điểm đã rút (dương, không dấu) — dùng cho thông báo "Đã rút X điểm".
  String get withdrawalAbsLabel => formatPointsVi(adjustment.abs());

  /// Số điểm đã nạp (dương, không dấu) — dùng cho thông báo "Đã nạp X điểm".
  String get depositAbsLabel => formatPointsVi(adjustment.abs());
}

/// Wrapper trả về khi admin get ví của 1 user (qua adjustment API hoặc dựng từ info).
class AdminUserWalletSummary {
  AdminUserWalletSummary({
    this.userId,
    this.balance = 0,
    this.isFrozen = false,
    this.userFullName,
    this.userEmail,
  });

  factory AdminUserWalletSummary.fromAdjust(AdminAdjustResult result) {
    return AdminUserWalletSummary(
      userId: result.userId,
      balance: result.balance,
    );
  }

  factory AdminUserWalletSummary.fromJson(Map<String, dynamic>? json) {
    if (json == null) return AdminUserWalletSummary();
    final frozen = json['isFrozen'];
    final user = json['user'];
    return AdminUserWalletSummary(
      userId: json['userId'] is num
          ? (json['userId'] as num).toInt()
          : int.tryParse(json['userId']?.toString() ?? ''),
      balance: _asNum(json['balance']),
      isFrozen: frozen == 1 || frozen == true || frozen == '1',
      userFullName: user is Map<String, dynamic> ? user['fullName']?.toString() : null,
      userEmail: user is Map<String, dynamic> ? user['email']?.toString() : null,
    );
  }

  final int? userId;
  final num balance;
  final bool isFrozen;
  final String? userFullName;
  final String? userEmail;

  String get balanceLabel => formatPointsVi(balance);
}