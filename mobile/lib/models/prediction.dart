import '../utils/format_utils.dart';

num _asNum(dynamic v) {
  if (v is num) return v;
  if (v is String) return num.tryParse(v) ?? 0;
  return 0;
}

/// Thông tin 1 ngựa được chọn trong cược (pick1/pick2).
class RaceEntryLite {
  RaceEntryLite({this.entryId, this.horseId, this.horseName});

  factory RaceEntryLite.fromJson(Map<String, dynamic>? json) {
    if (json == null) return RaceEntryLite();
    final horse = json['horse'];
    return RaceEntryLite(
      entryId: json['entryId'] is num
          ? (json['entryId'] as num).toInt()
          : int.tryParse(json['entryId']?.toString() ?? ''),
      horseId: horse is Map<String, dynamic>
          ? (horse['horseId'] is num
              ? (horse['horseId'] as num).toInt()
              : int.tryParse(horse['horseId']?.toString() ?? ''))
          : null,
      horseName: horse is Map<String, dynamic>
          ? horse['name']?.toString()
          : null,
    );
  }

  final int? entryId;
  final int? horseId;
  final String? horseName;
}

/// Race được include trong prediction.
class RaceLite {
  RaceLite({this.raceId, this.name, this.status, this.publishedAt});

  factory RaceLite.fromJson(Map<String, dynamic>? json) {
    if (json == null) return RaceLite();
    return RaceLite(
      raceId: json['raceId'] is num
          ? (json['raceId'] as num).toInt()
          : int.tryParse(json['raceId']?.toString() ?? ''),
      name: json['name']?.toString(),
      status: json['status']?.toString(),
      publishedAt: json['publishedAt']?.toString(),
    );
  }

  final int? raceId;
  final String? name;
  final String? status;
  final String? publishedAt;
}

/// Bản ghi cược của khán giả (Prediction).
class Prediction {
  Prediction({
    this.predictionId,
    this.spectatorId,
    this.raceId,
    this.betType,
    this.entryId1,
    this.entryId2,
    this.betAmount = 0,
    this.lockedOdds,
    this.status,
    this.createdAt,
    this.race,
    this.pick1,
    this.pick2,
  });

  factory Prediction.fromJson(Map<String, dynamic> json) {
    return Prediction(
      predictionId: json['predictionId'] is num
          ? (json['predictionId'] as num).toInt()
          : int.tryParse(json['predictionId']?.toString() ?? ''),
      spectatorId: json['spectatorId'] is num
          ? (json['spectatorId'] as num).toInt()
          : int.tryParse(json['spectatorId']?.toString() ?? ''),
      raceId: json['raceId'] is num
          ? (json['raceId'] as num).toInt()
          : int.tryParse(json['raceId']?.toString() ?? ''),
      betType: json['betType']?.toString(),
      entryId1: json['entryId1'] is num
          ? (json['entryId1'] as num).toInt()
          : int.tryParse(json['entryId1']?.toString() ?? ''),
      entryId2: json['entryId2'] is num
          ? (json['entryId2'] as num).toInt()
          : int.tryParse(json['entryId2']?.toString() ?? ''),
      betAmount: _asNum(json['betAmount']),
      lockedOdds: json['lockedOdds'] == null ? null : _asNum(json['lockedOdds']),
      status: json['status']?.toString(),
      createdAt: json['createdAt']?.toString(),
      race: RaceLite.fromJson(json['race'] is Map<String, dynamic> ? json['race'] : null),
      pick1: RaceEntryLite.fromJson(json['pick1'] is Map<String, dynamic> ? json['pick1'] : null),
      pick2: RaceEntryLite.fromJson(json['pick2'] is Map<String, dynamic> ? json['pick2'] : null),
    );
  }

  final int? predictionId;
  final int? spectatorId;
  final int? raceId;
  final String? betType;
  final int? entryId1;
  final int? entryId2;
  final num betAmount;
  final num? lockedOdds;
  final String? status;
  final String? createdAt;
  final RaceLite? race;
  final RaceEntryLite? pick1;
  final RaceEntryLite? pick2;

  String get betAmountLabel => formatPointsVi(betAmount);

  bool get canCancel => status == 'PENDING';

  String describeSelections() {
    final p1 = pick1?.horseName ?? 'Ngựa #${entryId1 ?? '?'}';
    final p2 = pick2?.horseName;
    final type = betType ?? '?';
    if (p2 == null) return '$type: $p1';
    return '$type: $p1 & $p2';
  }
}
