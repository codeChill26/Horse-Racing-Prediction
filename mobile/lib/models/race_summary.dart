class RaceSummary {
  RaceSummary({
    required this.raceId,
    required this.tournamentId,
    required this.name,
    this.scheduledAt,
    this.registrationOpen = false,
  });

  factory RaceSummary.fromJson(Map<String, dynamic> json) {
    return RaceSummary(
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.parse('${json['raceId']}'),
      tournamentId: json['tournamentId'] is int
          ? json['tournamentId'] as int
          : int.parse('${json['tournamentId']}'),
      name: json['name']?.toString() ?? '',
      scheduledAt: json['scheduledAt']?.toString(),
      registrationOpen: json['registrationOpen'] == true,
    );
  }

  final int raceId;
  final int tournamentId;
  final String name;
  final String? scheduledAt;
  final bool registrationOpen;
}
