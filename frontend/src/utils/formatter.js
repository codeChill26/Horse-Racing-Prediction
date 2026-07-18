

// chuyen đổi điểm số thành định dạng dễ đọc hơn, ví dụ 1500000 -> 1.5M
export function formatPoints(points) {
  if (points === undefined || points === null) return "0";
  const n = Number(points);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000000) {
    return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  return new Intl.NumberFormat("vi-VN").format(n);
}

// Map english roles to beautiful Vietnamese titles
export function mapUserRoleToVietnamese(role) {
  const mapping = {
    "Horse Owner": "Chủ ngựa",
    "Jockey": "Tay đua ngựa",
    "Spectator": "Khán giả",
    "Referee": "Trọng tài"
  };
  return mapping[role] || role;
}

// Format Date text
export function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch {
    // trả về gốc
    return dateString;
  }
}

// Convert English statuses to proper Vietnamese labels
export function mapStatusToVietnamese(status) {
  const mapping = {
    // Horse status
    "Pending": "Chờ duyệt",
    "Active": "Đang hoạt động",
    "Suspended": "Đình chỉ",
    "Retired": "Giải nghệ",

    // User status
    "Locked": "Đã khóa",

    // Race registration status
    "Registration Open": "Đang mở đăng ký",
    "Registration Closed": "Đã đóng đăng ký",
    "Finished": "Đã kết thúc",

    // Entry status
    "Pending Review": "Đang thẩm định",
    "Approved": "Đã chấp thuận",
    "Rejected": "Đã từ chối",
    "Resolved": "Đã xử lý"
  };
  return mapping[status] || status;
}

// Get the corresponding Tailwind status color classes
export function getStatusColorClass(status) {
  switch (status) {
    case "Active":
    case "Approved":
    case "Registration Open":
      return "bg-primary/10 text-primary border border-primary/30";
    case "Pending":
    case "Pending Review":
    case "Upcoming":
      return "bg-secondary/10 text-secondary border border-secondary/30";
    case "Suspended":
    case "Locked":
    case "Rejected":
    case "Retired":
      return "bg-error/10 text-error border border-error/30";
    case "Completed":
    case "Finished":
    case "Resolved":
      return "bg-surface-container-highest text-on-surface-variant border border-outline-variant";
    default:
      return "bg-surface-container text-on-surface-variant border border-outline-variant";
  }
}

// Map PredictionStatus enum sang tiếng Việt
export function mapPredictionStatus(status) {
  const mapping = {
    PENDING: "Đang chờ",
    WON: "Thắng",
    PARTIAL_WON: "Thắng một phần",
    LOST: "Thua",
    REFUNDED: "Đã hoàn tiền",
  };
  return mapping[status] || status || "—";
}

// Map BetType enum sang tiếng Việt
export function mapBetType(betType) {
  const mapping = {
    WIN: "WIN (Thắng)",
    PLACE: "PLACE (Top 2)",
    SHOW: "SHOW (Top 3)",
    QUINELLA: "QUINELLA (Top 1-2)",
    EXACTA: "EXACTA (Đúng thứ tự)",
  };
  return mapping[betType] || betType || "—";
}

// Map WalletTransaction.type sang tiếng Việt
export function mapWalletTxType(type) {
  const mapping = {
    BET_PLACED: "Đặt cược",
    BET_REFUND: "Hoàn cược",
    BET_WIN: "Thắng cược",
    BET_WIN_REVERSAL: "Hoàn tiền thắng",
    WEEKLY_BONUS: "Thưởng tuần",
    ADMIN_ADJUSTMENT: "Admin điều chỉnh",
    DEPOSIT: "Nạp điểm",
    INITIAL_BONUS: "Thưởng ban đầu",
    HOUSE_MARGIN: "Phí sàn",
    TREASURE_IN: "Quỹ dự phòng +",
    TREASURE_OUT: "Quỹ dự phòng -",
  };
  return mapping[type] || type || "—";
}

// Format datetime dạng "HH:mm dd/MM/yyyy"
export function formatDateTime(dateString) {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}
