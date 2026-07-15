/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Play, Info } from "lucide-react";
import { tournamentService } from "../../services/tournamentService";
import { formatDate } from "../../utils/formatter";
import {
  TOURNAMENT_STATUS_OPTIONS,
  TOURNAMENT_TRANSITIONS,
  tournamentStatusClass,
  tournamentStatusLabel,
  checkTournamentReadyToStart,
} from "../../utils/tournamentStatus";
import { useToast } from "../../hooks/useToast";
import AdminTournamentFormModal from "./AdminTournamentFormModal";
import TournamentCancelModal from "./TournamentCancelModal";
import "./AdminTournamentsPage.css";

export default function AdminTournamentsPage() {
  const toastify = useToast();
  const [tournaments, setTournaments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  // cancelModal: { tournament, mode: 'status'|'delete', targetStatus? }

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

    // OPEN → ONGOING: check readiness conditions
    if (tournament.status === "OPEN" && nextStatus === "ONGOING") {
      const { ready, reasons } = checkTournamentReadyToStart(
        tournament,
        tournament._count?.approvedEntries ?? 0,
        { refereeAId: tournament.refereeAId, refereeBId: tournament.refereeBId }
      );
      if (!ready) {
        const msg = `Chưa thể bắt đầu giải:\n• ${reasons.join("\n• ")}`;
        toastify?.error?.(msg);
        return;
      }
    }

    if (nextStatus === "CANCELLED") {
      setCancelModal({ tournament, mode: "status", targetStatus: nextStatus });
      return;
    }

    setBusyId(tournament.tournamentId);
    try {
      const updated = await tournamentService.changeTournamentStatus(
        tournament.tournamentId,
        nextStatus
      );
      replaceTournament(updated);
      toastify?.success?.(`Đã đổi trạng thái → ${nextStatus}`);
    } catch (e) {
      toastify?.error?.(e.message || "Không đổi được trạng thái");
    } finally {
      setBusyId(null);
    }
  };

  const handleAskDelete = (tournament) => {
    setCancelModal({ tournament, mode: "delete" });
  };

  const handleDelete = async (tournament, reason) => {
    const hasRaces = (tournament._count?.races ?? 0) > 0;
    if (hasRaces && !reason?.trim()) {
      toastify?.error?.("Bắt buộc nhập lý do khi hủy giải có chặng đua");
      return;
    }

    setBusyId(tournament.tournamentId);
    try {
      const result = await tournamentService.deleteTournament(
        tournament.tournamentId,
        reason?.trim() || undefined
      );
      if (result?.tournament) {
        replaceTournament(result.tournament);
      } else {
        setTournaments((prev) => prev.filter((t) => t.tournamentId !== tournament.tournamentId));
      }
      toastify?.success?.(
        hasRaces ? "Đã hủy giải đấu" : "Đã xoá giải đấu"
      );
    } catch (e) {
      toastify?.error?.(e.message || "Không xóa/hủy được giải đấu");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmCancel = async ({ reason }) => {
    if (!cancelModal) return;
    const { tournament, mode, targetStatus } = cancelModal;
    setBusyId(tournament.tournamentId);
    try {
      if (mode === "delete") {
        await handleDelete(tournament, reason);
        setCancelModal(null);
        return;
      }
      // mode === "status"
      const updated = await tournamentService.changeTournamentStatus(
        tournament.tournamentId,
        targetStatus,
        reason.trim()
      );
      replaceTournament(updated);
      toastify?.success?.("Đã hủy giải đấu");
      setCancelModal(null);
    } catch (e) {
      toastify?.error?.(e.message || "Không thực hiện được thao tác");
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
          <div className="adm-t-stat__label">Đang chờ</div>
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
                  <th>Đổi trạng thái</th>
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
                        {/* Ready indicator for OPEN tournaments */}
                        {t.status === "OPEN" && (() => {
                          const { ready, reasons } = checkTournamentReadyToStart(
                            t,
                            t._count?.approvedEntries ?? 0,
                            { refereeAId: t.refereeAId, refereeBId: t.refereeBId }
                          );
                          if (ready) {
                            return (
                              <div className="adm-t-ready-badge" title="Sẵn sàng bắt đầu">
                                <Play size={12} /> Sẵn sàng
                              </div>
                            );
                          }
                          return (
                            <div className="adm-t-pending-badge" title={reasons.join("; ")}>
                              <Info size={12} /> {reasons.length} điều kiện chưa đủ
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        {transitions.length > 0 ? (
                          <select
                            className="adm-t-status-select"
                            value=""
                            disabled={isBusy}
                            onChange={(e) => handleStatusChange(t, e.target.value)}
                          >
                            <option value="">Chọn...</option>
                            {transitions.map((s) => (
                              <option key={s} value={s}>
                                {tournamentStatusLabel(s)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="adm-t-na">—</span>
                        )}
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
                          <button
                            type="button"
                            className="adm-t-icon-btn adm-t-icon-btn--danger"
                            title={t._count?.races > 0 ? "Hủy giải đấu" : "Xóa giải đấu"}
                            disabled={isBusy}
                            onClick={() => handleAskDelete(t)}
                          >
                            <Trash2 size={14} />
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

      {cancelModal ? (
        <TournamentCancelModal
          tournament={cancelModal.tournament}
          mode={cancelModal.mode}
          targetStatus={cancelModal.targetStatus}
          busy={busyId === cancelModal.tournament.tournamentId}
          onClose={() => setCancelModal(null)}
          onConfirm={handleConfirmCancel}
        />
      ) : null}
    </div>
  );
}
