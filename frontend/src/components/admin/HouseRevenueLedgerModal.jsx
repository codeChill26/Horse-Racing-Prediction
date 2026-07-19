/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HouseRevenueLedgerModal — Sổ cái cộng/trừ của nhà cái (Admin).
 * Mở khi bấm card "Lãi Nhà Cái" trên dashboard. Gọi
 * GET /api/admin/house-revenue/transactions.
 */

import { useEffect, useState } from "react";
import { X, TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { houseRevenueService } from "../../services/houseRevenueService";
import { formatPoints, formatDateTime } from "../../utils/formatter";

const TYPE_LABEL = {
  HOUSE_MARGIN: "Phí vận hành 10%",
  TREASURE_IN: "Nạp quỹ dự phòng",
  TREASURE_OUT: "Bù lỗ từ quỹ",
};

export default function HouseRevenueLedgerModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await houseRevenueService.getHouseRevenueTransactions({ limit: 100 });
        if (alive) setData(res);
      } catch (e) {
        if (alive) setError(e.message || "Không tải được sổ cái");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const txs = data?.transactions ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161B22] border border-[#30363D] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#30363D]">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <Landmark className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-serif font-black text-on-surface text-lg">Sổ cái nhà cái</h2>
              <p className="text-[11px] text-on-surface-variant">
                Chi tiết cộng/trừ theo từng trận đã quyết toán
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {loading && <p className="text-on-surface-variant text-sm">Đang tải sổ cái…</p>}
          {error && <p className="text-error text-sm">{error}</p>}
          {!loading && !error && txs.length === 0 && (
            <p className="text-on-surface-variant text-sm">
              Chưa có giao dịch nào (chưa trận nào được quyết toán).
            </p>
          )}
          {!loading && !error && txs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-on-surface-variant border-b border-[#30363D]">
                    <th className="text-left py-2 pr-3">Thời gian</th>
                    <th className="text-left py-2 pr-3">Trận</th>
                    <th className="text-left py-2 pr-3">Loại</th>
                    <th className="text-right py-2">Cộng / Trừ</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => {
                    const positive = t.amount >= 0;
                    return (
                      <tr key={t.transactionId} className="border-b border-[#30363D]/50">
                        <td className="py-2.5 pr-3 text-on-surface-variant whitespace-nowrap">
                          {formatDateTime(t.createdAt)}
                        </td>
                        <td className="py-2.5 pr-3 text-on-surface">
                          {t.raceId != null ? `#${t.raceId}` : "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-on-surface">
                          {TYPE_LABEL[t.type] || t.type}
                        </td>
                        <td
                          className={`py-2.5 text-right font-mono font-bold ${
                            positive ? "text-primary" : "text-error"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1 justify-end">
                            {positive ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                            {positive ? "+" : "−"}
                            {formatPoints(Math.abs(t.amount))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#30363D] text-right">
          {data && (
            <span className="text-[11px] text-on-surface-variant mr-3">
              Tổng {data.total} giao dịch
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm bg-surface-container-highest text-on-surface rounded-lg border border-[#30363D] hover:border-primary/30"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
