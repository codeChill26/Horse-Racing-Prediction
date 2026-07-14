import '../utils/race_status_labels.dart';

class RefereeRace {
  RefereeRace({
    this.id,
    this.raceId,
    this.name,
    this.tournamentName,
    this.tournamentId,
    this.scheduledStartTime,
    this.actualStartTime,
    this.status,
    this.bettingStatus,
    this.legs = const [],
    this.assignedRole,
    this.refereeId,
    this.otherRefereeName,
    int? totalLegs,
  }) : totalLegs = totalLegs ?? (legs.isEmpty ? 1 : legs.length);

  RefereeRace._init({
    required this.totalLegs,
    this.id,
    this.raceId,
    this.name,
    this.tournamentName,
    this.tournamentId,
    this.scheduledStartTime,
    this.actualStartTime,
    this.status,
    this.bettingStatus,
    this.legs = const [],
    this.assignedRole,
    this.refereeId,
    this.otherRefereeName,
  });

  factory RefereeRace.fromJson(Map<String, dynamic> json) {
    final legsRaw = json['legs'];
    final legs = legsRaw is List
        ? legsRaw
            .whereType<Map<String, dynamic>>()
            .map(RefereeLeg.fromJson)
            .toList()
        : <RefereeLeg>[];

    return RefereeRace(
      id: json['id'] is int
          ? json['id'] as int
          : int.tryParse('${json['id']}'),
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      name: json['name']?.toString(),
      tournamentName: json['tournamentName']?.toString(),
      tournamentId: json['tournamentId'] is int
          ? json['tournamentId'] as int
          : int.tryParse('${json['tournamentId']}'),
      scheduledStartTime: _parseDate(json['scheduledStartTime']),
      actualStartTime: _parseDate(json['actualStartTime']),
      status: json['status']?.toString(),
      bettingStatus: json['bettingStatus']?.toString(),
      legs: legs,
      assignedRole: json['assignedRole']?.toString(),
      refereeId: json['refereeId'] is int
          ? json['refereeId'] as int
          : int.tryParse('${json['refereeId']}'),
      otherRefereeName: json['otherRefereeName']?.toString(),
    );
  }

  final int? id;
  final int? raceId;
  final String? name;
  final String? tournamentName;
  final int? tournamentId;
  final DateTime? scheduledStartTime;
  final DateTime? actualStartTime;
  final String? status;
  final String? bettingStatus;
  final int? totalLegs;
  final List<RefereeLeg> legs;
  final String? assignedRole;
  final int? refereeId;
  final String? otherRefereeName;

  String get statusLabel => raceStatusLabelVi(status);
  bool get isScheduled => (status ?? '').toUpperCase() == 'SCHEDULED';
  bool get isInProgress => (status ?? '').toUpperCase() == 'IN_PROGRESS';
  bool get isPaused => (status ?? '').toUpperCase() == 'PAUSED';
  bool get isPendingResult => (status ?? '').toUpperCase() == 'PENDING_RESULT';
  bool get isFinished => (status ?? '').toUpperCase() == 'FINISHED';
}

class RefereeRaceDetail {
  RefereeRaceDetail({
    this.raceId,
    this.name,
    this.tournamentName,
    this.tournamentId,
    this.status,
    this.scheduledStartTime,
    this.registrationOpen,
    this.legs = const [],
    this.assignedRole,
    this.refereeId,
    this.otherRefereeName,
    this.mySubmissionStatus,
    this.otherRefereeStatus,
  });

  factory RefereeRaceDetail.fromJson(Map<String, dynamic> json) {
    final legsRaw = json['legs'];
    final legs = legsRaw is List
        ? legsRaw
            .whereType<Map<String, dynamic>>()
            .map(RefereeLeg.fromJson)
            .toList()
        : <RefereeLeg>[];

    return RefereeRaceDetail(
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      name: json['name']?.toString(),
      tournamentName: json['tournamentName']?.toString(),
      tournamentId: json['tournamentId'] is int
          ? json['tournamentId'] as int
          : int.tryParse('${json['tournamentId']}'),
      status: json['status']?.toString(),
      scheduledStartTime: _parseDate(json['scheduledStartTime']),
      registrationOpen: json['registrationOpen'] == true ||
          json['registrationOpen']?.toString() == 'true' ||
          json['registrationOpen']?.toString() == '1',
      legs: legs,
      assignedRole: json['assignedRole']?.toString(),
      refereeId: json['refereeId'] is int
          ? json['refereeId'] as int
          : int.tryParse('${json['refereeId']}'),
      otherRefereeName: json['otherRefereeName']?.toString(),
      mySubmissionStatus: json['mySubmissionStatus']?.toString(),
      otherRefereeStatus: json['otherRefereeStatus']?.toString(),
    );
  }

  final int? raceId;
  final String? name;
  final String? tournamentName;
  final int? tournamentId;
  final String? status;
  final DateTime? scheduledStartTime;
  final bool? registrationOpen;
  final List<RefereeLeg> legs;
  final String? assignedRole;
  final int? refereeId;
  final String? otherRefereeName;
  final String? mySubmissionStatus;
  final String? otherRefereeStatus;

  String get statusLabel => raceStatusLabelVi(status);
  bool get hasSubmittedMyResult =>
      (mySubmissionStatus ?? '').toUpperCase() == 'SUBMITTED';
}

class RefereeLeg {
  RefereeLeg({
    this.id,
    this.legId,
    this.raceId,
    this.legNumber,
    this.name,
    this.status,
    this.mySubmissionStatus,
    this.otherRefereeStatus,
    this.horses = const [],
  });

  factory RefereeLeg.fromJson(Map<String, dynamic> json) {
    final horsesRaw = json['horses'];
    final horses = horsesRaw is List
        ? horsesRaw
            .whereType<Map<String, dynamic>>()
            .map(RefereeHorse.fromJson)
            .toList()
        : <RefereeHorse>[];

    return RefereeLeg(
      id: json['id']?.toString(),
      legId: json['legId'] is int
          ? json['legId'] as int
          : int.tryParse('${json['legId']}'),
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      legNumber: json['legNumber'] is int
          ? json['legNumber'] as int
          : int.tryParse('${json['legNumber']}'),
      name: json['name']?.toString(),
      status: json['status']?.toString(),
      mySubmissionStatus: json['mySubmissionStatus']?.toString(),
      otherRefereeStatus: json['otherRefereeStatus']?.toString(),
      horses: horses,
    );
  }

  final String? id;
  final int? legId;
  final int? raceId;
  final int? legNumber;
  final String? name;
  final String? status;
  final String? mySubmissionStatus;
  final String? otherRefereeStatus;
  final List<RefereeHorse> horses;
}

class RefereeHorse {
  RefereeHorse({
    this.horseId,
    this.gateNumber,
    this.horseName,
    this.jockeyName,
  });

  factory RefereeHorse.fromJson(Map<String, dynamic> json) => RefereeHorse(
        horseId: json['horseId'] is int
            ? json['horseId'] as int
            : int.tryParse('${json['horseId']}'),
        gateNumber: json['gateNumber'] is int
            ? json['gateNumber'] as int
            : int.tryParse('${json['gateNumber']}') ?? 0,
        horseName: json['horseName']?.toString(),
        jockeyName: json['jockeyName']?.toString(),
      );

  final int? horseId;
  final int? gateNumber;
  final String? horseName;
  final String? jockeyName;
}

class RefereeSubmission {
  RefereeSubmission({
    this.submissionId,
    this.raceId,
    this.raceName,
    this.rawResults = const [],
    this.submittedAt,
  });

  factory RefereeSubmission.fromJson(Map<String, dynamic> json) {
    final raw = json['rawResults'];
    final results = raw is List
        ? raw
            .whereType<Map<String, dynamic>>()
            .map(RefereeSubmitRank.fromJson)
            .toList()
        : <RefereeSubmitRank>[];

    final race = json['race'];
    String? raceName;
    if (race is Map<String, dynamic>) {
      raceName = race['name']?.toString();
    }

    return RefereeSubmission(
      submissionId: json['submissionId'] is int
          ? json['submissionId'] as int
          : int.tryParse('${json['submissionId']}'),
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      raceName: raceName,
      rawResults: results,
      submittedAt: _parseDate(json['submittedAt']),
    );
  }

  final int? submissionId;
  final int? raceId;
  final String? raceName;
  final List<RefereeSubmitRank> rawResults;
  final DateTime? submittedAt;
}

class RefereeSubmitRank {
  RefereeSubmitRank({
    this.entryId,
    this.rank,
  });

  factory RefereeSubmitRank.fromJson(Map<String, dynamic> json) => RefereeSubmitRank(
        entryId: json['entryId'] is int
            ? json['entryId'] as int
            : int.tryParse('${json['entryId']}'),
        rank: json['rank'] is int
            ? json['rank'] as int
            : int.tryParse('${json['rank']}'),
      );

  final int? entryId;
  final int? rank;
}

class RefereeConflict {
  RefereeConflict({
    this.officialResultId,
    this.raceId,
    this.raceName,
    this.matchStatus,
    this.finalResults = const [],
    this.submissions = const [],
    this.createdAt,
  });

  factory RefereeConflict.fromJson(Map<String, dynamic> json) {
    final submissionsRaw = json['submissions'];
    final submissions = submissionsRaw is List
        ? submissionsRaw
            .whereType<Map<String, dynamic>>()
            .map(RefereeConflictSubmission.fromJson)
            .toList()
        : <RefereeConflictSubmission>[];

    final resultsRaw = json['finalResults'];
    final results = resultsRaw is List
        ? resultsRaw
            .whereType<Map<String, dynamic>>()
            .map(RefereeSubmitRank.fromJson)
            .toList()
        : <RefereeSubmitRank>[];

    return RefereeConflict(
      officialResultId: json['officialResultId'] is int
          ? json['officialResultId'] as int
          : int.tryParse('${json['officialResultId']}'),
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      raceName: json['raceName']?.toString(),
      matchStatus: json['matchStatus']?.toString(),
      finalResults: results,
      submissions: submissions,
      createdAt: _parseDate(json['createdAt']),
    );
  }

  final int? officialResultId;
  final int? raceId;
  final String? raceName;
  final String? matchStatus;
  final List<RefereeSubmitRank> finalResults;
  final List<RefereeConflictSubmission> submissions;
  final DateTime? createdAt;

  bool get isConflicted => (matchStatus ?? '').toUpperCase() == 'CONFLICTED';
}

class RefereeConflictSubmission {
  RefereeConflictSubmission({
    this.refereeId,
    this.refereeName,
    this.rankings = const [],
    this.note,
    this.submittedAt,
  });

  factory RefereeConflictSubmission.fromJson(Map<String, dynamic> json) {
    final rankingsRaw = json['rankings'];
    final rankings = rankingsRaw is List
        ? rankingsRaw
            .whereType<Map<String, dynamic>>()
            .map(RefereeSubmitRank.fromJson)
            .toList()
        : <RefereeSubmitRank>[];

    return RefereeConflictSubmission(
      refereeId: json['refereeId'] is int
          ? json['refereeId'] as int
          : int.tryParse('${json['refereeId']}'),
      refereeName: json['refereeName']?.toString(),
      rankings: rankings,
      note: json['note']?.toString(),
      submittedAt: _parseDate(json['submittedAt']),
    );
  }

  final int? refereeId;
  final String? refereeName;
  final List<RefereeSubmitRank> rankings;
  final String? note;
  final DateTime? submittedAt;
}

class RefereeProfile {
  RefereeProfile({
    this.userId,
    this.email,
    this.fullName,
    this.phoneNumber,
    this.avatarUrl,
    this.roleCode,
    this.isActive,
    this.isProfileComplete,
    this.createdAt,
    this.stats = const RefereeStats(),
  });

  factory RefereeProfile.fromJson(Map<String, dynamic> json) {
    final statsRaw = json['stats'];
    final stats = statsRaw is Map<String, dynamic>
        ? RefereeStats.fromJson(statsRaw)
        : const RefereeStats();

    return RefereeProfile(
      userId: json['userId'] is int
          ? json['userId'] as int
          : int.tryParse('${json['userId']}'),
      email: json['email']?.toString(),
      fullName: json['fullName']?.toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      avatarUrl: json['avatarUrl']?.toString(),
      roleCode: json['roleCode']?.toString(),
      isActive: json['isActive'] == true || json['isActive']?.toString() == 'true',
      isProfileComplete: json['isProfileComplete'] == true || json['isProfileComplete']?.toString() == 'true',
      createdAt: _parseDate(json['createdAt']),
      stats: stats,
    );
  }

  final int? userId;
  final String? email;
  final String? fullName;
  final String? phoneNumber;
  final String? avatarUrl;
  final String? roleCode;
  final bool? isActive;
  final bool? isProfileComplete;
  final DateTime? createdAt;
  final RefereeStats stats;
}

class RefereeStats {
  const RefereeStats({
    this.totalRacesAssigned = 0,
    this.totalLegsSubmitted = 0,
    this.autoMatchedRate = 0,
    this.conflictCount = 0,
    this.pendingConflicts = 0,
  });

  factory RefereeStats.fromJson(Map<String, dynamic> json) {
    int toInt(dynamic value) {
      if (value is int) return value;
      if (value is double) return value.toInt();
      return int.tryParse('$value') ?? 0;
    }

    return RefereeStats(
      totalRacesAssigned: toInt(json['totalRacesAssigned']),
      totalLegsSubmitted: toInt(json['totalLegsSubmitted']),
      autoMatchedRate: toInt(json['autoMatchedRate']),
      conflictCount: toInt(json['conflictCount']),
      pendingConflicts: toInt(json['pendingConflicts']),
    );
  }

  final int totalRacesAssigned;
  final int totalLegsSubmitted;
  final int autoMatchedRate;
  final int conflictCount;
  final int pendingConflicts;
}

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  return DateTime.tryParse(value.toString());
}
