/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MyViolationsList — BUG-V-03 partial.
 *
 * Component hiển thị danh sách violation của user hiện tại (Spectator/Jockey/
 * HorseOwner) trong profile page. Sử dụng được ở cả 3 role để hiển thị lịch sử
 * vi phạm + điểm bị trừ.
 *
 * Khi BE implement `GET /api/me/violations` xong, component sẽ tự động có data;
 * trước đó hiển thị empty state + retry button.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, History, RefreshCw } from "lucide-react";
import { violationService } from "../../services/violationService";
import { ViolationStatusBadge } from "../admin/violation/ViolationStatusBadge";
import { SeverityBadge } from "../ui/Badges";
import { formatDate, formatPoints } from "../../utils/formatter";
import "./MyViolationsList.css";

export function MyViolationsList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await violationService.getMyViolations();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Không tải được danh sách vi phạm");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedList = useMemo(() => {
    return [...list].sort(
      (a, b) =>
        new Date(b.recordedAt || 0).getTime() -
        new Date(a.recordedAt || 0).getTime()
    );
  }, [list]);

  if (loading) {
    return (
      <div className="mvl-card">
        <h3 className="mvl-card__title">
          <History size={14} aria-hidden="true" /> Vi phạm của tôi
        </h3>
        <div className="mvl-loading" aria-busy="true">
          <div className="mvl-spinner" />
          <span>Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mvl-card">
      <header className="mvl-card__header">
        <h3 className="mvl-card__title">
          <History size={14} aria-hidden="true" /> Vi phạm của tôi
        </h3>
        <button
          type="button"
          className="mvl-refresh"
          onClick={load}
          disabled={loading}
          aria-label="Làm mới danh sách vi phạm"
        >
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </header>

      {error ? (
        <div className="mvl-alert" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{error}</span>
          <button
            type="button"
            className="mvl-retry"
            onClick={load}
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!error && sortedList.length === 0 ? (
        <div className="mvl-empty">
          <p>Bạn chưa có vi phạm nào. Hãy thi đấu fair-play nhé!</p>
        </div>
      ) : null}

      {!error && sortedList.length > 0 ? (
        <ul className="mvl-list" aria-label="Danh sách vi phạm">
          {sortedList.map((v) => (
            <li key={v.id} className="mvl-item">
              <div className="mvl-item__header">
                <span className="mvl-item__id">{v.id}</span>
                <ViolationStatusBadge status={v.status} />
                <SeverityBadge severity={v.severity} />
              </div>
              <div className="mvl-item__body">
                <p className="mvl-item__type" title={v.type}>
                  {v.type}
                </p>
                <p className="mvl-item__meta">
                  {v.raceName ?? "—"} · {formatDate(v.recordedAt)}
                </p>
                {v.penalty > 0 ? (
                  <p className="mvl-item__penalty">
                    Phạt: -{formatPoints(v.penalty)} điểm
                  </p>
                ) : null}
                {v.description ? (
                  <p className="mvl-item__desc">{v.description}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default MyViolationsList;
