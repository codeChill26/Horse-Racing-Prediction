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

/**
 * Kiểm tra điều kiện chuyển OPEN → ONGOING
 * @param {object} tournament
 * @param {number} entryCount - Số entry đã APPROVED trong tournament
 * @param {object} referees - { refereeA, refereeB } - referee acceptance status
 * @returns {{ ready: boolean, reasons: string[] }}
 */
export function checkTournamentReadyToStart(tournament, entryCount = 0, referees = {}) {
  const reasons = [];
  if (tournament.status !== "OPEN") {
    reasons.push("Giải đấu không ở trạng thái Đang mở");
  }
  if (entryCount < 1) {
    reasons.push("Cần ít nhất 1 ngựa đăng ký được duyệt");
  }
  if (!referees.refereeAId) {
    reasons.push("Chưa phân công trọng tài A");
  }
  if (!referees.refereeBId) {
    reasons.push("Chưa phân công trọng tài B");
  }
  return {
    ready: reasons.length === 0,
    reasons,
  };
}
