const roleLabelsVi = {
  'ADMIN': 'Quản trị viên',
  'RACE_REFEREE': 'Trọng tài',
  'HORSE_OWNER': 'Chủ ngựa',
  'JOCKEY': 'Kỵ sĩ',
  'SPECTATOR': 'Khán giả',
};

String roleLabelVi(String? roleCode) {
  if (roleCode == null || roleCode.isEmpty) return 'Người dùng';
  return roleLabelsVi[roleCode.trim().toUpperCase()] ?? roleCode;
}
