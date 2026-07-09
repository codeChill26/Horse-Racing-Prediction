/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Repository cho Deviation/Discrepancy — Flow 5 (Discrepancy Resolution)
 *
 * Endpoint (theo D:\PRM\project\.cursor\prompts\mainflow.md FLOW 5):
 *   - GET  /api/admin/discrepancies?status=...
 *   - GET  /api/admin/discrepancies/:id
 *   - POST /api/admin/discrepancies/:id/resolve
 *       body: { finalResults: [selected ranking], reason: '...' (BẮT BUỘC) }
 *   - POST /api/admin/discrepancies/:id/reject
 *       body: { reason: '...' }
 *
 * Lưu ý: Tính đến 2026-07-10, endpoint chưa có trên backend
 * (ghi trong D:\PRM\project\PROCESS.md Mục 2.8). File này gọi đúng endpoint
 * theo mainflow.md và graceful fallback khi nhận 404 để FE không vỡ khi deploy.
 */

import { getAccessToken } from "../utils/token";

const USE_API =
  (import.meta.env.VITE_USE_API_DEVIATION ?? "true").toLowerCase() === "true";

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
 * Chuẩn hoá response BE về shape FE components đang dùng.
 *
 * BE shape (theo mainflow.md): { discrepancyId, raceId, raceName, type,
 *   severity, status, description, reporterA, reporterB, rawResultsA, rawResultsB,
 *   finalResults, resolveReason, resolvedById, createdAt, updatedAt, history: [...] }
 *
 * FE shape (mock hiện dùng ở DeviationTable/Modal):
 *   { id, type, raceId, raceName, reporter, reporterRole, description,
 *     severity, status, createdAt, history, adminNote, finalResults? }
 */
function mapDiscrepancyResponse(v = {}) {
  if (!v) return null;
  const createdAt = v.createdAt || v.recordedAt || null;
  return {
    id: v.discrepancyId ?? v.id,
    type: v.type || "—",
    raceId: v.raceId ?? v.race?.raceId ?? null,
    raceName: v.race?.name ?? v.raceName ?? "—",
    reporter: v.reporter ?? v.reporterA?.fullName ?? "—",
    reporterRole: v.reporterRole ?? v.reporterA?.role ?? "SYSTEM",
    reporterA: v.reporterA ?? null,
    reporterB: v.reporterB ?? null,
    rawResultsA: Array.isArray(v.rawResultsA) ? v.rawResultsA : null,
    rawResultsB: Array.isArray(v.rawResultsB) ? v.rawResultsB : null,
    description: v.description || "",
    severity: v.severity || "MEDIUM",
    status: v.status || "PENDING",
    createdAt,
    finalResults: v.finalResults ?? null,
    adminNote: v.adminNote ?? v.resolveReason ?? null,
    history: Array.isArray(v.history)
      ? v.history.map((h) => ({
          action: h.action || h.eventType || "CREATED",
          performedBy: h.performedBy ?? h.actor?.fullName ?? "—",
          at: h.at ?? h.createdAt ?? createdAt,
          note: h.note || "",
        }))
      : [],
    raw: v,
  };
}

// ----- Mock data (fallback) -----
const MOCK_DEVIATIONS = [
  {
    id: "DEV-001",
    type: "Kết quả vạch đích",
    raceId: 12,
    raceName: "Chung kết Belmont Stakes",
    reporter: "Camera Tower A",
    reporterRole: "SYSTEM",
    description:
      "Thứ tự về đích vị trí 2 và 3 bị mờ, hai tháp camera ghi nhận khác nhau. Cần xác minh qua camera tốc độ cao.",
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
    type: "Trọng tài xung đột",
    raceId: 10,
    raceName: "Preakness Stakes",
    reporter: "Trọng tài #4",
    reporterRole: "RACE_REFEREE",
    description:
      "Hai trọng tài đưa ra phán quyết khác nhau về pha chạm rào ở lượt 5. Trọng tài #4 cho rằng chạm, trọng tài #7 không đồng ý.",
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
    id: "DEV-003",
    type: "Điểm phạt sai",
    raceId: 9,
    raceName: "Tournament GrandStride 2026",
    reporter: "Hệ thống Score",
    reporterRole: "SYSTEM",
    description: "Tính điểm trừ 2s cho ngựa #7 nhưng hình ảnh không xác nhận lỗi.",
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
];

async function withFallback(apiCall, mockCall, errorContext) {
  try {
    return await apiCall();
  } catch (err) {
    const isNotFound = /Not Found|404/.test(err.message);
    if (USE_API && !isNotFound) {
      throw err;
    }
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        `[deviationRepository] BE endpoint chưa sẵn sàng (${errorContext}). Fallback về mock.`
      );
    }
    return mockCall();
  }
}

export const deviationRepository = {
  /**
   * GET /api/admin/discrepancies?status=...&severity=...
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
        const url = `/api/admin/discrepancies${qs ? `?${qs}` : ""}`;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) await readError(res, "Không tải được danh sách sai lệch");
        const data = await res.json();
        const list = Array.isArray(data?.discrepancies)
          ? data.discrepancies
          : Array.isArray(data)
            ? data
            : [];
        return list.map(mapDiscrepancyResponse);
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        let list = [...MOCK_DEVIATIONS];
        if (filters.status) list = list.filter((d) => d.status === filters.status);
        if (filters.severity)
          list = list.filter((d) => d.severity === filters.severity);
        return list;
      },
      "getAll"
    );
  },

  /** GET /api/admin/discrepancies/:id */
  async getById(id) {
    return withFallback(
      async () => {
        const res = await fetch(`/api/admin/discrepancies/${id}`, {
          headers: authHeaders(),
        });
        if (!res.ok) await readError(res, "Không tải được chi tiết sai lệch");
        const data = await res.json();
        return mapDiscrepancyResponse(data?.discrepancy ?? data);
      },
      async () => {
        if (!id) throw new Error("Thiếu mã sai lệch");
        await new Promise((resolve) => setTimeout(resolve, 200));
        const found = MOCK_DEVIATIONS.find((d) => d.id === id);
        if (!found) throw new Error("Không tìm thấy sai lệch");
        return found;
      },
      "getById"
    );
  },

  /**
   * POST /api/admin/discrepancies/:id/resolve
   * mainflow.md: { finalResults, reason: BẮT BUỘC }
   * @param {string} id
   * @param {{ finalResults: Array<{entryId, rank}>, reason: string,
   *          source?: 'A'|'B'|'CUSTOM' }} payload
   */
  async resolveDeviation(id, payload = {}) {
    const { finalResults, reason, source } = payload;
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/admin/discrepancies/${id}/resolve`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ finalResults, reason, source }),
          }
        );
        if (!res.ok) await readError(res, "Xử lý sai lệch thất bại");
        const data = await res.json();
        return mapDiscrepancyResponse(data?.discrepancy ?? data);
      },
      async () => {
        if (!id) throw new Error("Thiếu mã sai lệch");
        if (!reason || !String(reason).trim()) {
          throw new Error("Lý do xử lý là bắt buộc");
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        const v = MOCK_DEVIATIONS.find((d) => d.id === id);
        if (!v) throw new Error("Không tìm thấy sai lệch");
        return {
          ...v,
          status: "RESOLVED",
          finalResults: finalResults ?? v.finalResults ?? null,
          adminNote: reason.trim(),
          history: [
            ...(v.history || []),
            {
              action: "RESOLVED",
              performedBy: "Quản trị viên",
              at: new Date().toISOString(),
              note: reason.trim(),
            },
          ],
        };
      },
      "resolveDeviation"
    );
  },

  /** POST /api/admin/discrepancies/:id/reject { reason } */
  async rejectDeviation(id, reason = "") {
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/admin/discrepancies/${id}/reject`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ reason }),
          }
        );
        if (!res.ok) await readError(res, "Bác bỏ sai lệch thất bại");
        const data = await res.json();
        return mapDiscrepancyResponse(data?.discrepancy ?? data);
      },
      async () => {
        if (!id) throw new Error("Thiếu mã sai lệch");
        if (!reason || !String(reason).trim()) {
          throw new Error("Lý do bác bỏ là bắt buộc");
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        const v = MOCK_DEVIATIONS.find((d) => d.id === id);
        if (!v) throw new Error("Không tìm thấy sai lệch");
        return {
          ...v,
          status: "REJECTED",
          adminNote: reason.trim(),
          history: [
            ...(v.history || []),
            {
              action: "REJECTED",
              performedBy: "Quản trị viên",
              at: new Date().toISOString(),
              note: reason.trim(),
            },
          ],
        };
      },
      "rejectDeviation"
    );
  },

  /**
   * POST /api/admin/discrepancies/:id/start-review
   * PENDING → REVIEWING.
   */
  async startReview(id) {
    return withFallback(
      async () => {
        const res = await fetch(
          `/api/admin/discrepancies/${id}/start-review`,
          { method: "POST", headers: authHeaders() }
        );
        if (!res.ok)
          await readError(res, "Bắt đầu xem xét sai lệch thất bại");
        const data = await res.json();
        return mapDiscrepancyResponse(data?.discrepancy ?? data);
      },
      async () => {
        if (!id) throw new Error("Thiếu mã sai lệch");
        await new Promise((resolve) => setTimeout(resolve, 250));
        const v = MOCK_DEVIATIONS.find((d) => d.id === id);
        if (!v) throw new Error("Không tìm thấy sai lệch");
        return {
          ...v,
          status: "REVIEWING",
          history: [
            ...(v.history || []),
            {
              action: "REVIEWING",
              performedBy: "Quản trị viên",
              at: new Date().toISOString(),
              note: "Bắt đầu xem xét sai lệch.",
            },
          ],
        };
      },
      "startReview"
    );
  },

  /**
   * @deprecated Giữ method này cho code cũ. Sẽ xoá khi AdminDeviationPage
   * được refactor sang dùng resolveDeviation/rejectDeviation trực tiếp.
   */
  async updateStatus(id, status, adminNote) {
    if (status === "REVIEWING") return this.startReview(id);
    if (status === "RESOLVED") {
      return this.resolveDeviation(id, { reason: adminNote || "(no note)" });
    }
    if (status === "REJECTED") {
      return this.rejectDeviation(id, adminNote || "(no reason)");
    }
    throw new Error(`Trạng thái không hỗ trợ: ${status}`);
  },
};
