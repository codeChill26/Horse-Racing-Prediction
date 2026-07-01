import '../utils/format_utils.dart';

num _asNum(dynamic v) {
  if (v is num) return v;
  if (v is String) return num.tryParse(v) ?? 0;
  return 0;
}

/// Ví điểm của khán giả (response của GET /api/wallet).
class WalletInfo {
  WalletInfo({
    this.walletId,
    this.userId,
    this.balance = 0,
    this.isFrozen = false,
    this.userFullName,
    this.userEmail,
  });

  factory WalletInfo.fromJson(Map<String, dynamic> json) {
    final frozen = json['isFrozen'];
    final user = json['user'];
    return WalletInfo(
      walletId: json['walletId'] is num
          ? (json['walletId'] as num).toInt()
          : int.tryParse(json['walletId']?.toString() ?? ''),
      userId: json['userId'] is num
          ? (json['userId'] as num).toInt()
          : int.tryParse(json['userId']?.toString() ?? ''),
      balance: _asNum(json['balance']),
      isFrozen: frozen == 1 || frozen == true || frozen == '1',
      userFullName: user is Map<String, dynamic> ? user['fullName']?.toString() : null,
      userEmail: user is Map<String, dynamic> ? user['email']?.toString() : null,
    );
  }

  final int? walletId;
  final int? userId;
  final num balance;
  final bool isFrozen;
  final String? userFullName;
  final String? userEmail;

  String get balanceLabel => formatPointsVi(balance);
}
