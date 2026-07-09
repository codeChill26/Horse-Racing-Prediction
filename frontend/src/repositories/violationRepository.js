/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Violation Repository
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
const MOCK_VIOLATIONS = [
  {
    id: "VIO-001",
    subject: "John Doe",
    subjectRole: "JOCKEY",
    type: "Sử dụng roi quá số lần quy định",
    raceId: 12,
    raceName: "Belmont Stakes 2026",
    severity: "MAJOR",
    penalty: 5000,
    status: "OPEN",
    recordedAt: "2026-06-15T14:32:00Z",
    description:
      "Hệ thống camera ghi nhận kỵ sĩ sử dụng roi 8 lần trong chặng, vượt mức 5 lần cho phép. Vi phạm Điều 14.3 Quy chế thi đấu.",
    recordedBy: "Trọng tài #2 (Trần Văn A)",
    history: [
      {
        action: "CREATED",
        performedBy: "Trọng tài #2",
        at: "2026-06-15T14:32:00Z",
        note: "Ghi nhận qua hệ thống camera trực tiếp.",
      },
    ],
    resolutionNote: null,
  },
  {
    id: "VIO-002",
    subject: "Michael Petrov",
    subjectRole: "JOCKEY",
    type: "Chạm rào gây ảnh hưởng ngựa khác",
    raceId: 11,
    raceName: "Kentucky Derby Qualifier",
    severity: "SEVERE",
    penalty: 15000,
    status: "REVIEWING",
    recordedAt: "2026-06-14T16:00:00Z",
    description:
      "Phóng viên camera tower B xác nhận có va chạm giữa ngựa số 7 và ngựa số 9 ở lượt 4. Ngựa số 9 bị mất cân bằng nghiêm trọng.",
    recordedBy: "Camera Tower B",
    history: [
      {
        action: "CREATED",
        performedBy: "Camera Tower B",
        at: "2026-06-14T16:00:00Z",
        note: "Phát hiện va chạm qua footage.",
      },
      {
        action: "REVIEWING",
        performedBy: "Trọng tài #5",
        at: "2026-06-14T17:30:00Z",
        note: "Đang xem xét footage chi tiết.",
      },
    ],
    resolutionNote: null,
  },
  {
    id: "VIO-003",
    subject: "Stable 23",
    subjectRole: "HORSE_OWNER",
    type: "Đăng ký ngựa trễ hạn 3 lần",
    raceId: null,
    raceName: "N/A",
    severity: "MINOR",
    penalty: 1000,
    status: "RESOLVED",
    recordedAt: "2026-06-13T10:20:00Z",
    description:
      "Chủ ngựa đăng ký trễ 3 lần trong 2 tháng qua, vi phạm quy chế đăng ký. Đã nhận cảnh cáo trước đó 2 lần.",
    recordedBy: "Hệ thống Registration",
    history: [
      {
        action: "CREATED",
        performedBy: "Hệ thống Registration",
        at: "2026-06-13T10:20:00Z",
        note: "Tự động phát hiện đăng ký trễ.",
      },
      {
        action: "RESOLVED",
        performedBy: "Quản trị viên",
        at: "2026-06-13T14:45:00Z",
        note: "Cảnh cáo chủ ngựa. Áp dụng phạt 1000 điểm. Cảnh báo lần tiếp theo sẽ bị cấm đăng ký.",
      },
    ],
    resolutionNote: "Cảnh cáo chủ ngựa. Áp dụng phạt 1000 điểm. Cảnh báo lần tiếp theo sẽ bị cấm đăng ký.",
  },
  {
    id: "VIO-004",
    subject: "Trainer S. Jenkins",
    subjectRole: "HORSE_OWNER",
    type: "Dùng dược phẩm bị cấm trong danh sách",
    raceId: 10,
    raceName: "Preakness Stakes",
    severity: "SEVERE",
    penalty: 50000,
    status: "OPEN",
    recordedAt: "2026-06-12T08:45:00Z",
    description:
      "Kết quả kiểm tra nước tiểu ngựa số 3 dương tính với chất cấm Substabalone-X. Chất này nằm trong danh sách cấm WADA Loại S4.",
    recordedBy: "Phòng xét nghiệm VET-Lab",
    history: [
      {
        action: "CREATED",
        performedBy: "Phòng xét nghiệm VET-Lab",
        at: "2026-06-12T08:45:00Z",
        note: "Kết quả xét nghiệm dương tính.",
      },
    ],
    resolutionNote: null,
  },
  {
    id: "VIO-005",
    subject: "Camera Tower B",
    subjectRole: "STAFF",
    type: "Ghi nhận hình ảnh sai lệch kết quả",
    raceId: 9,
    raceName: "Tournament GrandStride 2026",
    severity: "WARNING",
    penalty: 0,
    status: "DISMISSED",
    recordedAt: "2026-06-11T17:10:00Z",
    description:
      "Camera Tower B ghi sai thứ tự về đích trong 3 giây đầu. Sau khi đối chiếu với footage khác, đây là lỗi đồng bộ thời gian, không phải sai lệch kết quả.",
    recordedBy: "Ban giám sát",
    history: [
      {
        action: "CREATED",
        performedBy: "Ban giám sát",
        at: "2026-06-11T17:10:00Z",
        note: "Phát hiện bất thường footage.",
      },
      {
        action: "DISMISSED",
        performedBy: "Quản trị viên",
        at: "2026-06-11T19:00:00Z",
        note: "Đã xác minh là lỗi đồng bộ thời gian thiết bị. Không có sai lệch kết quả. Yêu cầu IT kiểm tra Camera Tower B.",
      },
    ],
    resolutionNote: "Đã xác minh là lỗi đồng bộ thời gian thiết bị. Không có sai lệch kết quả.",
  },
  {
    id: "VIO-006",
    subject: "Emma Wilson",
    subjectRole: "JOCKEY",
    type: "Không mặc đúng trang phục thi đấu",
    raceId: 8,
    raceName: "Royal Ascot",
    severity: "MINOR",
    penalty: 500,
    status: "RESOLVED",
    recordedAt: "2026-06-10T11:30:00Z",
    description:
      "Kỵ sĩ mặc màu áo không đúng với đăng ký. Màu đăng ký: Xanh dương; màu mặc: Đỏ. Vi phạm quy định nhận diện.",
    recordedBy: "Trọng tài #3",
    history: [
      {
        action: "CREATED",
        performedBy: "Trọng tài #3",
        at: "2026-06-10T11:30:00Z",
        note: "Ghi nhận trang phục không đúng.",
      },
      {
        action: "RESOLVED",
        performedBy: "Quản trị viên",
        at: "2026-06-10T12:00:00Z",
        note: "Cảnh cáo kỵ sĩ. Phạt 500 điểm. Nhắc nhở kiểm tra trang phục trước khi thi đấu.",
      },
    ],
    resolutionNote: "Cảnh cáo kỵ sĩ. Phạt 500 điểm.",
  },
  {
    id: "VIO-007",
    subject: "Golden Gate Stables",
    subjectRole: "HORSE_OWNER",
    type: "Không hoàn tất kiểm tra an toàn ngựa",
    raceId: 7,
    raceName: "Breeders' Cup Classic",
    severity: "MAJOR",
    penalty: 8000,
    status: "OPEN",
    recordedAt: "2026-06-09T07:15:00Z",
    description:
      "Chủ ngựa không hoàn tất kiểm tra an toàn bắt buộc trước giờ thi đấu. Ngựa số 5 không có chứng nhận kiểm tra y tế hợp lệ.",
    recordedBy: "Hệ thống Safety Check",
    history: [
      {
        action: "CREATED",
        performedBy: "Hệ thống Safety Check",
        at: "2026-06-09T07:15:00Z",
        note: "Phát hiện thiếu chứng nhận.",
      },
    ],
    resolutionNote: null,
  },
  {
    id: "VIO-008",
    subject: "Robert Chen",
    subjectRole: "JOCKEY",
    type: "Cáo buộc hành vi phi thể thao",
    raceId: 6,
    raceName: "Dubai World Cup",
    severity: "SEVERE",
    penalty: 20000,
    status: "REVIEWING",
    recordedAt: "2026-06-08T15:45:00Z",
    description:
      "Kỵ sĩ có hành vi xúc phạm trọng tài sau khi nhận quyết định. Có video ghi lại vụ việc. Kỵ sĩ được mời lên làm việc.",
    recordedBy: "Trọng tài #1",
    history: [
      {
        action: "CREATED",
        performedBy: "Trọng tài #1",
        at: "2026-06-08T15:45:00Z",
        note: "Ghi nhận hành vi qua camera.",
      },
      {
        action: "REVIEWING",
        performedBy: "Ban kỷ luật",
        at: "2026-06-08T18:00:00Z",
        note: "Đang xem xét footage và mời kỵ sĩ làm việc.",
      },
    ],
    resolutionNote: null,
  },
];

// TODO: waiting backend API
export const violationRepository = {
  async getAll(filters = {}) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/violations`, { headers: authHeaders() });
    // if (!res.ok) await readError(res, "Không tải được danh sách vi phạm");
    // const data = await res.json();
    // return Array.isArray(data) ? data : [];

    // Mock delay to simulate network
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_VIOLATIONS;
  },

  async getById(id) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/violations/${id}`, { headers: authHeaders() });
    // if (!res.ok) await readError(res, "Không tải được chi tiết vi phạm");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 200));
    const violation = MOCK_VIOLATIONS.find((v) => v.id === id);
    if (!violation) {
      throw new Error("Không tìm thấy vi phạm");
    }
    return violation;
  },

  async updateStatus(id, status, resolutionNote) {
    // TODO: Replace with real API call
    // const res = await fetch(`/api/admin/violations/${id}/status`, {
    //   method: "PATCH",
    //   headers: authHeaders(),
    //   body: JSON.stringify({ status, resolutionNote }),
    // });
    // if (!res.ok) await readError(res, "Cập nhật trạng thái thất bại");
    // return await res.json();

    await new Promise((resolve) => setTimeout(resolve, 300));
    const violation = MOCK_VIOLATIONS.find((v) => v.id === id);
    if (!violation) {
      throw new Error("Không tìm thấy vi phạm");
    }

    const actionLabels = {
      RESOLVED: "Đã xử lý",
      DISMISSED: "Bỏ qua",
      REVIEWING: "Đang xem xét",
    };

    return {
      ...violation,
      status,
      resolutionNote,
      history: [
        ...(violation.history || []),
        {
          action: status,
          performedBy: "Quản trị viên",
          at: new Date().toISOString(),
          note: resolutionNote || actionLabels[status] || status,
        },
      ],
    };
  },
};
