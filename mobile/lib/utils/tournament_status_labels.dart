import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

const tournamentStatusCodes = [
  'DRAFT',
  'OPEN',
  'ONGOING',
  'FINISHED',
  'CANCELLED',
];

const allowedStatusTransitions = <String, List<String>>{
  'DRAFT': ['OPEN', 'CANCELLED'],
  'OPEN': ['ONGOING', 'CANCELLED'],
  'ONGOING': ['FINISHED', 'CANCELLED'],
  'FINISHED': [],
  'CANCELLED': [],
};

String tournamentStatusLabelVi(String? code) {
  switch (code?.toUpperCase()) {
    case 'DRAFT':
      return 'Nháp';
    case 'OPEN':
      return 'Mở đăng ký';
    case 'ONGOING':
      return 'Đang diễn ra';
    case 'FINISHED':
      return 'Đã kết thúc';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return code ?? '—';
  }
}

Color tournamentStatusColor(String? code) {
  switch (code?.toUpperCase()) {
    case 'DRAFT':
      return const Color(0xFF64748B);
    case 'OPEN':
      return const Color(0xFF0369A1);
    case 'ONGOING':
      return const Color(0xFF0F766E);
    case 'FINISHED':
      return const Color(0xFF065F46);
    case 'CANCELLED':
      return const Color(0xFF991B1B);
    default:
      return AppColors.textMuted;
  }
}

Color tournamentStatusBg(String? code) {
  switch (code?.toUpperCase()) {
    case 'DRAFT':
      return const Color(0xFFF1F5F9);
    case 'OPEN':
      return const Color(0xFFE0F2FE);
    case 'ONGOING':
      return const Color(0xFFCCFBF1);
    case 'FINISHED':
      return const Color(0xFFECFDF5);
    case 'CANCELLED':
      return const Color(0xFFFEF2F2);
    default:
      return AppColors.adminBg;
  }
}

List<String> nextStatusesFor(String? current) {
  return allowedStatusTransitions[current?.toUpperCase() ?? ''] ?? [];
}

String formatTournamentDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final dt = DateTime.tryParse(iso);
  if (dt == null) return iso;
  final local = dt.toLocal();
  final d = local.day.toString().padLeft(2, '0');
  final m = local.month.toString().padLeft(2, '0');
  final h = local.hour.toString().padLeft(2, '0');
  final min = local.minute.toString().padLeft(2, '0');
  return '$d/$m/${local.year} $h:$min';
}
