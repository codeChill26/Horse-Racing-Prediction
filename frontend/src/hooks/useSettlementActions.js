/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSettlementActions — Custom hook encapsulate Flow 8 publish/rollback logic.
 *
 * Trả về:
 *   - state: publishBusy, rollbackBusy, settlement, refetchSettlement
 *   - actions: publishRace(askBefore), unpublishRace(reason)
 *
 * Race state được merge thông qua callback `onRaceUpdated` (để parent giữ
 * ownership về `race` state, tránh duplicate state giữa hook + component).
 */

import { useCallback, useState } from "react";
import { settlementService } from "../services/settlementService";
import { showToast } from "./showToast";

export function useSettlementActions({ raceId, onRaceUpdated }) {
  const [publishBusy, setPublishBusy] = useState(false);
  const [rollbackBusy, setRollbackBusy] = useState(false);
  const [settlement, setSettlement] = useState(null);

  const refetchSettlement = useCallback(async () => {
    if (!raceId) return;
    try {
      const summary = await settlementService.getSettlement(raceId);
      setSettlement(summary);
    } catch {
      setSettlement(null);
    }
  }, [raceId]);

  /**
   * publishRace — POST /api/admin/settlement/publish/:raceId
   * @param {boolean} confirm — bật `confirm: true` cho BE validate lần cuối
   * @returns {Promise<{ race, settlement, predictions } | null>}
   */
  const publishRace = useCallback(
    async (confirm = true) => {
      if (!raceId) {
        showToast.error("Thiếu ID chặng đua.", "Publish lỗi");
        return null;
      }
      setPublishBusy(true);
      try {
        const result = await settlementService.publishRace(raceId, { confirm });
        if (result?.race) {
          onRaceUpdated?.(result.race);
        } else {
          onRaceUpdated?.({ status: "FINISHED" });
        }
        if (result?.settlement) {
          setSettlement(result.settlement);
        } else {
          await refetchSettlement();
        }
        const won = Number(result?.settlement?.wonCount ?? 0);
        const paid = Number(result?.settlement?.actualTotalPayout ?? 0);
        showToast.success(
          `Đã publish kết quả — ${won.toLocaleString("vi-VN")} vé thắng, tổng payout ${paid.toLocaleString("vi-VN")} điểm.`,
          "Publish thành công"
        );
        return result;
      } catch (e) {
        showToast.error(e?.message || "Publish thất bại", "Publish lỗi");
        return null;
      } finally {
        setPublishBusy(false);
      }
    },
    [raceId, onRaceUpdated, refetchSettlement]
  );

  /**
   * unpublishRace — POST /api/admin/settlement/unpublish/:raceId
   * @param {string} reason
   * @returns {Promise<boolean>} true nếu success
   */
  const unpublishRace = useCallback(
    async (reason) => {
      if (!raceId) {
        showToast.error("Thiếu ID chặng đua.", "Rollback lỗi");
        return false;
      }
      if (!reason || !String(reason).trim()) {
        showToast.error("Vui lòng nhập lý do rollback để ghi nhận audit log.");
        return false;
      }
      setRollbackBusy(true);
      try {
        await settlementService.unpublishRace(raceId, { reason });
        onRaceUpdated?.({ status: "PENDING_RESULT" });
        setSettlement(null);
        showToast.success(`Đã rollback settlement. Lý do: ${reason}`, "Rollback thành công");
        return true;
      } catch (e) {
        showToast.error(e?.message || "Rollback thất bại", "Rollback lỗi");
        return false;
      } finally {
        setRollbackBusy(false);
      }
    },
    [raceId, onRaceUpdated]
  );

  return {
    publishBusy,
    rollbackBusy,
    settlement,
    setSettlement,
    refetchSettlement,
    publishRace,
    unpublishRace,
  };
}
