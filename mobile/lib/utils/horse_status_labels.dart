import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

String horseStatusLabelVi(String? status) {
  switch (status) {
    case 'PENDING':
      return 'Chờ duyệt';
    case 'APPROVED':
      return 'Đã duyệt';
    case 'REJECTED':
      return 'Từ chối';
    case 'INACTIVE':
      return 'Ngừng hoạt động';
    default:
      return status ?? 'Không rõ';
  }
}

Color horseStatusColor(String? status) {
  switch (status) {
    case 'PENDING':
      return const Color(0xFFD97706);
    case 'APPROVED':
      return AppColors.ownerTeal;
    case 'REJECTED':
      return AppColors.errorText;
    case 'INACTIVE':
      return AppColors.textMuted;
    default:
      return AppColors.textMuted;
  }
}
