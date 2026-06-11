import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

String invitationStatusLabelVi(String status) {
  switch (status) {
    case 'PENDING':
      return 'Đang chờ';
    case 'ACCEPTED':
      return 'Đã đồng ý';
    case 'DECLINED':
      return 'Đã từ chối';
    case 'CANCELLED':
      return 'Đã hủy';
    default:
      return status;
  }
}

Color invitationStatusColor(String status) {
  switch (status) {
    case 'PENDING':
      return const Color(0xFFD97706);
    case 'ACCEPTED':
      return AppColors.ownerTeal;
    case 'DECLINED':
      return AppColors.errorText;
    case 'CANCELLED':
      return AppColors.textMuted;
    default:
      return AppColors.textMuted;
  }
}
