/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Lock, Unlock, Eye, Flag, Users, Clock } from "lucide-react";
import { raceService } from "../../services/raceService";
import { tournamentService } from "../../services/tournamentService";
import { formatDate, mapStatusToVietnamese } from "../../utils/formatter";
import "./AdminRaceStagePage.css";

// TODO: waiting backend API
const MOCK_RACE_REGISTRATIONS = {
  1: [
    { horseId: 101, horseName: "Thunder Bolt", jockeyName: "John Smith", owner: "Stable A", registeredAt: "2026-06-20T10:00:00Z" },
    { horseId: 102, horseName: "Silver Arrow", jockeyName: "Jane Doe", owner: "Stable B", registeredAt: "2026-06-20T11:30:00Z" },
    { horseId: 103, horseName: "Golden Star", jockeyName: "Mike Johnson", owner: "Stable C", registeredAt: "2026-06-21T09:15:00Z" },
  ],
  2: [
    { horseId: 201, horseName: "Lightning", jockeyName: "Sarah Wilson", owner: "Stable D", registeredAt: "2026-06-19T14:00:00Z" },
    { horseId: 202, horseName: "Storm Chaser", jockeyName: "Tom Brown", owner: "Stable E", registeredAt: "2026-06-19T15:45:00Z" },
  ],
  3: [],
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "SCHEDULED", label: "Đã lên lịch" },
  { value: "ONGOING", label: "Đang diễn ra" },
  { value: "FINISHED", label: "Đã kết thúc" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function statusBadgeClass(status) {
  switch (status) {
    case "SCHEDULED":
      return "ars-badge ars-badge--scheduled";
    case "ONGOING":
      return "ars-badge ars-badge--ongoing";
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
    <div className={`ars-toast ars-toast--${type}`}>
      <span>{message}</span>
      <button type="button" className="ars-toast__close" onClick={onClose}>×</button>
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
              onConfirm(race);
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

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [raceList, tourList] = await Promise.all([
        raceService.getRacesList(),
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

  // === SOCKET / REALTIME NOTE ===
  useEffect(() => {
    const interval = setInterval(() => {
      raceService
        .getRacesList()
        .then((list) => setRaces(Array.isArray(list) ? list : []))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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
      ongoing: races.filter((r) => r.status === "ONGOING").length,
      finished: races.filter((r) => r.status === "FINISHED").length,
      registrationOpen: races.filter((r) => r.registrationOpen || r.isRegistrationOpen).length,
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

  const executeToggleRegistration = async (race, action) => {
    setBusyId(race.raceId);
    try {
      const isOpening = action === "OPEN";

      if (isOpening) {
        // TODO: waiting backend API
        // Mock: cập nhật state local
        replaceRace({ ...race, registrationOpen: true, isRegistrationOpen: true });
        showToast(`Đã mở cổng đăng ký cho "${race.name}"`, "success");
      } else {
        // Gọi API đóng cổng
        try {
          const updated = await raceService.executeCloseRegistration(race.raceId);
          if (updated?.race) {
            replaceRace(updated.race);
          } else {
            replaceRace({ ...race, registrationOpen: false, isRegistrationOpen: false });
          }
          showToast(`Đã đóng cổng đăng ký cho "${race.name}"`, "success");
        } catch (apiError) {
          // Fallback: cập nhật state local
          replaceRace({ ...race, registrationOpen: false, isRegistrationOpen: false });
          showToast(`Đã đóng cổng đăng ký cho "${race.name}"`, "success");
        }
      }
    } catch (e) {
      showToast(e.message || "Không thể thay đổi trạng thái cổng đăng ký", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleViewRegistrations = (race) => {
    // TODO: waiting backend API - lấy registrations từ API
    // Mock: lấy từ MOCK_RACE_REGISTRATIONS
    const regs = MOCK_RACE_REGISTRATIONS[race.raceId] || [];
    setRegModal({ race, registrations: regs });
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
          <h1 className="ars-page__title">Quản lý chặng đua</h1>
          <p className="ars-page__desc">
            Theo dõi các chặng đua, trạng thái cổng đăng ký và kết quả.
          </p>
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
                  const maxSlots = r.maxHorses || 20;
                  const registeredCount = MOCK_RACE_REGISTRATIONS[r.raceId]?.length || 0;

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
                          <span className={`ars-slots__count ${registeredCount >= maxSlots ? "ars-slots__count--full" : ""}`}>
                            {registeredCount}/{maxSlots}
                          </span>
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
                value={`${MOCK_RACE_REGISTRATIONS[detail.raceId]?.length || 0}/${detail.maxHorses || 20}`}
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
