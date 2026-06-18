class JockeyProfile {
  JockeyProfile({
    required this.userId,
    required this.fullName,
    this.email,
    this.phoneNumber,
    this.licenseNumber,
    this.weight,
    this.bio,
  });

  factory JockeyProfile.fromJson(Map<String, dynamic> json) {
    return JockeyProfile(
      userId: json['userId'] is int
          ? json['userId'] as int
          : int.parse('${json['userId']}'),
      fullName: json['fullName']?.toString() ?? '',
      email: json['email']?.toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      licenseNumber: json['licenseNumber']?.toString(),
      weight: json['weight']?.toString(),
      bio: json['bio']?.toString(),
    );
  }

  final int userId;
  final String fullName;
  final String? email;
  final String? phoneNumber;
  final String? licenseNumber;
  final String? weight;
  final String? bio;
}
