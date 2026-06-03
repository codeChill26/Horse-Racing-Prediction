class PublicTournament {
  PublicTournament({
    this.tournamentId,
    this.name,
    this.description,
    this.status,
    this.startAt,
    this.endAt,
    this.createdAt,
    this.updatedAt,
  });

  factory PublicTournament.fromJson(Map<String, dynamic> json) {
    return PublicTournament(
      tournamentId: json['tournamentId'] is int
          ? json['tournamentId'] as int
          : int.tryParse('${json['tournamentId']}'),
      name: json['name']?.toString(),
      description: json['description']?.toString(),
      status: json['status']?.toString(),
      startAt: json['startAt']?.toString(),
      endAt: json['endAt']?.toString(),
      createdAt: json['createdAt']?.toString(),
      updatedAt: json['updatedAt']?.toString(),
    );
  }

  final int? tournamentId;
  final String? name;
  final String? description;
  final String? status;
  final String? startAt;
  final String? endAt;
  final String? createdAt;
  final String? updatedAt;
}
