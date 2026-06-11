class JockeyInvitation {
  JockeyInvitation({
    required this.invitationId,
    required this.status,
    this.raceId,
    this.horseId,
    this.jockeyId,
    this.declineReason,
    this.createdAt,
    this.raceName,
    this.horseName,
    this.jockeyName,
    this.jockeyEmail,
    this.ownerName,
    this.ownerEmail,
  });

  factory JockeyInvitation.fromJson(Map<String, dynamic> json) {
    final race = json['race'];
    final horse = json['horse'];
    final jockey = json['jockey'];
    final owner = json['owner'];

    return JockeyInvitation(
      invitationId: json['invitationId'] is int
          ? json['invitationId'] as int
          : int.parse('${json['invitationId']}'),
      status: json['status']?.toString() ?? 'PENDING',
      raceId: json['raceId'] is int ? json['raceId'] as int : int.tryParse('${json['raceId']}'),
      horseId: json['horseId'] is int ? json['horseId'] as int : int.tryParse('${json['horseId']}'),
      jockeyId: json['jockeyId'] is int ? json['jockeyId'] as int : int.tryParse('${json['jockeyId']}'),
      declineReason: json['declineReason']?.toString(),
      createdAt: json['createdAt']?.toString(),
      raceName: race is Map ? race['name']?.toString() : null,
      horseName: horse is Map ? horse['name']?.toString() : null,
      jockeyName: jockey is Map ? jockey['fullName']?.toString() : null,
      jockeyEmail: jockey is Map ? jockey['email']?.toString() : null,
      ownerName: owner is Map ? owner['fullName']?.toString() : null,
      ownerEmail: owner is Map ? owner['email']?.toString() : null,
    );
  }

  final int invitationId;
  final String status;
  final int? raceId;
  final int? horseId;
  final int? jockeyId;
  final String? declineReason;
  final String? createdAt;
  final String? raceName;
  final String? horseName;
  final String? jockeyName;
  final String? jockeyEmail;
  final String? ownerName;
  final String? ownerEmail;

  bool get canConfirm => status == 'ACCEPTED';
  bool get canRespond => status == 'PENDING';
}
