/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository cho Violation — Flow 5 (Violation Handling)
 *
 * Endpoint (theo D:\PRM\project\.cursor\prompts\mainflow.md FLOW 6 — Violation):
 *
 *  Referee side (chưa có UI Referee tạo — gọi qua race control):
 *   - POST /api/referee/violations  { raceId, entryId, type, severity, description }
 *
 *  Admin side:
 *   - GET    /api/admin/violations?status=OPEN|REVIEWING|RESOLVED|DISMISSED&page&pageSize
 *   - GET    /api/admin/violations/:id
 *   - POST   /api/admin/violations/:id/start-review
 *   - POST   /api/admin/violations/:id/resolve    { penalty, note }   // 'DQ' | 'DEDUCT_POINTS' | 'WARNING'
 *   - POST   /api/admin/violations/:id/dismiss    { reason }
 *
 * Penalty types (mainflow.md section "Penalty types"):
 *   - DQ             → set RaceEntry.status='DQ', finishPosition=null
 *   - DEDUCT_POINTS  → trừ điểm PointWallet (configurable theo severity)
 *   - WARNING        → chỉ ghi nhận, không penalty
 *
 * Lưu ý: Tính đến 2026-07-10, toàn bộ endpoint trên chưa được backend triển khai
 * (ghi trong D:\PRM\project\PROCESS.md Mục 2.7). File này gọi đúng endpoint
 * theo mainflow.md. Mock fallback chỉ chạy khi env `VITE_FALLBACK_TO_MOCK=true`
 * được set rõ ràng — mặc định (prod / staging) sẽ throw lỗi để UI xử lý
 * (không im lặng trả về dữ liệu giả — đồng bộ với raceDetailRepository).
 */

import { getAccessToken } from "../utils/token";

const FALLBACK_ENABLED =
  String(import.meta.env.VITE_FALLBACK_TO_MOCK ?? "false").toLowerCase() ===
  "true";

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
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Chuẩn hoá response BE về shape FE components hiện đang dùng.
 *
 * BE shape (theo mainflow.md):
 *   { violationId, raceId, entryId, jockeyId, type, severity, status,
 *     description, penalty, resolutionNote, createdAt, updatedAt, history: [...] }
 *
 * FE shape (mock hiện dùng ở ViolationTable/Modal):
 *   { id, subject, subjectRole, type, raceId, raceName, severity, penalty,
 *     status, recordedAt, description, recordedBy, history, resolutionNote }
 */
function mapViolationResponse(v = {}) {
  if (!v) return null;
  const recordedAt = v.createdAt || v.recordedAt || null;
  return {
    id: v.violationId ?? v.id,
    subject:
      v.subject ??
      v.entry?.jockey?.fullName ??
      v.entry?.horse?.name ??
      v.jockey?.fullName ??
      "—",
    subjectRole: v.subjectRole ?? v.targetRole ?? null,
    type: v.type || "—",
    raceId: v.raceId ?? v.race?.raceId ?? null,
    raceName: v.race?.name ?? v.raceName ?? "—",
    severity: v.severity || "MINOR",
    penalty: v.penalty ?? 0,
    penaltyType: v.penaltyType ?? v.penaltyKind ?? null,
    status: v.status || "OPEN",
    recordedAt,
    description: v.description || "",
    recordedBy: v.recordedBy ?? v.reporter?.fullName ?? "—",
    history: Array.isArray(v.history)
      ? v.history.map((h) => ({
          action: h.action || h.eventType || "CREATED",
          performedBy: h.performedBy ?? h.actor?.fullName ?? "—",
          at: h.at ?? h.createdAt ?? recordedAt,
          note: h.note || "",
        }))
      : [],
    resolutionNote: v.resolutionNote ?? v.note ?? null,
    raw: v,
  };
}

// ----- Mock data (giữ làm fallback khi BE 404) -----
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
      "Hệ thống camera ghi nhận kỵ sĩ sử dụng roi 8 lần trong chặng, vượt mức 5 lần cho phép.",
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
      "Camera tower B xác nhận có va chạm giữa ngựa số 7 và ngựa số 9 ở lượt 4.",
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
    penaltyType: "DEDUCT_POINTS",
    status: "RESOLVED",
    recordedAt: "2026-06-13T10:20:00Z",
    description: "Chủ ngựa đăng ký trễ 3 lần trong 2 tháng qua.",
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
        note: "Cảnh cáo chủ ngựa. Áp dụng phạt 1000 điểm.",
      },
    ],
    resolutionNote: "Cảnh cáo chủ ngựa. Áp dụng phạt 1000 điểm.",
  },
];

/**
 * Helper: gọi API; mock fallback CHỈ chạy khi env `VITE_FALLBACK_TO_MOCK=true`.
 * Mặc định (prod/staging) sẽ throw — không swallow 404 — để admin thấy lỗi
 * thật và BE tích hợp đầy đủ trước khi release.
 *
 * Khi `VITE_FALLBACK_TO_MOCK=true` (chỉ dev): cố gắng gọi API trước; nếu lỗi
 * (404 hoặc khác) thì fallback về mock để dev FE không bị block bởi endpoint
 * chưa sẵn sàng trên BE (xem PROCESS.md).
 */
async function withFallback(apiCall, mockCall, errorContext) {
  if (!FALLBACK_ENABLED) {
    return apiCall();
  }
  try {
    return await apiCall();
  } catch (err) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        `[violationRepository] BE endpoint chưa sẵn sàng (${errorContext}). Fallback về mock vì VITE_FALLBACK_TO_MOCK=true. Lỗi: ${err?.message || "unknown"}`
      );
    }
    return mockCall();
  }
}

export const violationRepository = {
  /**
   * GET /api/admin/violations?status=...&severity=...
   * @param {{ status?: string, severity?: string, raceId?: number|string, q?: string }} filters
   */
  async getAll(filters = {}) {
    return withFallback(
      async () => {
        const params = new URLSearchParams();
        if (filters.status) params.set("status", filters.status);
        if (filters.severity) params.set("severity", filters.severity);
        if (filters.raceId != null) params.set("raceId", String(filters.raceId));
        if (filters.q) params.set("q", filters.q);
        const qs = params.toString();
        const url = `/api/admin/violations${qs ? `?${qs}` : ""}`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) await readError(res, "Không tải được danh sách vi phạm");
        const data = await res.json();
        const list = Array.isArray(data?.violations)
          ? data.violations
          : Array.isArray(data)
            ? data
            : [];
        return list.map(mapViolationResponse);
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        let list = [...MOCK_VIOLATIONS];
        if (filters.status) list = list.filter((v) => v.status === filters.status);
        if (filters.severity)
          list = list.filter((v) => v.severity === filters.severity);
        return list;
      },
      "getAll"
    );
  },

  /** GET /api/admin/violations/:id */
  async getById(id) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/admin/violations/${id}`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được chi tiết vi phạm");
        const data = await res.json();
        return mapViolationResponse(data?.violation ?? data);
      },
      async () => {
        if (!id) throw new Error("Thiếu mã vi phạm");
        await new Promise((resolve) => setTimeout(resolve, 200));
        const found = MOCK_VIOLATIONS.find((v) => v.id === id);
        if (!found) throw new Error("Không tìm thấy vi phạm");
        return found;
      },
      "getById"
    );
  },

  /** POST /api/admin/violations/:id/start-review — set status='REVIEWING' */
  async startReview(id) {
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/admin/violations/${id}/start-review`,
          { method: "POST", headers: authHeaders() }
        );
        if (!res.ok)
          await readError(res, "Bắt đầu xem xét vi phạm thất bại");
        const data = await res.json();
        return mapViolationResponse(data?.violation ?? data);
      },
      async () => {
        if (!id) throw new Error("Thiếu mã vi phạm");
        await new Promise((resolve) => setTimeout(resolve, 250));
        const v = MOCK_VIOLATIONS.find((x) => x.id === id);
        if (!v) throw new Error("Không tìm thấy vi phạm");
        return {
          ...v,
          status: "REVIEWING",
          history: [
            ...(v.history || []),
            {
              action: "REVIEWING",
              performedBy: "Quản trị viên",
              at: new Date().toISOString(),
              note: "Bắt đầu xem xét vi phạm.",
            },
          ],
        };
      },
      "startReview"
    );
  },

  /**
   * POST /api/admin/violations/:id/resolve { penalty, note }
   * @param {string} id
   * @param {{ penalty: 'DQ'|'DEDUCT_POINTS'|'WARNING', note: string }} payload
   */
  async resolveViolation(id, payload = {}) {
    const { penalty, note } = payload;
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/admin/violations/${id}/resolve`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ penalty, note }),
          }
        );
        if (!res.ok) await readError(res, "Xử lý vi phạm thất bại");
        const data = await res.json();
        return mapViolationResponse(data?.violation ?? data);
      },
      async () => {
        if (!id) throw new Error("Thiếu mã vi phạm");
        if (!note || !note.trim()) {
          throw new Error("Ghi chú xử lý là bắt buộc");
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
        const v = MOCK_VIOLATIONS.find((x) => x.id === id);
        if (!v) throw new Error("Không tìm thấy vi phạm");
        const appliedPenalty = penalty || "WARNING";
        return {
          ...v,
          status: "RESOLVED",
          penaltyType: appliedPenalty,
          penalty: appliedPenalty === "DEDUCT_POINTS" ? (v.penalty || 5000) : 0,
          resolutionNote: note.trim(),
          history: [
            ...(v.history || []),
            {
              action: "RESOLVED",
              performedBy: "Quản trị viên",
              at: new Date().toISOString(),
              note: note.trim(),
            },
          ],
        };
      },
      "resolveViolation"
    );
  },

  /** POST /api/admin/violations/:id/dismiss { reason } */
  async dismissViolation(id, reason = "") {
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/admin/violations/${id}/dismiss`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ reason }),
          }
        );
        if (!res.ok) await readError(res, "Bỏ qua vi phạm thất bại");
        const data = await res.json();
        return mapViolationResponse(data?.violation ?? data);
      },
      async () => {
        if (!id) throw new Error("Thiếu mã vi phạm");
        if (!reason || !reason.trim()) {
          throw new Error("Lý do bỏ qua là bắt buộc");
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
        const v = MOCK_VIOLATIONS.find((x) => x.id === id);
        if (!v) throw new Error("Không tìm thấy vi phạm");
        return {
          ...v,
          status: "DISMISSED",
          resolutionNote: reason.trim(),
          history: [
            ...(v.history || []),
            {
              action: "DISMISSED",
              performedBy: "Quản trị viên",
              at: new Date().toISOString(),
              note: reason.trim(),
            },
          ],
        };
      },
      "dismissViolation"
    );
  },

  /**
   * POST /api/admin/violations/direct-penalty
   * Admin xử phạt trực tiếp (tạo và resolve luôn)
   */
  async directPenalty(payload = {}) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/admin/violations/direct-penalty`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) await readError(res, "Xử phạt trực tiếp thất bại");
        const data = await res.json();
        return mapViolationResponse(data?.violation ?? data);
      },
      async () => {
        if (!payload.raceId || !payload.entryId || !payload.penalty) {
          throw new Error("Thiếu dữ liệu bắt buộc để xử phạt");
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        return {
          id: `VIO-MOCK-${Date.now()}`,
          status: "RESOLVED",
          recordedAt: new Date().toISOString(),
          raceId: payload.raceId,
          severity: payload.severity || "SEVERE",
          type: payload.type || "Lỗi vi phạm",
          description: payload.note || "",
          penaltyType: payload.penalty,
          resolutionNote: payload.note,
          history: [],
        };
      },
      "directPenalty"
    );
  },

  /**
   * POST /api/referee/violations
   * Referee tạo mới (chưa có UI; skeleton sẵn).
   * @param {{ raceId: number, entryId: number, type: string,
   *           severity: 'WARNING'|'MINOR'|'MAJOR'|'SEVERE'|'CRITICAL',
   *           description: string }} payload
   */
  async createByReferee(payload = {}) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/referee/violations`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) await readError(res, "Ghi nhận vi phạm thất bại");
        const data = await res.json();
        return mapViolationResponse(data?.violation ?? data);
      },
      async () => {
        if (!payload.raceId || !payload.entryId) {
          throw new Error("Thiếu raceId hoặc entryId");
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
        return {
          id: `VIO-MOCK-${Date.now()}`,
          status: "OPEN",
          recordedAt: new Date().toISOString(),
          raceId: payload.raceId,
          severity: payload.severity || "MINOR",
          type: payload.type,
          description: payload.description || "",
          history: [
            {
              action: "CREATED",
              performedBy: "Trọng tài",
              at: new Date().toISOString(),
              note: "Tạo từ trang race control (mock).",
            },
          ],
          resolutionNote: null,
        };
      },
      "createByReferee"
    );
  },

  /**
   * GET /api/me/violations
   * BUG-V-03: Violations của user hiện tại (Spectator/Jockey/Owner).
   * Hiện BE chưa có endpoint — fallback [].
   */
  async getMine() {
    return withFallback(
      async () => {
        const res = await fetch(`/api/me/violations`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được vi phạm của tôi");
        const data = await res.json();
        const list = Array.isArray(data?.violations)
          ? data.violations
          : Array.isArray(data)
            ? data
            : [];
        return list.map(mapViolationResponse);
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return [];
      },
      "getMine"
    );
  },

  /**
   * @deprecated Giữ method này cho code cũ. Sẽ xoá khi AdminViolationPage
   * được refactor sang dùng resolveViolation/dismissViolation trực tiếp.
   */
  async updateStatus(id, status, resolutionNote) {
    if (status === "REVIEWING") return this.startReview(id);
    if (status === "RESOLVED") {
      return this.resolveViolation(id, {
        penalty: "WARNING",
        note: resolutionNote || "(no note)",
      });
    }
    if (status === "DISMISSED") {
      return this.dismissViolation(id, resolutionNote || "(no reason)");
    }
    throw new Error(`Trạng thái không hỗ trợ: ${status}`);
  },
};
