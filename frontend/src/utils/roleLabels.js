const ROLE_LABELS_VI = {
  ADMIN: "Quản trị viên",
  RACE_REFEREE: "Trọng tài",
  HORSE_OWNER: "Chủ ngựa",
  JOCKEY: "Kỵ sĩ",
  SPECTATOR: "Khán giả",
};

export const ROLE_CODES = ["ADMIN", "RACE_REFEREE", "HORSE_OWNER", "JOCKEY", "SPECTATOR"];

export function roleLabelVi(roleCode) {
  if (!roleCode) return "Người dùng";
  return ROLE_LABELS_VI[String(roleCode).toUpperCase()] ?? roleCode;
}

export const ROLE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả vai trò" },
  ...ROLE_CODES.map((code) => ({ value: code, label: roleLabelVi(code) })),
];
