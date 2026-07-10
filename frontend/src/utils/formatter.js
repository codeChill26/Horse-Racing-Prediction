

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
