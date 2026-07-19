/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Service cho Violation — Flow 5 (Violation Handling).
 *
 * Validation client-side bằng tiếng Việt; BE là nguồn quyết định cuối cùng.
 *
 * State machine (theo D:\PRM\project\.cursor\prompts\mainflow.md FLOW 6):
 *
 *                    ┌───────────────────────────────┐
 *                    │                               │
 *               (Referee tạo)                  (Admin actions)
 *                    │                               │
 *                    ▼                               ▼
 *               ┌────────┐    start-review     ┌───────────┐
 *               │  OPEN  │ ─────────────────► │ REVIEWING │
 *               └────────┘                    └─────┬─────┘
 *                    │                              │
 *                    │                       resolve/ dismiss
 *                    │                              │
 *                    └──────────────┬───────────────┤
 *                                   ▼               ▼
 *                              ┌──────────┐   ┌──────────┐
 *                              │ RESOLVED │   │ DISMISSED│
 *                              └──────────┘   └──────────┘
 *
 * Penalty types (khi resolve):
 *   - DQ             → entry bị loại (RaceEntry.status='DQ')
 *   - DEDUCT_POINTS  → trừ điểm PointWallet (theo severity)
 *   - WARNING        → chỉ ghi nhận, không penalty
 */

import { violationRepository } from "../repositories/violationRepository";

export const VIOLATION_STATUS = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED", "ALL"];

export const VIOLATION_SEVERITY = [
  "WARNING",
  "MINOR",
  "MAJOR",
  "SEVERE",
  "CRITICAL",
];

export const VIOLATION_PENALTY = ["DQ", "DEDUCT_POINTS", "WARNING"];

export const violationService = {
  /**
   * GET /api/admin/violations?...
   * @param {{ status?: string, severity?: string, raceId?: number|string, q?: string }} filters
   */
  async getViolations(filters = {}) {
    const normalized = { ...filters };
    if (normalized.status && !VIOLATION_STATUS.includes(normalized.status)) {
      throw new Error("Trạng thái lọc không hợp lệ");
    }
    if (
      normalized.severity &&
      normalized.severity !== "ALL" &&
      !VIOLATION_SEVERITY.includes(normalized.severity)
    ) {
      throw new Error("Mức độ lọc không hợp lệ");
    }
    return violationRepository.getAll(normalized);
  },

  /** GET /api/admin/violations/:id */
  async getViolationById(id) {
    if (!id) throw new Error("ID vi phạm là bắt buộc");
    return violationRepository.getById(id);
  },

  /**
   * POST /api/admin/violations/:id/start-review
   * OPEN → REVIEWING (transition hợp lệ).
   */
  async startReview(id, currentStatus) {
    if (!id) throw new Error("ID vi phạm là bắt buộc");
    if (currentStatus && currentStatus !== "OPEN") {
      throw new Error(
        `Chỉ có thể bắt đầu xem xét vi phạm ở trạng thái OPEN (hiện tại: ${currentStatus}).`
      );
    }
    return violationRepository.startReview(id);
  },

  /**
   * POST /api/admin/violations/:id/resolve
   * OPEN|REVIEWING → RESOLVED. Bắt buộc note.
   *
   * NOTE: Khi penalty='DEDUCT_POINTS', việc trừ điểm PointWallet phải do BE
   * xử lý atomic — backend sẽ gọi wallet service để đảm bảo transaction không
   * bị split. FE chỉ log để audit, KHÔNG tự gọi adminWalletService.
   *
   * @param {string} id
   * @param {{
   *   penalty: 'DQ'|'DEDUCT_POINTS'|'WARNING',
   *   note: string,
   *   currentStatus?: string,
   * }} payload
   */
  async resolveViolation(id, payload = {}) {
    if (!id) throw new Error("ID vi phạm là bắt buộc");

    const { penalty, note, currentStatus } = payload;

    if (!VIOLATION_PENALTY.includes(penalty)) {
      throw new Error(
        `Loại phạt phải là một trong: ${VIOLATION_PENALTY.join(", ")}`
      );
    }
    const trimmedNote = note ? String(note).trim() : "";
    if (!trimmedNote) {
      throw new Error("Ghi chú xử lý là bắt buộc khi xử lý vi phạm");
    }
    if (trimmedNote.length > 1000) {
      throw new Error("Ghi chú xử lý tối đa 1000 ký tự");
    }

    if (
      currentStatus &&
      !["OPEN", "REVIEWING"].includes(currentStatus)
    ) {
      throw new Error(
        `Vi phạm đã ở trạng thái ${currentStatus} — không thể xử lý thêm.`
      );
    }

    // BUG-V-01 partial: cảnh báo dev khi penalty=DEDUCT_POINTS để tránh nhầm
    // tưởng FE đã trừ điểm (chờ BE xử lý atomic). Không throw vì đây là
    // behavior mong đợi sau khi BE implement side-effect.
    if (penalty === "DEDUCT_POINTS") {
      console.info(
        `[violationService] penalty=DEDUCT_POINTS sẽ được BE xử lý atomic (trừ PointWallet). Violation #${id} → RESOLVED.`
      );
    }

    return violationRepository.resolveViolation(id, {
      penalty,
      note: trimmedNote,
    });
  },

  /**
   * POST /api/admin/violations/:id/dismiss
   * OPEN|REVIEWING → DISMISSED. Bắt buộc reason.
   */
  async dismissViolation(id, reason = "", currentStatus) {
    if (!id) throw new Error("ID vi phạm là bắt buộc");
    const trimmed = reason ? String(reason).trim() : "";
    if (!trimmed) {
      throw new Error("Lý do bỏ qua là bắt buộc");
    }
    if (trimmed.length > 1000) {
      throw new Error("Lý do bỏ qua tối đa 1000 ký tự");
    }
    if (
      currentStatus &&
      !["OPEN", "REVIEWING"].includes(currentStatus)
    ) {
      throw new Error(
        `Vi phạm đã ở trạng thái ${currentStatus} — không thể bỏ qua.`
      );
    }
    return violationRepository.dismissViolation(id, trimmed);
  },

  /**
   * POST /api/referee/violations (Referee tạo mới — chưa có UI)
   * @param {{
   *   raceId: number, entryId: number, type: string,
   *   severity: 'WARNING'|'MINOR'|'MAJOR'|'SEVERE'|'CRITICAL', description: string
   * }} payload
   */
  async reportViolation(payload = {}) {
    const { raceId, entryId, type, severity, description } = payload;
    if (!raceId) throw new Error("Thiếu mã chặng đua");
    if (!entryId) throw new Error("Thiếu mã entry");
    const trimmedType = type ? String(type).trim() : "";
    if (!trimmedType) throw new Error("Loại vi phạm là bắt buộc");
    if (trimmedType.length > 200) {
      throw new Error("Loại vi phạm tối đa 200 ký tự");
    }
    if (!VIOLATION_SEVERITY.includes(severity)) {
      throw new Error(
        `Mức độ phải là một trong: ${VIOLATION_SEVERITY.join(", ")}`
      );
    }
    const trimmedDesc = description ? String(description).trim() : "";
    if (!trimmedDesc) throw new Error("Mô tả vi phạm là bắt buộc");
    if (trimmedDesc.length > 2000) {
      throw new Error("Mô tả vi phạm tối đa 2000 ký tự");
    }

    return violationRepository.createByReferee({
      raceId: Number(raceId),
      entryId: Number(entryId),
      type: trimmedType,
      severity,
      description: trimmedDesc,
    });
  },

  /**
   * GET /api/me/violations
   * BUG-V-03: Lấy danh sách vi phạm của user hiện tại (Spectator/Jockey/Owner)
   * để hiển thị lịch sử trên profile page. Endpoint BE chưa có — sẽ fallback
   * trả về [] và component sẽ render empty state.
   */
  async getMyViolations() {
    const list = await violationRepository.getMine();
    return Array.isArray(list) ? list : [];
  },

  /**
   * POST /api/admin/violations/direct-penalty
   */
  async directPenalty(payload = {}) {
    const { raceId, entryId, type, severity, penalty, note } = payload;
    if (!raceId || !entryId) throw new Error("Thiếu chặng đua hoặc ngựa vi phạm");
    if (!penalty) throw new Error("Vui lòng chọn hình phạt");
    
    // allow type and severity to be auto generated if not passed, but if passed validate it
    const trimmedNote = note ? String(note).trim() : "";
    if (trimmedNote.length > 2000) {
      throw new Error("Mô tả vi phạm tối đa 2000 ký tự");
    }

    return violationRepository.directPenalty({
      raceId: Number(raceId),
      entryId: Number(entryId),
      type,
      severity,
      penalty,
      note: trimmedNote,
    });
  }
};
