class OwnerHorse {
  OwnerHorse({
    required this.horseId,
    required this.name,
    this.breed,
    this.status,
  });

  factory OwnerHorse.fromJson(Map<String, dynamic> json) {
    return OwnerHorse(
      horseId: json['horseId'] is int
          ? json['horseId'] as int
          : int.parse('${json['horseId']}'),
      name: json['name']?.toString() ?? '',
      breed: json['breed']?.toString(),
      status: json['status']?.toString(),
    );
  }

  final int horseId;
  final String name;
  final String? breed;
  final String? status;

  bool get isApproved => status == 'APPROVED';
}
