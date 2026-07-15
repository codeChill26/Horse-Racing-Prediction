import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/public_tournament.dart';
import '../models/race_summary.dart';

/// API công khai — không cần đăng nhập (OPEN / ONGOING / FINISHED).
class TournamentsService {
  Future<Map<String, dynamic>?> _decodeBody(http.Response res) async {
    try {
      return jsonDecode(res.body) as Map<String, dynamic>?;
    } catch (_) {
      return null;
    }
  }

  void _throwIfFailed(http.Response res, Map<String, dynamic>? data, String fallback) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    final msg = data?['error'] ?? data?['message'] ?? '$fallback (${res.statusCode})';
    throw Exception(msg.toString());
  }

  Future<List<PublicTournament>> listTournaments() async {
    final res = await http.get(ApiConfig.uri('/api/tournaments'));
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách giải đấu');

    final tournaments = data?['tournaments'];
    if (tournaments is! List) return [];
    return tournaments
        .whereType<Map<String, dynamic>>()
        .map(PublicTournament.fromJson)
        .toList();
  }

  Future<PublicTournament> getTournamentById(int id) async {
    final res = await http.get(ApiConfig.uri('/api/tournaments/$id'));
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được chi tiết giải đấu');

    final tournament = data?['tournament'];
    if (tournament is! Map<String, dynamic>) {
      throw Exception('Phản hồi không có dữ liệu giải đấu');
    }
    return PublicTournament.fromJson(tournament);
  }

  Future<List<RaceSummary>> listRacesByTournamentId(int tournamentId) async {
    final res = await http.get(ApiConfig.uri('/api/tournaments/$tournamentId/races'));
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách chặng đua');

    final races = data?['races'];
    if (races is! List) return [];
    return races
        .whereType<Map<String, dynamic>>()
        .map(RaceSummary.fromJson)
        .toList();
  }

  /// GET /api/races/:id/detail — trả về race + entries (kèm tên ngựa, jockey, odds).
  Future<RaceDetail> getRaceDetail(int raceId) async {
    final res = await http.get(ApiConfig.uri('/api/races/$raceId/detail'));
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được chi tiết chặng đua');
    if (data == null) {
      throw Exception('Phản hồi rỗng cho chi tiết chặng đua');
    }
    return RaceDetail.fromJson(data);
  }

  /// GET /api/races/bettable — danh sách race khán giả có thể đặt cược.
  /// Dùng để đổ vào dropdown ở màn `PlaceBetScreen` khi vào từ nơi không
  /// có race cụ thể (FAB, nút nhanh ở Trang chủ / tab Ví).
  Future<List<RaceSummary>> listBettableRaces() async {
    final res = await http.get(ApiConfig.uri('/api/races/bettable'));
    final data = await _decodeBody(res);
    _throwIfFailed(res, data, 'Không tải được danh sách chặng có thể cược');

    final races = data?['races'];
    if (races is! List) return [];
    return races
        .whereType<Map<String, dynamic>>()
        .map(RaceSummary.fromJson)
        .toList();
  }
}