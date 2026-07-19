/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCw, Lock, Unlock, Eye, Flag, Users, Clock, Plus, UserCog, CheckCircle2, Undo2, ExternalLink } from "lucide-react";
import { raceService } from "../../services/raceService";
import { tournamentService } from "../../services/tournamentService";
import { raceDetailService } from "../../services/raceDetailService";
import { formatDate, mapStatusToVietnamese } from "../../utils/formatter";
import { useToast } from "../../hooks/useToast";
import RaceCreateFormModal from "./RaceCreateFormModal";
import AssignRefereesModal from "./AssignRefereesModal";
import "./AdminRaceStagePage.css";

// Các status hợp lệ theo mainflow.md + openapi.js cho race:
// SCHEDULED | IN_PROGRESS | PENDING_RESULT | PAUSED | FINISHED | CANCELLED
const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "IN_PROGRESS", label: "Đang diễn ra" },
  { value: "PENDING_RESULT", label: "Chờ kết quả" },
  { value: "PAUSED", label: "Tạm dừng" },
  { value: "FINISHED", label: "Đã kết thúc" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "SCHEDULED":
      return "ars-badge ars-badge--scheduled";
    case "IN_PROGRESS":
    case "ONGOING":
      return "ars-badge ars-badge--ongoing";
    case "PENDING_RESULT":
    case "PAUSED":
      return "ars-badge ars-badge--warn";
    case "FINISHED":
      return "ars-badge ars-badge--finished";
    case "CANCELLED":
      return "ars-badge ars-badge--cancelled";
    default:
      return "ars-badge";
  }
}

// Toast Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`ars-toast ars-toast--${type}`}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <span>{message}</span>
      <button type="button" className="ars-toast__close" onClick={onClose} aria-label="Đóng thông báo">×</button>
    </div>
  );
}

// Confirm Modal Component
function ConfirmModal({ race, action, onConfirm, onClose }) {
  const isOpen = action === "OPEN";
  const title = isOpen ? "Mở cổng đăng ký" : "Đóng cổng đăng ký";
  const message = isOpen
    ? `Bạn có muốn mở cổng đăng ký cho chặng "${race.name}"?`
    : `Bạn có muốn đóng cổng đăng ký cho chặng "${race.name}"?`;
  const icon = isOpen ? <Unlock size={24} /> : <Lock size={24} />;
  const iconClass = isOpen ? "ars-confirm-icon ars-confirm-icon--open" : "ars-confirm-icon ars-confirm-icon--close";
  const btnClass = isOpen ? "ars-confirm-btn ars-confirm-btn--open" : "ars-confirm-btn ars-confirm-btn--close";
  const btnText = isOpen ? "Mở cổng" : "Đóng cổng";

  return (
    <div className="ars-modal-backdrop" onClick={onClose}>
      <div className="ars-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ars-confirm-modal__bar" style={{
          background: isOpen
            ? "linear-gradient(90deg, #8dd6a6, #79c0ff)"
            : "linear-gradient(90deg, #e6c364, #f85149)"
        }} />
        <div className="ars-confirm-modal__header">
          <div className={iconClass}>{icon}</div>
          <div>
            <h2 className="ars-confirm-modal__title">{title}</h2>
            <p className="ars-confirm-modal__subtitle">{race.name}</p>
          </div>
        </div>
        <div className="ars-confirm-modal__body">
          <p className="ars-confirm-modal__message">{message}</p>
          {race.registrationOpen && !isOpen && (
            <div className="ars-confirm-modal__warning">
              Cảnh báo: Đóng cổng đăng ký sẽ không cho phép ngựa mới đăng ký tham gia.
            </div>
          )}
        </div>
        <div className="ars-confirm-modal__footer">
          <button
            type="button"
            className="ars-confirm-btn ars-confirm-btn--cancel"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => {
              onConfirm(race, action);
              onClose();
            }}
          >
            {icon}
            {btnText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Registration Detail Modal
function RegistrationModal({ race, registrations, onClose }) {
  const maxSlots = race.maxHorses || 20;
  const registered = registrations?.length || 0;
  const remaining = maxSlots - registered;
  const isFull = remaining <= 0;

  return (
    <div className="ars-modal-backdrop" onClick={onClose}>
      <div className="ars-reg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ars-reg-modal__bar" />
        <div className="ars-reg-modal__header">
          <div>
            <h2 className="ars-reg-modal__title">Đăng ký tham gia</h2>
            <p className="ars-reg-modal__subtitle">{race.name}</p>
          </div>
          <button type="button" className="ars-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="ars-reg-modal__body">
          {/* Registration Status */}
          <div className="ars-reg-status">
            <div className="ars-reg-status__gate">
              {race.isRegistrationOpen || race.registrationOpen ? (
                <span className="ars-badge ars-badge--open">Cổng đang mở</span>
              ) : (
                <span className="ars-badge ars-badge--closed">Cổng đã đóng</span>
              )}
            </div>
            <div className="ars-reg-status__slots">
              <div className="ars-reg-status__slot">
                <Users size={14} />
                <span className="ars-reg-status__slot-label">Đã đăng ký</span>
                <span className="ars-reg-status__slot-value">{registered}</span>
              </div>
              <div className="ars-reg-status__slot">
                <Flag size={14} />
                <span className="ars-reg-status__slot-label">Slots còn lại</span>
                <span className={`ars-reg-status__slot-value ${isFull ? "ars-reg-status__slot-value--full" : ""}`}>
                  {remaining}
                </span>
              </div>
              <div className="ars-reg-status__slot">
                <Clock size={14} />
                <span className="ars-reg-status__slot-label">Tối đa</span>
                <span className="ars-reg-status__slot-value">{maxSlots}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="ars-reg-progress">
            <div
              className={`ars-reg-progress__bar ${isFull ? "ars-reg-progress__bar--full" : ""}`}
              style={{ width: `${Math.min((registered / maxSlots) * 100, 100)}%` }}
            />
          </div>
          <div className="ars-reg-progress__text">
            {isFull ? "Đã đầy slots" : `${remaining} slots còn trống`}
          </div>

          {/* Registered Horses List */}
          {registrations && registrations.length > 0 ? (
            <div className="ars-reg-list">
              <h3 className="ars-reg-list__title">Danh sách ngựa đã đăng ký</h3>
              <div className="ars-reg-list__table-wrap">
                <table className="ars-reg-list__table">
                  <thead>
                    <tr>
                      <th>Ngựa</th>
                      <th>Kỵ sĩ</th>
                      <th>Chủ ngựa</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg, index) => (
                      <tr key={reg.horseId || index}>
                        <td>
                          <div className="ars-reg-list__horse">{reg.horseName}</div>
                          <div className="ars-reg-list__horse-id">#{reg.horseId}</div>
                        </td>
                        <td>{reg.jockeyName}</td>
                        <td>{reg.owner}</td>
                        <td>{formatDate(reg.registeredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="ars-reg-empty">
              <Users size={32} />
              <p>Chưa có ngựa nào đăng ký</p>
            </div>
          )}
        </div>

        <div className="ars-reg-modal__footer">
          <button
            type="button"
            className="ars-confirm-btn ars-confirm-btn--cancel"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRaceStagePage() {
  const navigate = useNavigate();
  const toastify = useToast();
  const [races, setRaces] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tournamentFilter, setTournamentFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Modals
  const [detail, setDetail] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { race, action }
  const [regModal, setRegModal] = useState(null);
  const [createModal, setCreateModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);

  // Toast local — hỗ trợ các flow chưa migrate sang useToast
  const [toast, setToast] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [raceList, tourList] = await Promise.all([
        raceService.getAdminRacesList(),
        tournamentService.getTournamentsList("ALL").catch(() => []),
      ]);
      setRaces(Array.isArray(raceList) ? raceList : []);
      setTournaments(Array.isArray(tourList) ? tourList : []);
    } catch (e) {
      setError(e.message || "Không tải được danh sách chặng đua");
      setRaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // === Polling fallback: refresh race list every 30s ===
  useEffect(() => {
    const refresh = () => {
      raceService.getAdminRacesList().then((list) => {
        if (Array.isArray(list)) setRaces(list);
      }).catch(() => {});
    };
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  const [entriesByRace, setEntriesByRace] = useState({});
  const [loadingEntries, setLoadingEntries] = useState(false);

  const loadEntriesCounts = useCallback(async () => {
    if (races.length === 0) return;
    setLoadingEntries(true);
    try {
      const results = await Promise.all(
        races.map((r) =>
          raceDetailService
            .getEntries(r.raceId)
            .then((list) => [r.raceId, Array.isArray(list) ? list.length : 0])
            .catch(() => [r.raceId, 0])
        ),
      );
      setEntriesByRace(Object.fromEntries(results));
    } catch {
      /* ignore */
    } finally {
      setLoadingEntries(false);
    }
  }, [races]);

  useEffect(() => {
    if (races.length > 0) loadEntriesCounts();
  }, [races.length, loadEntriesCounts]);

  const filtered = useMemo(() => {
    let list = races;
    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (tournamentFilter !== "ALL") {
      list = list.filter((r) => String(r.tournamentId) === String(tournamentFilter));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          String(r.raceId ?? "").includes(q) ||
          (r.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [races, statusFilter, tournamentFilter, search]);

  const stats = useMemo(() => {
    return {
      total: races.length,
      scheduled: races.filter((r) => r.status === "SCHEDULED").length,
      ongoing: races.filter(
        (r) => r.status === "IN_PROGRESS" || r.status === "ONGOING"
      ).length,
      paused: races.filter((r) => r.status === "PAUSED").length,
      finished: races.filter((r) => r.status === "FINISHED").length,
      registrationOpen: races.filter(
        (r) => r.registrationOpen || r.isRegistrationOpen
      ).length,
    };
  }, [races]);

  const replaceRace = (updated) => {
    setRaces((prev) =>
      prev.map((r) => (r.raceId === updated.raceId ? updated : r))
    );
  };

  const handleOpenRegistration = (race) => {
    setConfirmAction({ race, action: "OPEN" });
  };

  const handleCloseRegistration = (race) => {
    setConfirmAction({ race, action: "CLOSE" });
  };

  /**
   * Toggle registration gate theo action ("OPEN" | "CLOSE") được truyền từ ConfirmModal.
   * Fallback về confirmAction hiện tại nếu ConfirmModal không pass action (defensive).
   */
  const executeToggleRegistration = async (race, actionArg) => {
    // Ưu tiên actionArg (do ConfirmModal pass lên) — fallback về state confirmAction.
    const action = actionArg ?? confirmAction?.action ?? "CLOSE";
    setBusyId(race.raceId);
    try {
      const isOpening = action === "OPEN";
      // PUT /api/admin/races/:id/registration-gate { isOpen } (raceRepository.setRegistrationGate)
      const result = await raceService.setRegistrationGate(race.raceId, isOpening);
      const updated = result?.race || {
        ...race,
        registrationOpen: isOpening,
        isRegistrationOpen: isOpening,
        registrationOpenedAt: isOpening ? new Date().toISOString() : race.registrationOpenedAt,
        registrationClosedAt: !isOpening ? new Date().toISOString() : race.registrationClosedAt,
      };
      replaceRace(updated);
      toastify?.success?.(
        isOpening
          ? `Đã mở cổng đăng ký cho "${race.name}"`
          : `Đã đóng cổng đăng ký cho "${race.name}". Auto-reject các entry PENDING.`
      );
    } catch (e) {
      toastify?.error?.(e.message || "Không thể thay đổi trạng thái cổng đăng ký");
    } finally {
      setBusyId(null);
    }
  };

  const handleViewRegistrations = async (race) => {
    setBusyId(race.raceId);
    try {
      // Gọi API admin/races/:id/entries để lấy danh sách registration thật.
      // Trước đây chỉ dùng mock — sai dữ liệu so với backend.
      const list = await raceDetailService.getEntries(race.raceId);
      const rows = (Array.isArray(list) ? list : []).map((e) => ({
        horseId: e.horseId,
        horseName: e.horseName || e.horse?.name || `#${e.horseId}`,
        jockeyName: e.jockeyName || e.jockey?.fullName || "Chưa có",
        owner: e.owner?.fullName || e.ownerName || "—",
        registeredAt: e.registeredAt || e.createdAt,
        entryId: e.entryId || e.id,
        status: e.status,
      }));
      setRegModal({ race, registrations: rows });
    } catch (e) {
      toastify?.error?.(
        e?.message || "Không tải được danh sách đăng ký của chặng đua."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ars-page">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="ars-page__header">
        <div>
          <h1 className="ars-page__title">
            Quản lý chặng đua
          </h1>
          <p className="ars-page__desc">
            Theo dõi các chặng đua, mở/đóng cổng đăng ký, phân công trọng tài và publish kết quả.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="adm-t-btn adm-t-btn--primary"
            onClick={() => setCreateModal({})}
            disabled={tournaments.length === 0}
            title={
              tournaments.length === 0
                ? "Chưa có giải đấu để thêm chặng đua"
                : "Tạo chặng đua mới trong 1 giải đấu"
            }
          >
            <Plus size={14} />
            Tạo chặng đua
          </button>
        </div>
      </header>

      <div className="ars-stats">
        <div className="ars-stat">
          <div className="ars-stat__label">Tổng chặng</div>
          <div className="ars-stat__value">{stats.total}</div>
        </div>
        <div className="ars-stat">
          <div className="ars-stat__label">Đã lên lịch</div>
          <div className="ars-stat__value">{stats.scheduled}</div>
        </div>
        <div className="ars-stat">
          <div className="ars-stat__label">Đang diễn ra</div>
          <div className="ars-stat__value ars-stat__value--ok">{stats.ongoing}</div>
        </div>
        <div className="ars-stat">
          <div className="ars-stat__label">Tạm dừng</div>
          <div className="ars-stat__value ars-stat__value--warn">{stats.paused}</div>
        </div>
        <div className="ars-stat">
          <div className="ars-stat__label">Cổng mở</div>
          <div className="ars-stat__value ars-stat__value--info">{stats.registrationOpen}</div>
        </div>
      </div>

      <div className="ars-toolbar">
        <div className="ars-search-wrap">
          <Search className="ars-search-icon" size={14} />
          <input
            className="ars-search"
            type="search"
            placeholder="Tìm theo tên chặng, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="ars-select"
          value={tournamentFilter}
          onChange={(e) => setTournamentFilter(e.target.value)}
        >
          <option value="ALL">Tất cả giải đấu</option>
          {tournaments.map((t) => (
            <option key={t.tournamentId} value={t.tournamentId}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="ars-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ars-btn ars-btn--ghost"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {error && !loading && <div className="ars-alert--error">{error}</div>}

      <div className="ars-panel">
        {loading ? (
          <div className="ars-loading">
            <div className="ars-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="ars-empty">Chưa có chặng đua nào phù hợp bộ lọc.</div>
        ) : (
          <div className="ars-table-wrap">
            <table className="ars-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Chặng đua</th>
                  <th>Giải đấu</th>
                  <th>Trọng tài</th>
                  <th>Thời gian</th>
                  <th>Cổng ĐK</th>
                  <th>Slots</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isBusy = busyId === r.raceId;
                  const tournament = tournaments.find(
                    (t) => t.tournamentId === r.tournamentId
                  );
                  const isRegOpen = r.registrationOpen || r.isRegistrationOpen;
                  const maxSlots = r.maxHorses || r.maxEntries || 20;

                  return (
                    <tr key={r.raceId}>
                      <td>#{r.raceId}</td>
                      <td>
                        <div className="ars-name">
                          <Flag size={12} className="ars-name__icon" />
                          {r.name}
                        </div>
                      </td>
                      <td>{tournament?.name || `#${r.tournamentId}`}</td>
                      <td>
                        {r.refereeAId && r.refereeBId ? (
                          <span className="ars-meta" title={`#${r.refereeAId}, #${r.refereeBId}`}>
                            #{r.refereeAId} · #{r.refereeBId}
                          </span>
                        ) : (
                          <span className="ars-meta" style={{ color: "#e6c364" }}>
                            Chưa phân công
                          </span>
                        )}
                      </td>
                      <td>
                        <div>{formatDate(r.scheduledAt)}</div>
                        {r.registrationDeadline && (
                          <div className="ars-meta">
                            Hạn ĐK: {formatDate(r.registrationDeadline)}
                          </div>
                        )}
                      </td>
                      <td>
                        {isRegOpen ? (
                          <span className="ars-badge ars-badge--open">Mở</span>
                        ) : (
                          <span className="ars-badge ars-badge--closed">Đóng</span>
                        )}
                      </td>
                      <td>
                        <div className="ars-slots">
                          {loadingEntries && entriesByRace[r.raceId] === undefined ? (
                            <span className="ars-slots__count ars-slots__count--loading" aria-label="Đang tải">…</span>
                          ) : (
                            <span className={`ars-slots__count ${(entriesByRace[r.raceId] ?? 0) >= maxSlots ? "ars-slots__count--full" : ""}`}>
                              {entriesByRace[r.raceId] ?? 0}/{maxSlots}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={statusBadgeClass(r.status)}>
                          {mapStatusToVietnamese(r.status) || r.status}
                        </span>
                      </td>
                      <td>
                        <div className="ars-actions">
                          <button
                            type="button"
                            className="ars-icon-btn"
                            title="Phân công trọng tài (Flow 3 — Step 3)"
                            disabled={r.status === "FINISHED" || r.status === "CANCELLED"}
                            onClick={() => setAssignModal(r)}
                          >
                            <UserCog size={14} />
                          </button>
                          <button
                            type="button"
                            className="ars-icon-btn"
                            title="Xem đăng ký"
                            onClick={() => handleViewRegistrations(r)}
                          >
                            <Users size={14} />
                          </button>
                          <button
                            type="button"
                            className="ars-icon-btn"
                            title="Xem chi tiết"
                            onClick={() => setDetail(r)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="ars-icon-btn"
                            title="Trang chi tiết đầy đủ (entries, gợi ý AI, settlement...)"
                            onClick={() => navigate(`/admin/races/${r.raceId}`)}
                          >
                            <ExternalLink size={14} />
                          </button>
                          {r.status !== "FINISHED" && r.status !== "CANCELLED" && (
                            <>
                              {isRegOpen ? (
                                <button
                                  type="button"
                                  className="ars-icon-btn ars-icon-btn--warn"
                                  title="Đóng cổng đăng ký"
                                  disabled={isBusy}
                                  onClick={() => handleCloseRegistration(r)}
                                >
                                  <Lock size={14} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="ars-icon-btn ars-icon-btn--ok"
                                  title="Mở cổng đăng ký"
                                  disabled={isBusy}
                                  onClick={() => handleOpenRegistration(r)}
                                >
                                  <Unlock size={14} />
                                </button>
                              )}
                            </>
                          )}

                          {/* FLOW 8: nút publish / rollback inline */}
                          {r.status === "PENDING_RESULT" && (
                            <button
                              type="button"
                              className="ars-icon-btn ars-icon-btn--primary"
                              title="Publish kết quả (settle bets)"
                              disabled={isBusy}
                              onClick={() => setDetail(r)}
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {r.status === "FINISHED" && (
                            <button
                              type="button"
                              className="ars-icon-btn ars-icon-btn--warn"
                              title="Rollback settlement"
                              disabled={isBusy}
                              onClick={() => setDetail(r)}
                            >
                              <Undo2 size={14} />
                            </button>
                          )}
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

      {/* Detail Modal */}
      {detail && (
        <div className="ars-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="ars-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ars-modal__bar" />
            <div className="ars-modal__header">
              <div>
                <h2 className="ars-modal__title">{detail.name}</h2>
                <p className="ars-modal__subtitle">Mã chặng: #{detail.raceId}</p>
              </div>
              <button type="button" className="ars-modal__close" onClick={() => setDetail(null)}>
                ×
              </button>
            </div>
            <div className="ars-modal__body">
              <DetailRow label="Giải đấu" value={`#${detail.tournamentId}`} />
              <DetailRow label="Thời gian dự kiến" value={formatDate(detail.scheduledAt)} />
              <DetailRow label="Hạn đăng ký" value={formatDate(detail.registrationDeadline)} />
              <DetailRow
                label="Trọng tài"
                value={
                  detail.refereeAId && detail.refereeBId
                    ? `#${detail.refereeAId} & #${detail.refereeBId}`
                    : <span style={{ color: "#e6c364" }}>Chưa phân công đủ</span>
                }
              />
              <DetailRow
                label="Cổng đăng ký"
                value={
                  detail.registrationOpen || detail.isRegistrationOpen ? (
                    <span className="ars-badge ars-badge--open">Đang mở</span>
                  ) : (
                    <span className="ars-badge ars-badge--closed">Đã đóng</span>
                  )
                }
              />
              <DetailRow
                label="Slots"
                value={`${entriesByRace[detail.raceId] ?? 0}/${detail.maxHorses || detail.maxEntries || 20}`}
              />
              <DetailRow
                label="Trạng thái"
                value={
                  <span className={statusBadgeClass(detail.status)}>
                    {mapStatusToVietnamese(detail.status) || detail.status}
                  </span>
                }
              />
              <DetailRow label="Ngày công bố" value={formatDate(detail.publishedAt)} />
              <DetailRow label="Ngày tạo" value={formatDate(detail.createdAt)} />
            </div>
            {detail.status !== "FINISHED" && detail.status !== "CANCELLED" && (
              <div className="ars-modal__footer">
                {detail.registrationOpen || detail.isRegistrationOpen ? (
                  <button
                    type="button"
                    className="ars-btn ars-btn--warn"
                    onClick={() => {
                      handleCloseRegistration(detail);
                      setDetail(null);
                    }}
                    disabled={busyId === detail.raceId}
                  >
                    <Lock size={14} />
                    Đóng cổng đăng ký
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ars-btn ars-btn--ok"
                    onClick={() => {
                      handleOpenRegistration(detail);
                      setDetail(null);
                    }}
                    disabled={busyId === detail.raceId}
                  >
                    <Unlock size={14} />
                    Mở cổng đăng ký
                  </button>
                )}
                <button
                  type="button"
                  className="ars-btn ars-btn--ghost"
                  onClick={() => setDetail(null)}
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <ConfirmModal
          race={confirmAction.race}
          action={confirmAction.action}
          onConfirm={executeToggleRegistration}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {/* Registration Modal */}
      {regModal && (
        <RegistrationModal
          race={regModal.race}
          registrations={regModal.registrations}
          onClose={() => setRegModal(null)}
        />
      )}

      {/* Race Create Modal — FLOW 3 Step 2 */}
      {createModal ? (
        <RaceCreateFormModal
          tournaments={tournaments}
          defaultTournamentId={tournamentFilter !== "ALL" ? tournamentFilter : undefined}
          onClose={() => setCreateModal(null)}
          onCreated={async (created) => {
            setCreateModal(null);
            if (created) {
              setRaces((prev) => [created, ...prev]);
              // Refresh entry count cho race mới (entry count = 0 nhưng loadEntriesCounts sẽ tự xử lý)
              await loadEntriesCounts();
            }
            toastify?.success?.(`Đã tạo chặng đua "${created?.name ?? ""}"`);
          }}
        />
      ) : null}

      {/* Assign Referees Modal — FLOW 3 Step 3 */}
      {assignModal ? (
        <AssignRefereesModal
          race={assignModal}
          onClose={() => setAssignModal(null)}
          onAssigned={(updated) => {
            if (updated) replaceRace(updated);
            setAssignModal(null);
            toastify?.success?.(
              `Đã phân công trọng tài cho "${assignModal.name}"`
            );
          }}
        />
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="ars-detail-row">
      <span className="ars-detail-row__label">{label}</span>
      <span className="ars-detail-row__value">{value || "—"}</span>
    </div>
  );
}
