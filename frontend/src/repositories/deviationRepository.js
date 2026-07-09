/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deviation Repository
 *
 * API chưa tồn tại - sử dụng mock data tạm thời.
 * TODO: waiting backend API
 */

import { getAccessToken } from "../utils/token";

async function readError(res, fallback) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  throw new Error(data?.error || data?.message || `${fallback} (${res.status})`);
}

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// TODO: waiting backend API
const MOCK_DEVIATIONS = [
  {
    id: "DEV-001",
    type: "Kết quả vạch đích",
    raceId: 12,
    raceName: "Chung kết Belmont Stakes",
    reporter: "Camera Tower A",
    reporterRole: "SYSTEM",
    description: "Thứ tự về đích vị trí 2 và 3 bị mờ, hai tháp camera ghi nhận khác nhau. Cần xác minh qua camera chủ tốc độ cao.",
    severity: "HIGH",
    status: "PENDING",
    createdAt: "2026-06-15T08:32:00Z",
    history: [
      {
        action: "CREATED",
        performedBy: "Camera Tower A",
        at: "2026-06-15T08:32:00Z",
        note: "Tự động phát hiện qua AI.",
      },
    ],
    adminNote: null,
  },
  {
    id: "DEV-002",
    type: "Thời gian chặng",
    raceId: 11,
    raceName: "Vòng loại Kentucky Derby",
    reporter: "Hệ thống TimingChip",
    reporterRole: "SYSTEM",
    description: "Chip thời gian ngựa số 4 báo trễ 0.3s so với camera tự động. Có thể do va chạm làm chip bị văng.",
    severity: "MEDIUM",
    status: "REVIEWING",
    createdAt: "2026-06-14T15:18:00Z",
    history: [
      {
        action: "CREATED",
        performedBy: "Hệ thống TimingChip",
        at: "2026-06-14T15:18:00Z",
        note: "Phát hiện bất thường thời gian.",
      },
      {
        action: "REVIEWING",
        performedBy: "Trọng tài #3 (Nguyễn Văn B)",
        at: "2026-06-14T16:45:00Z",
        note: "Đang kiểm tra lại footage.",
      },
    ],
    adminNote: null,
  },
  {
    id: "DEV-003",
    type: "Trọng tài xung đột",
    raceId: 10,
    raceName: "Preakness Stakes",
    reporter: "Trọng tài #4",
    reporterRole: "RACE_REFEREE",
    description: "Hai trọng tài đưa ra phán quyết khác nhau về pha chạm rào ở lượt 5. Trọng tài #4 cho rằng chạm, trọng tài #7 không đồng ý.",
    severity: "CRITICAL",
    status: "PENDING",
    createdAt: "2026-06-13T11:00:00Z",
    history: [
      {
        action: "CREATED",
        performedBy: "Trọng tài #4",
        at: "2026-06-13T11:00:00Z",
        note: "Báo cáo xung đột phán quyết.",
      },
    ],
    adminNote: null,
  },
  {
    id: "DEV-004",
    type: "Điểm phạt sai",
    raceId: 9,
    raceName: "Tournament GrandStride 2026",
    reporter: "Hệ thống Score",
    reporterRole: "SYSTEM",
    description: "Tính điểm trừ 2s cho ngựa #7 nhưng hình ảnh không xác nhận lỗi. Ngựa không chạm rào.",
    severity: "LOW",
    status: "RESOLVED",
    createdAt: "2026-06-12T09:45:00Z",
    history: [
      {
        action: "CREATED",
        performedBy: "Hệ thống Score",
        at: "2026-06-12T09:45:00Z",
        note: "Phát hiện bất thường điểm.",
      },
      {
        action: "RESOLVED",
        performedBy: "Quản trị viên",
        at: "2026-06-12T14:30:00Z",
        note: "Đã điều chỉnh điểm chính xác. Không có lỗi từ kỵ sĩ.",
      },
    ],
    adminNote: "Đã điều chỉnh điểm chính xác. Không có lỗi từ kỵ sĩ.",
  },
  {
    id: "DEV-005",
    type: "Cổng đăng ký",
    raceId: 8,
    raceName: "Arc de Triomphe",
    reporter: "Hệ thống đăng ký",
    reporterRole: "SYSTEM",
    description: "Cổng đăng ký đóng trước thời hạn 5 phút do lỗi kỹ thuật. Nhiều chủ ngựa không kịp đăng ký.",
    severity: "MEDIUM",
    status: "REJECTED",
    createdAt: "2026-06-11T16:20:00Z",
    history: [
      {
        action: "CREATED",
        performedBy: "Hệ thống đăng ký",
        at: "2026-06-11T16:20:00Z",
        note: "Lỗi kỹ thuật được ghi nhận.",
      },
      {
        action: "REJECTED",
        performedBy: "Quản trị viên",
        at: "2026-06-11T18:00:00Z",
        note: "Đã khắc phục lỗi. Thời gian đóng cổng là chính xác theo quy định.",
      },
    ],
    adminNote: "Đã khắc phục lỗi. Thời gian đóng cổng là chính xác theo quy định.",
  },
  {
    id: "DEV-006",
    type: "Thông tin kỵ sĩ",
    raceId: 14,
    raceName: "Royal Ascot 2026",
    reporter: "Hệ thống Registration",
    reporterRole: "SYSTEM",
    description: "Kỵ sĩ #7 đăng ký với thông tin không khớp: tên trên hồ sơ và giấy phép khác nhau.",
    severity: "HIGH",
    status: "PENDING",
    createdAt: "2026-06-10T13:25:00Z",
    history: [
      {
        action: "CREATED",
        performedBy: "Hệ thống Registration",
        at: "2026-06-10T13:25:00Z",
        note: "Phát hiện không khớp dữ liệu.",
      },
    ],
    adminNote: null,
  },
  {
    id: "DEV-007",
    type: "Trang phục kỵ sĩ",
    raceId: 13,
    raceName: "Melbourne Cup",
    reporter: "Trọng tài #2",
    reporterRole: "RACE_REFEREE",
    description: "Kỵ sĩ không mặc đúng màu áo được đăng ký. Vi phạm quy định nhận diện.",
    severity: "LOW",
    status: "RESOLVED",
    createdAt: "2026-06-09T10:15:00Z",
    history: [
      {
        action: "CREATED",
        performedBy: "Trọng tài #2",
        at: "2026-06-09T10:15:00Z",
        note: "Ghi nhận vi phạm trang phục.",
      },
      {
        action: "RESOLVED",
        performedBy: "Quản trị viên",
        at: "2026-06-09T10:45:00Z",
        note: "Cảnh cáo kỵ sĩ. Điểm phạt 100 điểm.",
      },
    ],
    adminNote: "Cảnh cáo kỵ sĩ. Điểm phạt 100 điểm.",
  },
];

// TODO: waiting backend API
export const deviationRepository = {
  async getAll(filters = {}) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/discrepancies`, { headers: authHeaders() });
    // if (!res.ok) await readError(res, "Không tải được danh sách sai lệch");
    // const data = await res.json();
    // return Array.isArray(data) ? data : [];

    // Mock delay to simulate network
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_DEVIATIONS;
  },

  async getById(id) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/discrepancies/${id}`, { headers: authHeaders() });
    // if (!res.ok) await readError(res, "Không tải được chi tiết sai lệch");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 200));
    const deviation = MOCK_DEVIATIONS.find((d) => d.id === id);
    if (!deviation) {
      throw new Error("Không tìm thấy sai lệch");
    }
    return deviation;
  },

  async updateStatus(id, status, adminNote) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/discrepancies/${id}/status`, {
    //   method: "PATCH",
    //   headers: authHeaders(),
    //   body: JSON.stringify({ status, adminNote }),
    // });
    // if (!res.ok) await readError(res, "Cập nhật trạng thái thất bại");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 300));
    const deviation = MOCK_DEVIATIONS.find((d) => d.id === id);
    if (!deviation) {
      throw new Error("Không tìm thấy sai lệch");
    }

    const actionLabels = {
      RESOLVED: "Đã xử lý",
      REJECTED: "Bị bác bỏ",
      REVIEWING: "Đang xem xét",
    };

    return {
      ...deviation,
      status,
      adminNote,
      history: [
        ...(deviation.history || []),
        {
          action: status,
          performedBy: "Quản trị viên",
          at: new Date().toISOString(),
          note: adminNote || actionLabels[status] || status,
        },
      ],
    };
  },
};
