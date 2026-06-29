class HorseCareerMetrics {
  HorseCareerMetrics({
    required this.totalStarts,
    required this.wins,
    required this.winRate,
    this.avgFinishPosition,
    this.recentFormText,
    this.recentForm = const [],
  });

  factory HorseCareerMetrics.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return HorseCareerMetrics(totalStarts: 0, wins: 0, winRate: 0);
    }
    final recent = json['recentForm'];
    return HorseCareerMetrics(
      totalStarts: _asInt(json['totalStarts']),
      wins: _asInt(json['wins']),
      winRate: _asDouble(json['winRate']),
      avgFinishPosition: json['avgFinishPosition'] == null
          ? null
          : _asDouble(json['avgFinishPosition']),
      recentFormText: json['recentFormText']?.toString(),
      recentForm: recent is List
          ? recent
              .whereType<Map<String, dynamic>>()
              .map(HorseRecentResult.fromJson)
              .toList()
          : const [],
    );
  }

  final int totalStarts;
  final int wins;
  final double winRate;
  final double? avgFinishPosition;
  final String? recentFormText;
  final List<HorseRecentResult> recentForm;
}

class HorseRecentResult {
  HorseRecentResult({
    required this.raceId,
    this.raceName,
    this.tournamentName,
    this.scheduledAt,
    required this.finishPosition,
  });

  factory HorseRecentResult.fromJson(Map<String, dynamic> json) {
    return HorseRecentResult(
      raceId: _asInt(json['raceId']),
      raceName: json['raceName']?.toString(),
      tournamentName: json['tournamentName']?.toString(),
      scheduledAt: json['scheduledAt'] != null
          ? DateTime.tryParse(json['scheduledAt'].toString())
          : null,
      finishPosition: _asInt(json['finishPosition']),
    );
  }

  final int raceId;
  final String? raceName;
  final String? tournamentName;
  final DateTime? scheduledAt;
  final int finishPosition;
}

class OwnerHorse {
  OwnerHorse({
    required this.horseId,
    required this.name,
    this.ownerId,
    this.ownerName,
    this.ownerEmail,
    this.breed,
    this.status,
    this.sex,
    this.color,
    this.dateOfBirth,
    this.rejectionReason,
    this.careerMetrics,
  });

  factory OwnerHorse.fromJson(Map<String, dynamic> json) {
    final metrics = json['careerMetrics'];
    final owner = json['owner'];
    String? ownerName;
    String? ownerEmail;
    if (owner is Map<String, dynamic>) {
      ownerName = owner['fullName']?.toString();
      ownerEmail = owner['email']?.toString();
    }
    return OwnerHorse(
      horseId: _asInt(json['horseId']),
      ownerId: json['ownerId'] == null ? null : _asInt(json['ownerId']),
      ownerName: ownerName ?? json['ownerName']?.toString(),
      ownerEmail: ownerEmail ?? json['ownerEmail']?.toString(),
      name: json['name']?.toString() ?? '',
      breed: json['breed']?.toString(),
      status: json['status']?.toString(),
      sex: json['sex']?.toString(),
      color: json['color']?.toString(),
      dateOfBirth: json['dateOfBirth'] != null
          ? DateTime.tryParse(json['dateOfBirth'].toString())
          : null,
      rejectionReason: json['rejectionReason']?.toString(),
      careerMetrics: metrics is Map<String, dynamic>
          ? HorseCareerMetrics.fromJson(metrics)
          : null,
    );
  }

  final int horseId;
  final int? ownerId;
  final String? ownerName;
  final String? ownerEmail;
  final String name;
  final String? breed;
  final String? status;
  final String? sex;
  final String? color;
  final DateTime? dateOfBirth;
  final String? rejectionReason;
  final HorseCareerMetrics? careerMetrics;

  OwnerHorse copyWith({
    String? ownerName,
    String? ownerEmail,
    String? status,
    String? rejectionReason,
  }) {
    return OwnerHorse(
      horseId: horseId,
      ownerId: ownerId,
      ownerName: ownerName ?? this.ownerName,
      ownerEmail: ownerEmail ?? this.ownerEmail,
      name: name,
      breed: breed,
      status: status ?? this.status,
      sex: sex,
      color: color,
      dateOfBirth: dateOfBirth,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      careerMetrics: careerMetrics,
    );
  }

  bool get isApproved => status == 'APPROVED';

  String get displayOwner {
    if (ownerName != null && ownerName!.trim().isNotEmpty) {
      return ownerName!.trim();
    }
    if (ownerId != null) return '#$ownerId';
    return '—';
  }

  String get subtitle {
    final parts = <String>[
      if (breed != null && breed!.isNotEmpty) breed!,
      if (sex != null && sex!.isNotEmpty) sex!,
      if (color != null && color!.isNotEmpty) color!,
    ];
    return parts.isEmpty ? 'Chưa có thông tin giống' : parts.join(' · ');
  }

  int? get ageYears {
    if (dateOfBirth == null) return null;
    final now = DateTime.now();
    var age = now.year - dateOfBirth!.year;
    if (now.month < dateOfBirth!.month ||
        (now.month == dateOfBirth!.month && now.day < dateOfBirth!.day)) {
      age--;
    }
    return age < 0 ? null : age;
  }
}

int _asInt(dynamic value) {
  if (value is int) return value;
  return int.tryParse('$value') ?? 0;
}

double _asDouble(dynamic value) {
  if (value is double) return value;
  if (value is int) return value.toDouble();
  return double.tryParse('$value') ?? 0;
}
