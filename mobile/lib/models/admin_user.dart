class AdminUserRole {
  AdminUserRole({this.code, this.name});

  factory AdminUserRole.fromJson(Map<String, dynamic>? json) {
    if (json == null) return AdminUserRole();
    return AdminUserRole(
      code: json['code']?.toString(),
      name: json['name']?.toString(),
    );
  }

  final String? code;
  final String? name;
}

class AdminUser {
  AdminUser({
    this.userId,
    this.email,
    this.fullName,
    this.phoneNumber,
    this.isActive = true,
    this.role,
    this.licenseNumber,
    this.weight,
    this.bio,
  });

  factory AdminUser.fromJson(Map<String, dynamic> json) {
    final role = json['role'];
    return AdminUser(
      userId: json['userId'] is int ? json['userId'] as int : int.tryParse('${json['userId']}'),
      email: json['email']?.toString(),
      fullName: json['fullName']?.toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      isActive: json['isActive'] == true,
      role: role is Map<String, dynamic> ? AdminUserRole.fromJson(role) : null,
      licenseNumber: json['licenseNumber']?.toString(),
      weight: json['weight'],
      bio: json['bio']?.toString(),
    );
  }

  final int? userId;
  final String? email;
  final String? fullName;
  final String? phoneNumber;
  final bool isActive;
  final AdminUserRole? role;
  final String? licenseNumber;
  final dynamic weight;
  final String? bio;

  String get initials {
    final name = fullName?.trim();
    if (name != null && name.isNotEmpty) {
      return name[0].toUpperCase();
    }
    final mail = email?.trim();
    if (mail != null && mail.isNotEmpty) return mail[0].toUpperCase();
    return '?';
  }

  AdminUser copyWith({
    int? userId,
    String? email,
    String? fullName,
    String? phoneNumber,
    bool? isActive,
    AdminUserRole? role,
  }) {
    return AdminUser(
      userId: userId ?? this.userId,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      isActive: isActive ?? this.isActive,
      role: role ?? this.role,
      licenseNumber: licenseNumber,
      weight: weight,
      bio: bio,
    );
  }
}
