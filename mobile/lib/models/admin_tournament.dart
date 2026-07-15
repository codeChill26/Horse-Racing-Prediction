class AdminTournament {
  AdminTournament({
    this.tournamentId,
    this.name,
    this.description,
    this.status,
    this.cancelReason,
    this.startAt,
    this.endAt,
    this.createdAt,
    this.updatedAt,
    this.racesCount = 0,
  });

  factory AdminTournament.fromJson(Map<String, dynamic> json) {
    final count = json['_count'];
    var races = 0;
    if (count is Map<String, dynamic>) {
      final r = count['races'];
      races = r is int ? r : int.tryParse('$r') ?? 0;
    }

    return AdminTournament(
      tournamentId: json['tournamentId'] is int
          ? json['tournamentId'] as int
          : int.tryParse('${json['tournamentId']}'),
      name: json['name']?.toString(),
      description: json['description']?.toString(),
      status: json['status']?.toString(),
      cancelReason: json['cancelReason']?.toString(),
      startAt: json['startAt']?.toString(),
      endAt: json['endAt']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
      racesCount: races,
    );
  }

  final int? tournamentId;
  final String? name;
  final String? description;
  final String? status;
  final String? cancelReason;
  final String? startAt;
  final String? endAt;
  final String? createdAt;
  final String? updatedAt;
  final int racesCount;

  bool get isEditable {
    final s = status ?? '';
    return s != 'FINISHED' && s != 'CANCELLED';
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AdminTournament &&
          runtimeType == other.runtimeType &&
          tournamentId == other.tournamentId;

  @override
  int get hashCode => tournamentId?.hashCode ?? 0;

  AdminTournament copyWith({
    int? tournamentId,
    String? name,
    String? description,
    String? status,
    String? cancelReason,
    String? startAt,
    String? endAt,
    int? racesCount,
  }) {
    return AdminTournament(
      tournamentId: tournamentId ?? this.tournamentId,
      name: name ?? this.name,
      description: description ?? this.description,
      status: status ?? this.status,
      cancelReason: cancelReason ?? this.cancelReason,
      startAt: startAt ?? this.startAt,
      endAt: endAt ?? this.endAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      racesCount: racesCount ?? this.racesCount,
    );
  }
}
