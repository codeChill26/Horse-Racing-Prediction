const STATUS_LABELS = {
  DRAFT: "Nháp",
  OPEN: "Đang mở",
  ONGOING: "Đang diễn ra",
  FINISHED: "Đã kết thúc",
  CANCELLED: "Đã hủy",
};

const STATUS_CLASS = {
  DRAFT: "adm-t-status--draft",
  OPEN: "adm-t-status--open",
  ONGOING: "adm-t-status--ongoing",
  FINISHED: "adm-t-status--finished",
  CANCELLED: "adm-t-status--cancelled",
};

export function tournamentStatusLabel(status) {
  if (!status) return "—";
  return STATUS_LABELS[String(status).toUpperCase()] ?? status;
}

export function tournamentStatusClass(status) {
  if (!status) return "adm-t-status";
  return `adm-t-status ${STATUS_CLASS[String(status).toUpperCase()] ?? ""}`.trim();
}

export const TOURNAMENT_STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: STATUS_LABELS.DRAFT },
  { value: "OPEN", label: STATUS_LABELS.OPEN },
  { value: "ONGOING", label: STATUS_LABELS.ONGOING },
  { value: "FINISHED", label: STATUS_LABELS.FINISHED },
  { value: "CANCELLED", label: STATUS_LABELS.CANCELLED },
];

export const TOURNAMENT_TRANSITIONS = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["ONGOING", "CANCELLED"],
  ONGOING: ["FINISHED", "CANCELLED"],
  FINISHED: [],
  CANCELLED: [],
};
