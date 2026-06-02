num _jsonToNum(dynamic v) {
  if (v is num) return v;
  if (v is String) return num.tryParse(v) ?? 0;
  return 0;
}

class PointWallet {
  PointWallet({this.balance = 0, this.isFrozen = false});

  factory PointWallet.fromJson(Map<String, dynamic>? json) {
    if (json == null) return PointWallet();
    final frozen = json['isFrozen'];
    return PointWallet(
      balance: _jsonToNum(json['balance']),
      isFrozen: frozen == 1 || frozen == true,
    );
  }

  final num balance;
  final bool isFrozen;
}

class UserProfile {
  UserProfile({
    this.userId,
    this.email,
    this.fullName,
    this.phone,
    this.isActive,
    this.pointWallet,
    this.roleName,
    this.createdAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    final wallet = json['pointWallet'];
    final role = json['role'];
    return UserProfile(
      userId: json['userId']?.toString(),
      email: json['email']?.toString(),
      fullName: json['fullName']?.toString(),
      phone: json['phone']?.toString(),
      isActive: json['isActive'],
      pointWallet: wallet is Map<String, dynamic>
          ? PointWallet.fromJson(wallet)
          : PointWallet.fromJson(null),
      roleName: role is Map<String, dynamic>
          ? role['roleName']?.toString()
          : json['roleName']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }

  final String? userId;
  final String? email;
  final String? fullName;
  final String? phone;
  final dynamic isActive;
  final PointWallet? pointWallet;
  final String? roleName;
  final String? createdAt;

  String get displayFirstName {
    final name = fullName?.trim();
    if (name == null || name.isEmpty) return 'bạn';
    final parts = name.split(RegExp(r'\s+'));
    return parts.last;
  }

  String get initials {
    final name = fullName?.trim();
    if (name == null || name.isEmpty) return '?';
    return name
        .split(RegExp(r'\s+'))
        .where((p) => p.isNotEmpty)
        .toList()
        .reversed
        .take(2)
        .map((w) => w[0].toUpperCase())
        .toList()
        .reversed
        .join();
  }
}
