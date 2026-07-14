import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

const raceStatusCodes = [
  'SCHEDULED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'IN_PROGRESS',
  'PENDING_RESULT',
  'PAUSED',
  'FINISHED',
  'CANCELLED',
];

const raceMainFlow = [
  'SCHEDULED',
  'REGISTRATION_OPEN',
  'REGISTRATION_CLOSED',
  'IN_PROGRESS',
  'PENDING_RESULT',
  'FINISHED',
];

String raceStatusLabelVi(String? code) {
  switch (code?.toUpperCase()) {
    case 'SCHEDULED':
      return 'Đã lên lịch';
    case 'REGISTRATION_OPEN':
      return 'Đang mở ĐK';
    case 'REGISTRATION_CLOSED':
      return 'Đã đóng ĐK';
    case 'IN_PROGRESS':
      return 'Đang chạy';
    case 'PENDING_RESULT':
      return 'Chờ kết quả';
    case 'PAUSED':
      return 'Tạm dừng';
    case 'FINISHED':
      return 'Đã kết thúc';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return code ?? '—';
  }
}

Color raceStatusColor(String? code) {
  switch (code?.toUpperCase()) {
    case 'SCHEDULED':
      return const Color(0xFF64748B);
    case 'REGISTRATION_OPEN':
      return const Color(0xFF0369A1);
    case 'REGISTRATION_CLOSED':
      return const Color(0xFF7C3AED);
    case 'IN_PROGRESS':
      return const Color(0xFF0F766E);
    case 'PENDING_RESULT':
      return const Color(0xFFD97706);
    case 'PAUSED':
      return const Color(0xFFB91C1C);
    case 'FINISHED':
      return const Color(0xFF065F46);
    case 'CANCELLED':
      return AppColors.errorText;
    default:
      return AppColors.textMuted;
  }
}

Color raceStatusBg(String? code) {
  switch (code?.toUpperCase()) {
    case 'SCHEDULED':
      return const Color(0xFFF1F5F9);
    case 'REGISTRATION_OPEN':
      return const Color(0xFFE0F2FE);
    case 'REGISTRATION_CLOSED':
      return const Color(0xFFEDE9FE);
    case 'IN_PROGRESS':
      return const Color(0xFFCCFBF1);
    case 'PENDING_RESULT':
      return const Color(0xFFFEF3C7);
    case 'PAUSED':
      return const Color(0xFFFEE2E2);
    case 'FINISHED':
      return const Color(0xFFECFDF5);
    case 'CANCELLED':
      return AppColors.errorBg;
    default:
      return AppColors.adminBg;
  }
}

String formatRaceDateTime(DateTime? dt) {
  if (dt == null) return '—';
  final d = dt.day.toString().padLeft(2, '0');
  final m = dt.month.toString().padLeft(2, '0');
  final h = dt.hour.toString().padLeft(2, '0');
  final min = dt.minute.toString().padLeft(2, '0');
  return '$d/$m/${dt.year} $h:$min';
}
