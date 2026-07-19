import '../utils/format_utils.dart';

num _asNum(dynamic v) {
  if (v is num) return v;
  if (v is String) return num.tryParse(v) ?? 0;
  return 0;
}

/// Thông tin ví được include trong admin view (history thuộc user cụ thể).
class WalletLite {
  WalletLite({this.walletId, this.userId, this.userFullName, this.userEmail});

  factory WalletLite.fromJson(Map<String, dynamic>? json) {
    if (json == null) return WalletLite();
    final user = json['user'];
    return WalletLite(
      walletId: json['walletId'] is num
          ? (json['walletId'] as num).toInt()
          : int.tryParse(json['walletId']?.toString() ?? ''),
      userId: json['userId'] is num
          ? (json['userId'] as num).toInt()
          : int.tryParse(json['userId']?.toString() ?? ''),
      userFullName: user is Map<String, dynamic> ? user['fullName']?.toString() : null,
      userEmail: user is Map<String, dynamic> ? user['email']?.toString() : null,
    );
  }

  final int? walletId;
  final int? userId;
  final String? userFullName;
  final String? userEmail;
}

/// Một giao dịch ví (đặt cược / hoàn tiền / thắng / admin / weekly bonus).
class WalletTransaction {
  WalletTransaction({
    this.transactionId,
    this.walletId,
    this.amount = 0,
    this.balanceAfter = 0,
    this.type,
    this.referenceType,
    this.referenceId,
    this.description,
    this.createdAt,
    this.wallet,
  });

  factory WalletTransaction.fromJson(Map<String, dynamic> json) {
    final refIdRaw = json['referenceId'];
    String? referenceId;
    if (refIdRaw != null) {
      if (refIdRaw is num) {
        referenceId = refIdRaw.toString();
      } else if (refIdRaw is String) {
        referenceId = refIdRaw;
      }
    }

    return WalletTransaction(
      transactionId: json['transactionId'] is num
          ? (json['transactionId'] as num).toInt()
          : int.tryParse(json['transactionId']?.toString() ?? ''),
      walletId: json['walletId'] is num
          ? (json['walletId'] as num).toInt()
          : int.tryParse(json['walletId']?.toString() ?? ''),
      amount: _asNum(json['amount']),
      balanceAfter: _asNum(json['balanceAfter']),
      type: json['type']?.toString(),
      referenceType: json['referenceType']?.toString(),
      referenceId: referenceId,
      description: json['description']?.toString(),
      createdAt: json['createdAt']?.toString(),
      wallet: WalletLite.fromJson(
        json['pointWallet'] is Map<String, dynamic> ? json['pointWallet'] : null,
      ),
    );
  }

  final int? transactionId;
  final int? walletId;
  final num amount;
  final num balanceAfter;
  final String? type;
  final String? referenceType;

  /// ID tham chiếu ngoại bảng (vd `raceId`). Backend trả về dưới dạng string
  /// vì cột gốc là `BIGINT` (Prisma → JS BigInt), đã được serialize thành
  /// string trong `backend/app.js` để tránh `JSON.stringify` throw.
  final String? referenceId;
  final String? description;
  final String? createdAt;
  final WalletLite? wallet;

  bool get isCredit => amount > 0;
  bool get isDebit => amount < 0;

  String get amountLabel => formatPointsVi(amount);
  String get balanceAfterLabel => formatPointsVi(balanceAfter);

  String get typeLabel => WalletTransaction.typeLabelOf(type);

  /// Trả về label tiếng Việt cho 1 transaction type code.
  /// Dùng được từ bất kỳ đâu (cả instance lẫn chỉ cần code).
  static String typeLabelOf(String? type) {
    switch (type) {
      case 'BET_PLACED':
        return 'Đặt cược';
      case 'BET_WON':
      case 'BET_WIN':
        return 'Thắng cược';
      case 'BET_LOST':
        return 'Thua cược';
      case 'BET_REFUND':
        return 'Hoàn cược';
      case 'BET_WIN_REVERSAL':
        return 'Hoàn thắng';
      case 'ADMIN_ADJUSTMENT':
      case 'MANUAL_ADJUSTMENT':
        return 'Điều chỉnh';
      case 'WEEKLY_BONUS':
      case 'WEEKLY_BONUS_CREDIT':
        return 'Thưởng tuần';
      case 'INITIAL_BONUS':
        return 'Thưởng đăng ký';
      case 'DEPOSIT':
        return 'Nạp điểm';
      default:
        // Fallback: viết hoa thay vì trả nguyên code để giao diện không bị "kỹ thuật"
        final raw = type ?? 'Giao dịch';
        return raw.replaceAll('_', ' ').toUpperCase();
    }
  }
}

/// Phân trang trả về kèm danh sách transactions.
class TransactionPage {
  TransactionPage({required this.transactions, required this.page, required this.limit, required this.total, required this.totalPages});

  factory TransactionPage.fromJson(Map<String, dynamic>? json) {
    json ??= const {};
    final list = json['transactions'];
    final pagination = json['pagination'];
    final transactions = list is List
        ? list.whereType<Map<String, dynamic>>().map(WalletTransaction.fromJson).toList()
        : <WalletTransaction>[];
    return TransactionPage(
      transactions: transactions,
      page: (pagination is Map && pagination['page'] is num)
          ? (pagination['page'] as num).toInt()
          : 1,
      limit: (pagination is Map && pagination['limit'] is num)
          ? (pagination['limit'] as num).toInt()
          : 20,
      total: (pagination is Map && pagination['total'] is num)
          ? (pagination['total'] as num).toInt()
          : transactions.length,
      totalPages: (pagination is Map && pagination['totalPages'] is num)
          ? (pagination['totalPages'] as num).toInt()
          : 1,
    );
  }

  final List<WalletTransaction> transactions;
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  bool get hasNext => page < totalPages;
  bool get hasPrev => page > 1;
}
