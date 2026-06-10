/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { tournamentService } from "../../services/tournamentService";
import { formatDate } from "../../utils/formatter";
import {
  TOURNAMENT_STATUS_OPTIONS,
  TOURNAMENT_TRANSITIONS,
  tournamentStatusClass,
  tournamentStatusLabel,
} from "../../utils/tournamentStatus";
import AdminTournamentFormModal from "./AdminTournamentFormModal";
import "./AdminTournamentsPage.css";

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await tournamentService.getTournamentsList(statusFilter || "ALL");
      setTournaments(list);
    } catch (e) {
      setError(e.message || "Không tải được danh sách giải đấu");
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tournaments;
    return tournaments.filter((t) => {
      return (
        String(t.tournamentId ?? "").includes(q) ||
        (t.name ?? "").toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [tournaments, search]);

  const stats = useMemo(() => {
    let races = 0;
    for (const t of tournaments) races += t._count?.races ?? 0;
    return {
      total: tournaments.length,
      open: tournaments.filter((t) => t.status === "OPEN").length,
      draft: tournaments.filter((t) => t.status === "DRAFT").length,
      races,
    };
  }, [tournaments]);

  const replaceTournament = (updated) => {
    setTournaments((prev) =>
      prev.map((t) => (t.tournamentId === updated.tournamentId ? updated : t))
    );
  };

  const handleStatusChange = async (tournament, nextStatus) => {
    if (!nextStatus || nextStatus === tournament.status) return;

    let cancelReason;
    if (nextStatus === "CANCELLED") {
      cancelReason = window.prompt("Nhập lý do hủy giải đấu:");
      if (!cancelReason?.trim()) return;
    }

    setBusyId(tournament.tournamentId);
    try {
      const updated = await tournamentService.changeTournamentStatus(
        tournament.tournamentId,
        nextStatus,
        cancelReason?.trim()
      );
      replaceTournament(updated);
    } catch (e) {
      window.alert(e.message || "Không đổi được trạng thái");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (tournament) => {
    const hasRaces = (tournament._count?.races ?? 0) > 0;
    const msg = hasRaces
      ? "Giải đã có chặng đua — hệ thống sẽ HỦY thay vì xóa. Nhập lý do:"
      : "Xác nhận xóa giải đấu này? Nhập lý do (có thể để trống nếu chưa có chặng):";

    const reason = window.prompt(msg);
    if (reason === null) return;
    if (hasRaces && !reason.trim()) {
      window.alert("Bắt buộc nhập lý do khi hủy giải có chặng đua");
      return;
    }

    setBusyId(tournament.tournamentId);
    try {
      const result = await tournamentService.deleteTournament(
        tournament.tournamentId,
        reason.trim() || undefined
      );
      if (result?.tournament) {
        replaceTournament(result.tournament);
      } else {
        setTournaments((prev) => prev.filter((t) => t.tournamentId !== tournament.tournamentId));
      }
    } catch (e) {
      window.alert(e.message || "Không xóa/hủy được giải đấu");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="adm-t-page">
      <header className="adm-t-page__header">
        <div>
          <h1 className="adm-t-page__title">Quản lý giải đua ngựa</h1>
          <p className="adm-t-page__desc">
           
      
          </p>
        </div>
        <button type="button" className="adm-t-btn adm-t-btn--primary" onClick={() => setModal({ mode: "create" })}>
          <Plus size={16} />
          Tạo giải đấu
        </button>
      </header>

      <div className="adm-t-stats">
        <div className="adm-t-stat">
          <div className="adm-t-stat__label">Tổng giải</div>
          <div className="adm-t-stat__value">{stats.total}</div>
        </div>
        <div className="adm-t-stat">
          <div className="adm-t-stat__label">Đang mở</div>
          <div className="adm-t-stat__value">{stats.open}</div>
        </div>
        <div className="adm-t-stat">
          <div className="adm-t-stat__label">Nháp</div>
          <div className="adm-t-stat__value">{stats.draft}</div>
        </div>
        <div className="adm-t-stat">
          <div className="adm-t-stat__label">Tổng chặng</div>
          <div className="adm-t-stat__value">{stats.races}</div>
        </div>
      </div>

      <div className="adm-t-toolbar">
        <input
          className="adm-t-search"
          type="search"
          placeholder="Tìm theo tên, mô tả, ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="adm-t-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {TOURNAMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="button" className="adm-t-btn adm-t-btn--ghost" onClick={loadTournaments} disabled={loading}>
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      <div className="adm-t-panel">
        {loading ? (
          <div className="adm-t-loading">
            <div className="adm-t-spinner" />
          </div>
        ) : error ? (
          <div className="adm-t-error">
            {error}
            <div style={{ marginTop: "0.75rem" }}>
              <button type="button" className="adm-t-btn adm-t-btn--ghost" onClick={loadTournaments}>
                Thử lại
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-t-empty">Chưa có giải đấu nào phù hợp bộ lọc.</div>
        ) : (
          <div className="adm-t-table-wrap">
            <table className="adm-t-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Giải đấu</th>
                  <th>Thời gian</th>
                  <th>Chặng</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const transitions = TOURNAMENT_TRANSITIONS[t.status] ?? [];
                  const isBusy = busyId === t.tournamentId;

                  return (
                    <tr key={t.tournamentId}>
                      <td>#{t.tournamentId}</td>
                      <td>
                        <div className="adm-t-name">{t.name}</div>
                        {t.description && <div className="adm-t-meta">{t.description}</div>}
                        {t.cancelReason && (
                          <div className="adm-t-meta" style={{ color: "#ff7b72" }}>
                            Lý do hủy: {t.cancelReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <div>{formatDate(t.startAt)} → {formatDate(t.endAt)}</div>
                      </td>
                      <td>{t._count?.races ?? 0}</td>
                      <td>
                        <span className={tournamentStatusClass(t.status)}>
                          {tournamentStatusLabel(t.status)}
                        </span>
                      </td>
                      <td>
                        <div className="adm-t-actions">
                          <button
                            type="button"
                            className="adm-t-icon-btn"
                            title="Chỉnh sửa"
                            disabled={isBusy || t.status === "FINISHED" || t.status === "CANCELLED"}
                            onClick={() => setModal({ mode: "edit", id: t.tournamentId })}
                          >
                            <Pencil size={14} />
                          </button>
                          {transitions.length > 0 && (
                            <select
                              className="adm-t-status-select"
                              value=""
                              disabled={isBusy}
                              onChange={(e) => handleStatusChange(t, e.target.value)}
                            >
                              <option value="">Đổi TT</option>
                              {transitions.map((s) => (
                                <option key={s} value={s}>
                                  → {tournamentStatusLabel(s)}
                                </option>
                              ))}
                            </select>
                          )}
                          <button
                            type="button"
                            className="adm-t-btn adm-t-btn--danger"
                            disabled={isBusy}
                            onClick={() => handleDelete(t)}
                          >
                            <Trash2 size={14} />
                            {t._count?.races > 0 ? "Hủy" : "Xóa"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal?.mode === "create" && (
        <AdminTournamentFormModal onClose={() => setModal(null)} onSaved={loadTournaments} />
      )}
      {modal?.mode === "edit" && (
        <AdminTournamentFormModal
          tournamentId={modal.id}
          onClose={() => setModal(null)}
          onSaved={loadTournaments}
        />
      )}
    </div>
  );
}
