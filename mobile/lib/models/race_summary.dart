class RaceSummary {
  RaceSummary({
    required this.raceId,
    required this.tournamentId,
    required this.name,
    this.status,
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
      status: json['status']?.toString(),
      scheduledAt: json['scheduledAt']?.toString(),
      registrationOpen: json['registrationOpen'] == true,
    );
  }

  final int raceId;
  final int tournamentId;
  final String name;
  final String? status;
  final String? scheduledAt;
  final bool registrationOpen;

  bool get isBettable => (status ?? '').toUpperCase() == 'SCHEDULED';
}

/// Response đầy đủ từ GET /api/races/:id/detail — dùng cho màn đặt cược.
class RaceDetail {
  RaceDetail({
    required this.raceId,
    required this.name,
    required this.status,
    required this.registrationOpen,
    this.scheduledAt,
    this.registrationDeadline,
    this.tournament,
    this.entries = const [],
  });

  factory RaceDetail.fromJson(Map<String, dynamic> json) {
    final tournamentRaw = json['tournament'];
    Map<String, dynamic>? tournamentMap;
    if (tournamentRaw is Map<String, dynamic>) {
      tournamentMap = tournamentRaw;
    }

    final entriesRaw = json['entries'];
    final entries = <RaceEntryDetail>[];
    if (entriesRaw is List) {
      for (final e in entriesRaw) {
        if (e is Map<String, dynamic>) {
          entries.add(RaceEntryDetail.fromJson(e));
        }
      }
    }

    return RaceDetail(
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.parse('${json['raceId']}'),
      name: json['name']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      registrationOpen: json['registrationOpen'] == true,
      scheduledAt: json['scheduledAt']?.toString(),
      registrationDeadline: json['registrationDeadline']?.toString(),
      tournament: tournamentMap != null
          ? RaceTournamentLite.fromJson(tournamentMap)
          : null,
      entries: entries,
    );
  }

  final int raceId;
  final String name;
  final String status;
  final bool registrationOpen;
  final String? scheduledAt;
  final String? registrationDeadline;
  final RaceTournamentLite? tournament;
  final List<RaceEntryDetail> entries;

  bool get isBettable =>
      status.toUpperCase() == 'SCHEDULED' && !registrationOpen;
}

class RaceTournamentLite {
  RaceTournamentLite({
    this.tournamentId,
    this.name,
    this.status,
  });

  factory RaceTournamentLite.fromJson(Map<String, dynamic> json) {
    return RaceTournamentLite(
      tournamentId: json['tournamentId'] is int
          ? json['tournamentId'] as int
          : int.tryParse('${json['tournamentId']}'),
      name: json['name']?.toString(),
      status: json['status']?.toString(),
    );
  }

  final int? tournamentId;
  final String? name;
  final String? status;
}

/// 1 entry (ngựa + jockey) trong race detail.
class RaceEntryDetail {
  RaceEntryDetail({
    required this.entryId,
    this.horseName,
    this.horseImageUrl,
    this.jockeyName,
    this.jockeyAvatarUrl,
    this.jockeyWeight,
    this.oddsFinal,
  });

  factory RaceEntryDetail.fromJson(Map<String, dynamic> json) {
    final horseRaw = json['horse'];
    Map<String, dynamic>? horseMap;
    if (horseRaw is Map<String, dynamic>) horseMap = horseRaw;

    final jockeyRaw = json['jockey'];
    Map<String, dynamic>? jockeyMap;
    if (jockeyRaw is Map<String, dynamic>) jockeyMap = jockeyRaw;

    final odds = json['oddsFinal'];
    num? parsedOdds;
    if (odds is num) {
      parsedOdds = odds;
    } else if (odds is String) {
      parsedOdds = num.tryParse(odds);
    }

    return RaceEntryDetail(
      entryId: json['entryId'] is int
          ? json['entryId'] as int
          : int.parse('${json['entryId']}'),
      horseName: horseMap?['name']?.toString(),
      horseImageUrl: horseMap?['imageUrl']?.toString(),
      jockeyName: jockeyMap?['fullName']?.toString(),
      jockeyAvatarUrl: jockeyMap?['avatarUrl']?.toString(),
      jockeyWeight: jockeyMap?['weight'] is num
          ? (jockeyMap!['weight'] as num).toDouble()
          : null,
      oddsFinal: parsedOdds,
    );
  }

  final int entryId;
  final String? horseName;
  final String? horseImageUrl;
  final String? jockeyName;
  final String? jockeyAvatarUrl;
  final double? jockeyWeight;
  final num? oddsFinal;

  String get displayLabel {
    final horse = horseName ?? 'Ngựa #$entryId';
    final jockey = jockeyName;
    if (jockey == null || jockey.isEmpty) return horse;
    return '$horse · $jockey';
  }

  String? get oddsLabel {
    final v = oddsFinal;
    if (v == null) return null;
    return v.toStringAsFixed(2);
  }
}