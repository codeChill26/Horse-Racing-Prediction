class AdminRace {
  AdminRace({
    this.raceId,
    this.tournamentId,
    this.tournamentName,
    this.name,
    this.status,
    this.maxEntries = 8,
    this.scheduledAt,
    this.registrationDeadline,
    this.registrationOpen = false,
    this.entriesCount = 0,
    this.predictionsCount = 0,
    this.createdAt,
    this.updatedAt,
    this.cancelReason,
    this.publishedAt,
  });

  factory AdminRace.fromJson(Map<String, dynamic> json) {
    final tournament = json['tournament'];
    String? tournamentName;
    int? tournamentId;
    if (tournament is Map<String, dynamic>) {
      tournamentName = tournament['name']?.toString();
      final tid = tournament['tournamentId'];
      if (tid is int) {
        tournamentId = tid;
      } else if (tid != null) {
        tournamentId = int.tryParse(tid.toString());
      }
    }

    final count = json['_count'];
    var entries = 0;
    var predictions = 0;
    if (count is Map<String, dynamic>) {
      final e = count['entries'];
      if (e is int) {
        entries = e;
      } else if (e != null) {
        entries = int.tryParse(e.toString()) ?? 0;
      }
      final p = count['predictions'];
      if (p is int) {
        predictions = p;
      } else if (p != null) {
        predictions = int.tryParse(p.toString()) ?? 0;
      }
    }

    return AdminRace(
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      tournamentId: tournamentId ?? (json['tournamentId'] is int
          ? json['tournamentId'] as int
          : int.tryParse('${json['tournamentId']}')),
      tournamentName: tournamentName ?? json['tournamentName']?.toString(),
      name: json['name']?.toString(),
      status: json['status']?.toString(),
      maxEntries: json['maxEntries'] is int
          ? json['maxEntries'] as int
          : int.tryParse('${json['maxEntries']}') ?? 8,
      scheduledAt: _parseDate(json['scheduledAt']),
      registrationDeadline: _parseDate(json['registrationDeadline']),
      registrationOpen: json['registrationOpen'] == true ||
          json['registrationOpen']?.toString() == 'true' ||
          json['registrationOpen']?.toString() == '1',
      entriesCount: entries,
      predictionsCount: predictions,
      createdAt: _parseDate(json['createdAt']),
      updatedAt: _parseDate(json['updatedAt']),
      cancelReason: json['cancelReason']?.toString(),
      publishedAt: _parseDate(json['publishedAt']),
    );
  }

  final int? raceId;
  final int? tournamentId;
  final String? tournamentName;
  final String? name;
  final String? status;
  final int maxEntries;
  final DateTime? scheduledAt;
  final DateTime? registrationDeadline;
  final bool registrationOpen;
  final int entriesCount;
  final int predictionsCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? cancelReason;
  final DateTime? publishedAt;

  bool get isEditable {
    final s = status ?? '';
    return s != 'FINISHED' && s != 'CANCELLED';
  }

  bool get isDeletedSafe => entriesCount == 0 && predictionsCount == 0;

  double get fillRate =>
      maxEntries == 0 ? 0 : (entriesCount / maxEntries).clamp(0, 1).toDouble();
}

class RaceEntry {
  RaceEntry({
    this.entryId,
    this.raceId,
    this.horseId,
    this.horseName,
    this.ownerId,
    this.ownerName,
    this.ownerEmail,
    this.jockeyId,
    this.jockeyName,
    this.jockeyWeight,
    this.status,
    this.odds,
    this.rejectionReason,
    this.reviewedAt,
    this.reviewedByName,
    this.createdAt,
  });

  factory RaceEntry.fromJson(Map<String, dynamic> json) {
    final horse = json['horse'];
    String? horseName;
    int? horseId;
    if (horse is Map<String, dynamic>) {
      horseName = horse['name']?.toString();
      final hid = horse['horseId'];
      if (hid is int) {
        horseId = hid;
      } else if (hid != null) {
        horseId = int.tryParse(hid.toString());
      }
    }

    final owner = json['owner'];
    int? ownerId;
    String? ownerName;
    String? ownerEmail;
    if (owner is Map<String, dynamic>) {
      ownerName = owner['fullName']?.toString();
      ownerEmail = owner['email']?.toString();
      final oid = owner['userId'];
      if (oid is int) {
        ownerId = oid;
      } else if (oid != null) {
        ownerId = int.tryParse(oid.toString());
      }
    }

    final jockey = json['jockey'];
    int? jockeyId;
    String? jockeyName;
    double? jockeyWeight;
    if (jockey is Map<String, dynamic>) {
      jockeyName = jockey['fullName']?.toString();
      final w = jockey['weight'];
      if (w is num) {
        jockeyWeight = w.toDouble();
      } else if (w != null) {
        jockeyWeight = double.tryParse(w.toString());
      }
      final jid = jockey['userId'];
      if (jid is int) {
        jockeyId = jid;
      } else if (jid != null) {
        jockeyId = int.tryParse(jid.toString());
      }
    }

    final reviewedBy = json['reviewedBy'];
    String? reviewedByName;
    if (reviewedBy is Map<String, dynamic>) {
      reviewedByName = reviewedBy['fullName']?.toString();
    }

    return RaceEntry(
      entryId: json['entryId'] is int
          ? json['entryId'] as int
          : int.tryParse('${json['entryId']}'),
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      horseId: horseId ??
          (json['horseId'] is int
              ? json['horseId'] as int
              : int.tryParse('${json['horseId']}')),
      horseName: horseName ?? json['horseName']?.toString(),
      ownerId: ownerId ??
          (json['ownerId'] is int
              ? json['ownerId'] as int
              : int.tryParse('${json['ownerId']}')),
      ownerName: ownerName ?? json['ownerName']?.toString(),
      ownerEmail: ownerEmail ?? json['ownerEmail']?.toString(),
      jockeyId: jockeyId ??
          (json['jockeyId'] is int
              ? json['jockeyId'] as int
              : int.tryParse('${json['jockeyId']}')),
      jockeyName: jockeyName ?? json['jockeyName']?.toString(),
      jockeyWeight: jockeyWeight,
      status: json['status']?.toString(),
      odds: json['odds'] is num ? (json['odds'] as num).toDouble() : null,
      rejectionReason: json['rejectionReason']?.toString(),
      reviewedAt: _parseDate(json['reviewedAt']),
      reviewedByName: reviewedByName,
      createdAt: _parseDate(json['createdAt']),
    );
  }

  final int? entryId;
  final int? raceId;
  final int? horseId;
  final String? horseName;
  final int? ownerId;
  final String? ownerName;
  final String? ownerEmail;
  final int? jockeyId;
  final String? jockeyName;
  final double? jockeyWeight;
  final String? status;
  final double? odds;
  final String? rejectionReason;
  final DateTime? reviewedAt;
  final String? reviewedByName;
  final DateTime? createdAt;

  bool get isPending => (status ?? '').toUpperCase() == 'PENDING';
  bool get isApproved => (status ?? '').toUpperCase() == 'APPROVED';
  bool get isRejected => (status ?? '').toUpperCase() == 'REJECTED';
}

/// Response thực tế từ GET /api/admin/races/{id}/entries
class EntriesResponse {
  EntriesResponse({
    this.raceId,
    this.raceName,
    this.maxEntries = 8,
    this.approvedCount = 0,
    this.entries = const [],
  });

  factory EntriesResponse.fromJson(Map<String, dynamic> json) {
    final race = json['race'];
    int? raceId;
    String? raceName;
    int maxEntries = 8;
    if (race is Map<String, dynamic>) {
      raceName = race['name']?.toString();
      final id = race['raceId'];
      if (id is int) {
        raceId = id;
      } else if (id != null) {
        raceId = int.tryParse(id.toString());
      }
      final m = race['maxEntries'];
      if (m is int) {
        maxEntries = m;
      } else if (m != null) {
        maxEntries = int.tryParse(m.toString()) ?? 8;
      }
    }

    final rawEntries = json['entries'];
    final entries = rawEntries is List
        ? rawEntries
            .whereType<Map<String, dynamic>>()
            .map(RaceEntry.fromJson)
            .toList()
        : <RaceEntry>[];

    int approvedCount;
    final ac = json['approvedCount'];
    if (ac is int) {
      approvedCount = ac;
    } else if (ac != null) {
      approvedCount = int.tryParse(ac.toString()) ?? 0;
    } else {
      approvedCount = entries.where((e) => e.isApproved).length;
    }

    return EntriesResponse(
      raceId: raceId,
      raceName: raceName,
      maxEntries: maxEntries,
      approvedCount: approvedCount,
      entries: entries,
    );
  }

  final int? raceId;
  final String? raceName;
  final int maxEntries;
  final int approvedCount;
  final List<RaceEntry> entries;

  int get remainingSlots => (maxEntries - approvedCount).clamp(0, maxEntries);

  /// Đếm số entry PENDING có thể duyệt (vẫn còn slot).
  int get availableApprovals => remainingSlots;
}

/// Response từ POST /api/admin/races/{id}/bulk-review
class BulkReviewSummary {
  BulkReviewSummary({
    this.approved = 0,
    this.rejected = 0,
    this.errors = const [],
  });

  factory BulkReviewSummary.fromJson(Map<String, dynamic>? json) {
    if (json == null) return BulkReviewSummary();

    int approved = 0;
    int rejected = 0;
    final eRaw = json['errors'];
    final errs = eRaw is List
        ? eRaw
            .whereType<Map<String, dynamic>>()
            .map((m) => BulkReviewError.fromJson(m))
            .toList()
        : <BulkReviewError>[];

    final a = json['approved'];
    if (a is int) {
      approved = a;
    } else if (a != null) {
      approved = int.tryParse(a.toString()) ?? 0;
    }

    final r = json['rejected'];
    if (r is int) {
      rejected = r;
    } else if (r != null) {
      rejected = int.tryParse(r.toString()) ?? 0;
    }

    return BulkReviewSummary(
      approved: approved,
      rejected: rejected,
      errors: errs,
    );
  }

  final int approved;
  final int rejected;
  final List<BulkReviewError> errors;

  int get total => approved + rejected + errors.length;
  bool get hasErrors => errors.isNotEmpty;
}

class BulkReviewError {
  BulkReviewError({required this.entryId, required this.message});

  factory BulkReviewError.fromJson(Map<String, dynamic> json) => BulkReviewError(
        entryId: json['entryId'] is int
            ? json['entryId'] as int
            : int.tryParse('${json['entryId']}'),
        message: json['error']?.toString() ?? 'Lỗi không xác định',
      );

  final int? entryId;
  final String message;
}

class RefereeOption {
  RefereeOption({required this.userId, required this.fullName, this.email});

  factory RefereeOption.fromJson(Map<String, dynamic> json) => RefereeOption(
        userId: json['userId'] is int
            ? json['userId'] as int
            : int.tryParse('${json['userId']}') ?? 0,
        fullName: json['fullName']?.toString() ?? '',
        email: json['email']?.toString(),
      );

  final int userId;
  final String fullName;
  final String? email;
}

class RefereeAssignment {
  RefereeAssignment({
    this.assignmentId,
    this.raceId,
    this.refereeId,
    this.refereeName,
    this.refereeEmail,
    this.assignedAt,
  });

  factory RefereeAssignment.fromJson(Map<String, dynamic> json) {
    final r = json['referee'] ?? json['user'];
    int? refereeId;
    String? refereeName;
    String? refereeEmail;
    if (r is Map<String, dynamic>) {
      refereeName = r['fullName']?.toString();
      refereeEmail = r['email']?.toString();
      final id = r['userId'];
      if (id is int) {
        refereeId = id;
      } else if (id != null) {
        refereeId = int.tryParse(id.toString());
      }
    }
    return RefereeAssignment(
      assignmentId: json['assignmentId'] is int
          ? json['assignmentId'] as int
          : int.tryParse('${json['assignmentId']}'),
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      refereeId: refereeId ??
          (json['refereeId'] is int
              ? json['refereeId'] as int
              : int.tryParse('${json['refereeId']}')),
      refereeName: refereeName,
      refereeEmail: refereeEmail,
      assignedAt: _parseDate(json['assignedAt']),
    );
  }

  final int? assignmentId;
  final int? raceId;
  final int? refereeId;
  final String? refereeName;
  final String? refereeEmail;
  final DateTime? assignedAt;
}

/// Response cho GET /api/admin/races/{id}/review-conflict
class ConflictResponse {
  ConflictResponse({
    this.raceId,
    this.raceName,
    this.pausedAt,
    this.submissions = const [],
    this.alreadyAgreed = false,
  });

  factory ConflictResponse.fromJson(Map<String, dynamic> json) {
    final race = json['race'];
    int? raceId;
    String? raceName;
    if (race is Map<String, dynamic>) {
      raceName = race['name']?.toString();
      final id = race['raceId'];
      if (id is int) {
        raceId = id;
      } else if (id != null) {
        raceId = int.tryParse(id.toString());
      }
    }

    final raw = json['submissions'] ?? json['reviews'];
    final subs = raw is List
        ? raw
            .whereType<Map<String, dynamic>>()
            .map(ConflictSubmission.fromJson)
            .toList()
        : <ConflictSubmission>[];

    return ConflictResponse(
      raceId: raceId ?? (json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}')),
      raceName: raceName ?? json['raceName']?.toString(),
      pausedAt: _parseDate(json['pausedAt']),
      submissions: subs,
      alreadyAgreed: json['alreadyAgreed'] == true,
    );
  }

  final int? raceId;
  final String? raceName;
  final DateTime? pausedAt;
  final List<ConflictSubmission> submissions;
  final bool alreadyAgreed;

  bool get isPair => submissions.length == 2;

  /// So sánh xem 2 trọng tài có cùng thứ hạng cho từng entry không
  bool get isResolved {
    if (!isPair) return false;
    final a = submissions[0].rankingsByEntry;
    final b = submissions[1].rankingsByEntry;
    if (a.length != b.length) return false;
    for (final id in a.keys) {
      if (b[id]?.rank != a[id]?.rank) return false;
    }
    return true;
  }
}

class ConflictSubmission {
  ConflictSubmission({
    this.refereeId,
    this.refereeName,
    this.submittedAt,
    this.note,
    this.rankings = const [],
  });

  factory ConflictSubmission.fromJson(Map<String, dynamic> json) {
    final r = json['referee'];
    String? refereeName;
    int? refereeId;
    if (r is Map<String, dynamic>) {
      refereeName = r['fullName']?.toString();
      final id = r['userId'];
      if (id is int) {
        refereeId = id;
      } else if (id != null) {
        refereeId = int.tryParse(id.toString());
      }
    }
    final rankingsRaw = json['rankings'];
    final rankings = rankingsRaw is List
        ? rankingsRaw
            .whereType<Map<String, dynamic>>()
            .map(ConflictRanking.fromJson)
            .toList()
        : <ConflictRanking>[];
    return ConflictSubmission(
      refereeId: refereeId ??
          (json['refereeId'] is int
              ? json['refereeId'] as int
              : int.tryParse('${json['refereeId']}')),
      refereeName: refereeName,
      submittedAt: _parseDate(json['submittedAt']),
      note: json['note']?.toString(),
      rankings: rankings,
    );
  }

  final int? refereeId;
  final String? refereeName;
  final DateTime? submittedAt;
  final String? note;
  final List<ConflictRanking> rankings;

  Map<int, ConflictRanking> get rankingsByEntry {
    final m = <int, ConflictRanking>{};
    for (final r in rankings) {
      if (r.entryId != null) m[r.entryId!] = r;
    }
    return m;
  }
}

class ConflictRanking {
  ConflictRanking({
    this.entryId,
    this.horseName,
    this.rank,
    this.status,
    this.finishTime,
  });

  factory ConflictRanking.fromJson(Map<String, dynamic> json) =>
      ConflictRanking(
        entryId: json['entryId'] is int
            ? json['entryId'] as int
            : int.tryParse('${json['entryId']}'),
        horseName: json['horseName']?.toString(),
        rank: json['rank'] is int
            ? json['rank'] as int
            : int.tryParse('${json['rank']}'),
        status: json['status']?.toString(),
        finishTime: json['finishTime'] is int
            ? json['finishTime'] as int
            : int.tryParse('${json['finishTime']}'),
      );

  final int? entryId;
  final String? horseName;
  final int? rank;
  final String? status;
  final int? finishTime;
}

/// Response cho POST /resolve-conflict
class ResolveConflictResult {
  ResolveConflictResult({
    this.raceId,
    this.status,
    this.recordedRankings = 0,
    this.publishedAt,
  });

  factory ResolveConflictResult.fromJson(Map<String, dynamic> json) {
    int? raceId;
    final id = json['raceId'];
    if (id is int) {
      raceId = id;
    } else if (id != null) {
      raceId = int.tryParse(id.toString());
    }
    int recorded = 0;
    final r = json['recordedRankings'] ?? json['rankingsCount'];
    if (r is int) {
      recorded = r;
    } else if (r != null) {
      recorded = int.tryParse(r.toString()) ?? 0;
    }
    return ResolveConflictResult(
      raceId: raceId,
      status: json['status']?.toString(),
      recordedRankings: recorded,
      publishedAt: _parseDate(json['publishedAt']),
    );
  }

  final int? raceId;
  final String? status;
  final int recordedRankings;
  final DateTime? publishedAt;
}

/// Response cho GET /api/admin/races?status=...
class AdminRacesListResponse {
  AdminRacesListResponse({
    this.races = const [],
    this.total = 0,
    this.page = 1,
    this.pageSize = 20,
  });

  factory AdminRacesListResponse.fromJson(Map<String, dynamic> json) {
    final racesRaw = json['races'] ?? json['data'];
    final races = racesRaw is List
        ? racesRaw
            .whereType<Map<String, dynamic>>()
            .map(AdminRace.fromJson)
            .toList()
        : <AdminRace>[];

    int total = 0;
    final t = json['total'] ?? json['count'];
    if (t is int) {
      total = t;
    } else if (t != null) {
      total = int.tryParse(t.toString()) ?? 0;
    }

    int page = 1;
    final p = json['page'];
    if (p is int) {
      page = p;
    } else if (p != null) {
      page = int.tryParse(p.toString()) ?? 1;
    }

    int pageSize = 20;
    final ps = json['pageSize'] ?? json['limit'];
    if (ps is int) {
      pageSize = ps;
    } else if (ps != null) {
      pageSize = int.tryParse(ps.toString()) ?? 20;
    }

    return AdminRacesListResponse(
      races: races,
      total: total,
      page: page,
      pageSize: pageSize,
    );
  }

  final List<AdminRace> races;
  final int total;
  final int page;
  final int pageSize;

  bool get hasMore => page * pageSize < total;
}

/// Response cho GET /api/admin/races/:id/ai-odds
class AiOddsResponse {
  AiOddsResponse({
    this.raceId,
    this.raceName,
    this.generatedAt,
    this.suggestions = const [],
    this.summary,
  });

  factory AiOddsResponse.fromJson(Map<String, dynamic> json) {
    final suggestionsRaw = json['suggestions'] ?? json['odds'];
    final suggestions = suggestionsRaw is List
        ? suggestionsRaw
            .whereType<Map<String, dynamic>>()
            .map(AiOddsSuggestion.fromJson)
            .toList()
        : <AiOddsSuggestion>[];

    return AiOddsResponse(
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      raceName: json['raceName']?.toString(),
      generatedAt: _parseDate(json['generatedAt']),
      suggestions: suggestions,
      summary: AiOddsSummary.fromJson(json['summary']),
    );
  }

  final int? raceId;
  final String? raceName;
  final DateTime? generatedAt;
  final List<AiOddsSuggestion> suggestions;
  final AiOddsSummary? summary;
}

class AiOddsSuggestion {
  AiOddsSuggestion({
    this.entryId,
    this.horseName,
    this.winProbability = 0,
    this.fairOdds = 0,
    this.suggestedOdds = 0,
    this.confidence = 'MEDIUM',
  });

  factory AiOddsSuggestion.fromJson(Map<String, dynamic> json) {
    String confidence = 'MEDIUM';
    final c = json['confidence']?.toString().toUpperCase();
    if (c != null && (c == 'HIGH' || c == 'MEDIUM' || c == 'LOW')) {
      confidence = c;
    }

    return AiOddsSuggestion(
      entryId: json['entryId'] is int
          ? json['entryId'] as int
          : int.tryParse('${json['entryId']}'),
      horseName: json['horseName']?.toString() ?? json['horse']?.toString(),
      winProbability: json['winProbability'] is num
          ? (json['winProbability'] as num).toDouble()
          : double.tryParse('${json['winProbability']}') ?? 0,
      fairOdds: json['fairOdds'] is num
          ? (json['fairOdds'] as num).toDouble()
          : double.tryParse('${json['fairOdds']}') ?? 0,
      suggestedOdds: json['suggestedOdds'] is num
          ? (json['suggestedOdds'] as num).toDouble()
          : double.tryParse('${json['suggestedOdds']}') ?? 0,
      confidence: confidence,
    );
  }

  final int? entryId;
  final String? horseName;
  final double winProbability;
  final double fairOdds;
  final double suggestedOdds;
  final String confidence;

  double get impliedOdds => winProbability > 0 ? 1 / winProbability : 0;
  double get oddsGap => suggestedOdds - fairOdds;
  bool get isUndervalued => suggestedOdds > fairOdds;
}

class AiOddsSummary {
  AiOddsSummary({
    this.totalEntries = 0,
    this.avgConfidence = 'MEDIUM',
    this.marketVolatility = 0,
    this.topPick,
  });

  factory AiOddsSummary.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      return AiOddsSummary();
    }

    String avgConfidence = 'MEDIUM';
    final c = json['avgConfidence']?.toString().toUpperCase();
    if (c != null && (c == 'HIGH' || c == 'MEDIUM' || c == 'LOW')) {
      avgConfidence = c;
    }

    AiOddsSuggestion? topPick;
    final tp = json['topPick'];
    if (tp is Map<String, dynamic>) {
      topPick = AiOddsSuggestion.fromJson(tp);
    }

    return AiOddsSummary(
      totalEntries: json['totalEntries'] is int
          ? json['totalEntries'] as int
          : int.tryParse('${json['totalEntries']}') ?? 0,
      avgConfidence: avgConfidence,
      marketVolatility: json['marketVolatility'] is num
          ? (json['marketVolatility'] as num).toDouble()
          : double.tryParse('${json['marketVolatility']}') ?? 0,
      topPick: topPick,
    );
  }

  final int totalEntries;
  final String avgConfidence;
  final double marketVolatility;
  final AiOddsSuggestion? topPick;
}

/// Response cho GET /api/admin/races/:id/risk-score?treasury=...
class RiskScoreResponse {
  RiskScoreResponse({
    this.raceId,
    this.raceName,
    this.treasury = 0,
    this.riskScore = 0,
    this.riskLevel = 'LOW',
    this.totalPool = 0,
    this.worstCaseLiability = 0,
    this.scenarios = const [],
    this.recommendations = const [],
  });

  factory RiskScoreResponse.fromJson(Map<String, dynamic> json) {
    final scenariosRaw = json['scenarios'];
    final scenarios = scenariosRaw is List
        ? scenariosRaw
            .whereType<Map<String, dynamic>>()
            .map(RiskScenario.fromJson)
            .toList()
        : <RiskScenario>[];

    final recsRaw = json['recommendations'];
    final recommendations = recsRaw is List
        ? recsRaw.whereType<String>().toList()
        : <String>[];

    String riskLevel = 'LOW';
    final r = json['riskLevel']?.toString().toUpperCase();
    if (r != null && (r == 'LOW' || r == 'MEDIUM' || r == 'HIGH' || r == 'CRITICAL')) {
      riskLevel = r;
    }

    return RiskScoreResponse(
      raceId: json['raceId'] is int
          ? json['raceId'] as int
          : int.tryParse('${json['raceId']}'),
      raceName: json['raceName']?.toString(),
      treasury: json['treasury'] is num
          ? (json['treasury'] as num).toDouble()
          : double.tryParse('${json['treasury']}') ?? 0,
      riskScore: json['riskScore'] is num
          ? (json['riskScore'] as num).toDouble()
          : double.tryParse('${json['riskScore']}') ?? 0,
      riskLevel: riskLevel,
      totalPool: json['totalPool'] is num
          ? (json['totalPool'] as num).toDouble()
          : double.tryParse('${json['totalPool']}') ?? 0,
      worstCaseLiability: json['worstCaseLiability'] is num
          ? (json['worstCaseLiability'] as num).toDouble()
          : double.tryParse('${json['worstCaseLiability']}') ?? 0,
      scenarios: scenarios,
      recommendations: recommendations,
    );
  }

  final int? raceId;
  final String? raceName;
  final double treasury;
  final double riskScore;
  final String riskLevel;
  final double totalPool;
  final double worstCaseLiability;
  final List<RiskScenario> scenarios;
  final List<String> recommendations;

  double get coverageRatio => worstCaseLiability > 0 ? treasury / worstCaseLiability : 999;
  bool get isHealthyCoverage => coverageRatio >= 1.0;
}

class RiskScenario {
  RiskScenario({
    this.entryId,
    this.horseName,
    this.betType,
    this.poolAmount = 0,
    this.payoutIfWin = 0,
    this.probability = 0,
  });

  factory RiskScenario.fromJson(Map<String, dynamic> json) {
    return RiskScenario(
      entryId: json['entryId'] is int
          ? json['entryId'] as int
          : int.tryParse('${json['entryId']}'),
      horseName: json['horseName']?.toString(),
      betType: json['betType']?.toString(),
      poolAmount: json['poolAmount'] is num
          ? (json['poolAmount'] as num).toDouble()
          : double.tryParse('${json['poolAmount']}') ?? 0,
      payoutIfWin: json['payoutIfWin'] is num
          ? (json['payoutIfWin'] as num).toDouble()
          : double.tryParse('${json['payoutIfWin']}') ?? 0,
      probability: json['probability'] is num
          ? (json['probability'] as num).toDouble()
          : double.tryParse('${json['probability']}') ?? 0,
    );
  }

  final int? entryId;
  final String? horseName;
  final String? betType;
  final double poolAmount;
  final double payoutIfWin;
  final double probability;
}

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  return DateTime.tryParse(value.toString());
}
