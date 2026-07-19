/**
 * AdminDeviationPage - Trang xử lý xung đột kết quả trọng tài
 * Route: /admin/discrepancies hoặc /admin/deviations
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { deviationRepository } from "../../repositories/deviationRepository";
import { useToast } from "../../hooks/useToast";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
  Eye,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import "./AdminDeviationPage.css";

const MATCH_STATUS_CONFIG = {
  CONFLICTED: { variant: "warn", label: "Xung đột", icon: AlertTriangle },
  RESOLVED: { variant: "ok", label: "Đã xử lý", icon: CheckCircle2 },
  AUTO_MATCHED: { variant: "ok", label: "Khớp tự động", icon: CheckCircle2 },
  PENDING: { variant: "info", label: "Chờ xử lý", icon: AlertCircle },
};

function LoadingSkeleton() {
  return (
    <div className="adp-skeleton">
      {[1, 2, 3].map((i) => (
        <div key={i} className="adp-skeleton__row">
          <Skeleton width="30%" height="20px" />
          <Skeleton width="15%" height="20px" />
          <Skeleton width="20%" height="20px" />
          <Skeleton width="15%" height="20px" />
          <Skeleton width="100px" height="36px" borderRadius="8px" />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// DEVIATION TABLE — hiển thị đầy đủ thông tin từ database
// ============================================================
function DeviationTable({ deviations, loading, onView, onResolve }) {
  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  if (loading) return <LoadingSkeleton />;

  if (!deviations || deviations.length === 0) {
    return (
      <div className="adp-empty">
        <CheckCircle2 size={56} className="adp-empty__icon" />
        <h3>Không có dữ liệu</h3>
        <p>Không có xung đột nào trong danh mục này.</p>
      </div>
    );
  }

  return (
    <div className="adp-table-wrap">
      <table className="adp-table">
        <thead>
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th>Chặng đua</th>
            <th>Trạng thái kết quả</th>
            <th>Trọng tài A</th>
            <th>Trọng tài B</th>
            <th>Lý do phân xử</th>
            <th>Ngày tạo</th>
            <th>Cập nhật</th>
            <th style={{ width: 120 }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {deviations.map((dev, idx) => {
            const config = MATCH_STATUS_CONFIG[dev.matchStatus] || {
              variant: "muted", label: dev.matchStatus || "—", icon: AlertCircle,
            };
            const StatusIcon = config.icon;
            return (
              <tr key={dev.id || dev.officialResultId}>
                <td className="adp-idx-cell">{idx + 1}</td>
                <td>
                  <div className="adp-race-cell">
                    <span className="adp-race-cell__id">Race #{dev.raceId}</span>
                    <span className="adp-race-cell__name">{dev.raceName || "—"}</span>
                  </div>
                </td>
                <td>
                  <span className={`adp-status-badge adp-status-badge--${config.variant}`}>
                    <StatusIcon size={13} />
                    {config.label}
                  </span>
                </td>
                <td className="adp-referee-name">
                  {dev.reporterA?.fullName || dev.race?.refereeA?.fullName || <span className="adp-muted">—</span>}
                </td>
                <td className="adp-referee-name">
                  {dev.reporterB?.fullName || dev.race?.refereeB?.fullName || <span className="adp-muted">—</span>}
                </td>
                <td className="adp-reason-cell">
                  {dev.resolveReason
                    ? <span className="adp-reason-text" title={dev.resolveReason}>{dev.resolveReason}</span>
                    : <span className="adp-muted">—</span>
                  }
                </td>
                <td className="adp-date-cell">{formatDate(dev.createdAt)}</td>
                <td className="adp-date-cell">{formatDate(dev.updatedAt)}</td>
                <td>
                  <div className="adp-actions">
                    <button
                      className="adp-btn adp-btn--outline"
                      onClick={() => onView(dev)}
                      title="Xem chi tiết"
                    >
                      <Eye size={14} />
                      Xem
                    </button>
                    {dev.matchStatus === "CONFLICTED" && (
                      <button
                        className="adp-btn adp-btn--primary"
                        onClick={() => onResolve(dev)}
                        title="Phân xử xung đột"
                      >
                        <FileText size={14} />
                        Xử lý
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
  );
}

const RESULT_STATUS_OPTIONS = [
  { value: "", label: "Chọn trạng thái..." },
  { value: "FINISHED", label: "FINISHED - Về đích" },
  { value: "DNF", label: "DNF - Did Not Finish" },
  { value: "DQ", label: "DQ - Disqualified" },
];

// ============================================================
// REFEREE SUBMISSION TABLE
// ============================================================
function RefereeSubmissionTable({ submission, entries, label }) {
  if (!submission) {
    return (
      <div className="ref-sub-table ref-sub-table--empty">
        <div className="ref-sub-table__empty">Chưa có dữ liệu nộp</div>
      </div>
    );
  }

  // Build entries từ submissions rawResults khi entries prop rỗng
  const getEntries = () => {
    if (entries?.length) return entries;
    // Build từ rawResults
    const allEntries = new Map();
    (submission.rawResults || []).forEach(r => {
      if (r.entryId && !allEntries.has(r.entryId)) {
        allEntries.set(r.entryId, {
          entryId: r.entryId,
          horseId: r.horseId || null,
          horseName: r.horseName || `Entry #${r.entryId}`,
          jockeyName: r.jockeyName || null,
        });
      }
    });
    return Array.from(allEntries.values());
  };

  const tableEntries = getEntries();

  // Build result map từ parsedResults (đã parse ở repository)
  const resultMap = submission.parsedResults || {};
  // Hoặc parse trực tiếp từ rawResults nếu chưa có parsedResults
  const parseFromRaw = (rawResults) => {
    if (!Array.isArray(rawResults)) return {};
    const map = {};
    rawResults.forEach(r => {
      map[r.entryId] = {
        rank: r.rank || null,
        status: r.status || (r.isDq ? 'DQ' : r.isDnf ? 'DNF' : null),
      };
    });
    return map;
  };
  const fallbackMap = parseFromRaw(submission.rawResults);
  const finalMap = Object.keys(resultMap).length > 0 ? resultMap : fallbackMap;

  // Nếu vẫn không có entries, hiển thị thông báo
  if (tableEntries.length === 0) {
    return (
      <div className="ref-sub-table ref-sub-table--empty">
        <div className="ref-sub-table__empty">Không có dữ liệu entry</div>
      </div>
    );
  }

  return (
    <div className="ref-sub-table">
      <div className="ref-sub-table__header">
        <span className="ref-sub-table__badge">{label}</span>
        <span className="ref-sub-table__name">{submission.submittedByName || "—"}</span>
        {submission.submittedAt && (
          <span className="ref-sub-table__time">
            {new Date(submission.submittedAt).toLocaleString("vi-VN")}
          </span>
        )}
      </div>
      <table className="ref-sub-table__table">
        <thead>
          <tr>
            <th>Entry</th>
            <th>Ngựa</th>
            <th>Kỵ sĩ</th>
            <th>Hạng</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {tableEntries.map(entry => {
            const result = finalMap[entry.entryId] || {};
            return (
              <tr key={entry.entryId}>
                <td className="ref-sub-table__gate">#{entry.entryId}</td>
                <td>
                  <div className="ref-sub-table__horse">
                    <strong>{entry.horseName}</strong>
                    {entry.horseId && <span className="ref-sub-table__horse-id">#{entry.horseId}</span>}
                  </div>
                </td>
                <td className="ref-sub-table__jockey">{entry.jockeyName || "—"}</td>
                <td className="ref-sub-table__rank">
                  {result.rank ? `#${result.rank}` : "—"}
                </td>
                <td>
                  {result.status && (
                    <span className={`ref-sub-table__status ref-sub-table__status--${(result.status || '').toLowerCase()}`}>
                      {result.status}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// CUSTOM RESULT ENTRY FORM (Referee-style)
// ============================================================
function CustomResultForm({ entries, results, onChange, errors }) {
  const handleStatusChange = (index, status) => {
    const newResults = [...results];
    newResults[index] = {
      ...newResults[index],
      status,
      rank: status === "FINISHED" ? (newResults[index].rank || getNextRank(results)) : "",
    };
    onChange(newResults);
  };

  const handleRankChange = (index, rank) => {
    const newResults = [...results];
    const val = rank === "" ? "" : Math.max(1, parseInt(rank, 10) || 1);
    newResults[index] = { ...newResults[index], rank: val };
    onChange(newResults);
  };

  const getNextRank = (resultsList) => {
    const finishedRanks = resultsList
      .filter(r => r.status === "FINISHED" && r.rank)
      .map(r => r.rank);
    if (finishedRanks.length === 0) return 1;
    return Math.max(...finishedRanks) + 1;
  };

  const finishedCount = results.filter(r => r.status === "FINISHED").length;

  return (
    <div className="custom-result-form">
      <div className="custom-result-form__header">
        <h4>Nhập kết quả chính thức</h4>
        <p>Điền thứ hạng và trạng thái cho từng ngựa (giống như khi trọng tài nhập kết quả)</p>
      </div>
      <div className="custom-result-form__table">
        <div className="custom-result-form__table-header">
          <span>Entry</span>
          <span>Ngựa</span>
          <span>Kỵ sĩ</span>
          <span>Hạng</span>
          <span>Trạng thái</span>
        </div>
        <div className="custom-result-form__table-body">
          {entries.map((entry, index) => {
            const rowError = errors?.[index];
            const currentResult = results[index] || {};
            return (
              <div key={entry.entryId} className={`custom-result-form__row${rowError ? " custom-result-form__row--error" : ""}`}>
                <div className="custom-result-form__gate">#{entry.entryId}</div>
                <div className="custom-result-form__horse">
                  <strong>{entry.horseName}</strong>
                  {entry.horseId && <span className="custom-result-form__horse-id">#{entry.horseId}</span>}
                </div>
                <div className="custom-result-form__jockey">{entry.jockeyName || "—"}</div>
                <div className="custom-result-form__rank">
                  <select
                    value={currentResult.rank || ""}
                    onChange={(e) => handleRankChange(index, e.target.value)}
                    disabled={currentResult.status !== "FINISHED"}
                    aria-label={`Hạng ngựa ${entry.horseName}`}
                  >
                    <option value="">—</option>
                    {finishedCount > 0 &&
                      Array.from({ length: finishedCount }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))
                    }
                  </select>
                </div>
                <div className="custom-result-form__status">
                  <select
                    value={currentResult.status || ""}
                    onChange={(e) => handleStatusChange(index, e.target.value)}
                    aria-label={`Trạng thái ngựa ${entry.horseName}`}
                  >
                    {RESULT_STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {rowError && <span className="custom-result-form__error">{rowError}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="custom-result-form__hint">
        <span>Chọn FINISHED cho ngựa về đích và nhập hạng tương ứng. DNF = không về đích, DQ = bị loại.</span>
      </div>
    </div>
  );
}

// ============================================================
// CONFLICT DETAIL MODAL
// ============================================================
function ConflictDetailModal({ isOpen, onClose, deviation, onSubmit, submitting }) {
  const [selectedSource, setSelectedSource] = useState("A");
  const [useCustomResults, setUseCustomResults] = useState(false);
  const [customResults, setCustomResults] = useState([]);
  const [customErrors, setCustomErrors] = useState({});
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  // Reset state when deviation changes
  useEffect(() => {
    if (deviation?.entries) {
      const initial = deviation.entries.map(entry => ({
        entryId: entry.entryId,
        horseName: entry.horseName,
        horseId: entry.horseId,
        jockeyName: entry.jockeyName,
        rank: "",
        status: "",
      }));
      setCustomResults(initial);
    } else if (deviation?.race?.refereeSubmissions) {
      // Fallback: Build entries từ submissions rawResults khi race.entries rỗng
      const allEntries = new Map();
      deviation.race.refereeSubmissions.forEach(sub => {
        (sub.rawResults || []).forEach(r => {
          if (r.entryId && !allEntries.has(r.entryId)) {
            allEntries.set(r.entryId, {
              entryId: r.entryId,
              horseName: `Entry #${r.entryId}`,
              horseId: null,
              jockeyName: null,
            });
          }
        });
      });
      if (allEntries.size > 0) {
        const initial = Array.from(allEntries.values()).map(e => ({
          ...e,
          rank: "",
          status: "",
        }));
        setCustomResults(initial);
      }
    }
    setSelectedSource("A");
    setUseCustomResults(false);
    setCustomErrors({});
    setReason("");
    setError("");
  }, [deviation?.id, deviation?.entries]);

  if (!isOpen || !deviation) return null;

  const submissionA = deviation.race?.refereeSubmissions?.[0];
  const submissionB = deviation.race?.refereeSubmissions?.[1];
  // Build entries từ submissions khi race.entries rỗng
  const buildEntriesFromSubmissions = () => {
    if (!deviation?.race?.refereeSubmissions) return [];
    const allEntries = new Map();
    deviation.race.refereeSubmissions.forEach(sub => {
      (sub.rawResults || []).forEach(r => {
        if (r.entryId && !allEntries.has(r.entryId)) {
          allEntries.set(r.entryId, {
            entryId: r.entryId,
            horseId: r.horseId || null,
            horseName: r.horseName || `Entry #${r.entryId}`,
            jockeyName: r.jockeyName || null,
          });
        }
      });
    });
    return Array.from(allEntries.values());
  };

  // Ưu tiên entries ở root level, fallback về race.entries, cuối cùng build từ submissions
  const entries = deviation.entries?.length
    ? deviation.entries
    : deviation.race?.entries?.length
      ? deviation.race.entries
      : buildEntriesFromSubmissions();

  // DEBUG: Log deviation structure
  console.log('[Modal] deviation:', JSON.stringify(deviation, null, 2));
  console.log('[Modal] deviation.entries:', deviation?.entries);
  console.log('[Modal] deviation.race?.entries:', deviation?.race?.entries);
  console.log('[Modal] resolved entries:', entries);
  console.log('[Modal] submissionA:', submissionA);
  console.log('[Modal] submissionB:', submissionB);

  const handleSourceChange = (source) => {
    setSelectedSource(source);
    setUseCustomResults(false);
    setCustomErrors({});
  };

  const handleUseCustom = () => {
    setUseCustomResults(true);
    setSelectedSource("CUSTOM");
    setCustomErrors({});
  };

  const validateCustomResults = () => {
    const newErrors = {};

    customResults.forEach((result, index) => {
      if (!result.status) {
        newErrors[index] = "Phải chọn trạng thái";
      } else if (result.status === "FINISHED") {
        if (!result.rank || result.rank < 1) {
          newErrors[index] = "Phải nhập thứ hạng";
        }
      }
    });

    // Check duplicate ranks
    const finishedResults = customResults.filter(r => r.status === "FINISHED" && r.rank);
    const ranks = finishedResults.map(r => r.rank);
    const uniqueRanks = new Set(ranks);
    if (ranks.length !== uniqueRanks.size) {
      finishedResults.forEach(result => {
        const globalIdx = customResults.findIndex(r => r.entryId === result.entryId);
        if (globalIdx !== -1) {
          newErrors[globalIdx] = newErrors[globalIdx] || "Thứ hạng trùng lặp";
        }
      });
    }

    setCustomErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!reason.trim()) {
      setError("Lý do xử lý là bắt buộc");
      return;
    }

    if (reason.trim().length < 10) {
      setError("Lý do phải có ít nhất 10 ký tự");
      return;
    }

    let finalResults;

    if (useCustomResults) {
      if (!validateCustomResults()) {
        setError("Vui lòng kiểm tra lại kết quả nhập");
        return;
      }
      finalResults = customResults.map(r => ({
        entryId: r.entryId,
        rank: r.rank ? Number(r.rank) : null,
        status: r.status,
        isDnf: r.status === "DNF",
        isDq: r.status === "DQ",
      }));
    } else {
      finalResults = selectedSource === "A" ? submissionA?.rawResults : submissionB?.rawResults;
    }

    if (!finalResults || finalResults.length === 0) {
      setError("Không có kết quả để phân xử");
      return;
    }

    try {
      await onSubmit({ finalResults, reason: reason.trim() });
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content adp-modal adp-modal--xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-header__label">Chi tiết xung đột</span>
            <h3>{deviation.raceName}</h3>
            <span className="modal-header__id">Race #{deviation.raceId}</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="adp-conflict-alert">
            <AlertTriangle size={20} />
            <div>
              <strong>Phát hiện xung đột kết quả!</strong>
              <p>Hai trọng tài đưa ra kết quả khác nhau. Admin cần phân xử để chốt kết quả chính thức.</p>
            </div>
          </div>

          {/* Referee Submissions Comparison */}
          <div className="adp-submissions-grid">
            <div className="adp-submissions-grid__col">
              <RefereeSubmissionTable
                submission={submissionA}
                entries={entries}
                label="A"
              />
              <label className={`adp-source-select ${selectedSource === "A" && !useCustomResults ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="source"
                  value="A"
                  checked={selectedSource === "A" && !useCustomResults}
                  onChange={() => handleSourceChange("A")}
                  disabled={submitting}
                />
                <span>Chọn kết quả Trọng tài A</span>
              </label>
            </div>

            <div className="adp-submissions-grid__vs">VS</div>

            <div className="adp-submissions-grid__col">
              <RefereeSubmissionTable
                submission={submissionB}
                entries={entries}
                label="B"
              />
              <label className={`adp-source-select ${selectedSource === "B" && !useCustomResults ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="source"
                  value="B"
                  checked={selectedSource === "B" && !useCustomResults}
                  onChange={() => handleSourceChange("B")}
                  disabled={submitting}
                />
                <span>Chọn kết quả Trọng tài B</span>
              </label>
            </div>
          </div>

          {/* Custom Result Entry */}
          <div className="adp-custom-section">
            <label className={`adp-custom-toggle ${useCustomResults ? "active" : ""}`}>
              <input
                type="checkbox"
                checked={useCustomResults}
                onChange={() => handleUseCustom()}
                disabled={submitting}
              />
              <span className="adp-custom-toggle__label">
                <strong>Nhập kết quả mới</strong>
                <small>Dành cho trường hợp Admin không đồng ý với kết quả của cả 2 trọng tài</small>
              </span>
            </label>

            {useCustomResults && (
              <CustomResultForm
                entries={entries}
                results={customResults}
                onChange={setCustomResults}
                errors={customErrors}
              />
            )}
          </div>

          {/* Reason & Submit */}
          <form className="adp-resolve-form" onSubmit={handleSubmit}>
            <div className="adp-form-group">
              <label htmlFor="resolve-reason">
                Lý do phân xử <span className="required">*</span>
              </label>
              <textarea
                id="resolve-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do Admin phân xử (ít nhất 10 ký tự)..."
                rows={3}
                disabled={submitting}
              />
              <span className="adp-form-hint">Lý do sẽ được ghi lại trong lịch sử phân xử</span>
            </div>

            {error && (
              <div className="adp-error" role="alert">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="modal-btn modal-btn--cancel"
                onClick={onClose}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="modal-btn modal-btn--primary"
                disabled={submitting}
              >
                {submitting ? "Đang xử lý..." : "Xác nhận phân xử"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TABS CONFIG
// ============================================================
const TABS = [
  { key: "all",          label: "Tất cả",        filter: null },
  { key: "conflicted",   label: "Chờ phân xử", filter: ["CONFLICTED", "PENDING"] },
  { key: "auto_matched", label: "Khớp tự động",   filter: ["AUTO_MATCHED"] },
  { key: "resolved",     label: "Đã xử lý",       filter: ["RESOLVED"] },
];

export default function AdminDeviationPage() {
  const toast = useToast();
  const [deviations, setDeviations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDeviation, setSelectedDeviation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadDeviations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await deviationRepository.getAll({});
      setDeviations(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e.message || "Không tải được danh sách xung đột";
      setError(msg);
      toast?.error?.(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadDeviations(); }, [loadDeviations]);

  const handleView = async (dev) => {
    try {
      const devId = dev.id || dev.officialResultId;
      const detail = await deviationRepository.getById(devId);
      setSelectedDeviation(detail);
      setShowModal(true);
    } catch (e) {
      toast?.error?.(e.message || "Không tải được chi tiết");
    }
  };

  const handleResolve = async (dev) => {
    try {
      const devId = dev.id || dev.officialResultId;
      const detail = await deviationRepository.getById(devId);
      setSelectedDeviation(detail);
      setShowModal(true);
    } catch (e) {
      toast?.error?.(e.message || "Không tải được chi tiết");
    }
  };

  const handleSubmitResolve = async (payload) => {
    if (!selectedDeviation) return;
    setSubmitting(true);
    try {
      await deviationRepository.resolveDeviation(
        selectedDeviation.id || selectedDeviation.officialResultId,
        payload
      );
      toast?.success?.("Đã phân xử thành công! Race đã kết thúc và chuyển sang FINISHED.");
      setShowModal(false);
      setSelectedDeviation(null);
      loadDeviations();
    } catch (err) {
      toast?.error?.(err.message || "Có lỗi xảy ra khi phân xử");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDeviation(null);
    setSubmitting(false);
  };

  // Stats
  const stats = useMemo(() => {
    const conflicted = deviations.filter((d) => ["CONFLICTED", "PENDING"].includes(d.matchStatus)).length;
    const resolved   = deviations.filter((d) => d.matchStatus === "RESOLVED").length;
    const autoMatch  = deviations.filter((d) => d.matchStatus === "AUTO_MATCHED").length;
    return { total: deviations.length, conflicted, resolved, autoMatched: autoMatch };
  }, [deviations]);

  // Filtered data per tab
  const tabData = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab || !tab.filter) return deviations;
    return deviations.filter((d) => tab.filter.includes(d.matchStatus));
  }, [deviations, activeTab]);

  // Tab count badge
  const tabCount = (filterArr) => {
    if (!filterArr) return deviations.length;
    return deviations.filter((d) => filterArr.includes(d.matchStatus)).length;
  };

  return (
    <div className="adp-page">
      {/* Header */}
      <header className="adp-page__header">
        <div>
          <h1 className="adp-page__title">Xử lý xung đột kết quả</h1>
          <p className="adp-page__desc">Theo dõi và phân xử các xung đột kết quả giữa 2 trọ ng tài</p>
        </div>
        <button
          className="adp-btn adp-btn--refresh"
          onClick={loadDeviations}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Làm mới
        </button>
      </header>

      {/* Stats */}
      <div className="adp-stats">
        <div className="adp-stat">
          <div className="adp-stat__value">{stats.total}</div>
          <div className="adp-stat__label">Tổng cộng</div>
        </div>
        <div className="adp-stat">
          <div className="adp-stat__value adp-stat__value--warn">{stats.conflicted}</div>
          <div className="adp-stat__label">Chờ phân xử</div>
        </div>
        <div className="adp-stat">
          <div className="adp-stat__value adp-stat__value--ok">{stats.resolved}</div>
          <div className="adp-stat__label">Đã xử lý (Admin)</div>
        </div>
        <div className="adp-stat">
          <div className="adp-stat__value adp-stat__value--ok">{stats.autoMatched}</div>
          <div className="adp-stat__label">Khớp tự động</div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="adp-alert adp-alert--error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="adp-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`adp-tab ${activeTab === tab.key ? "adp-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="adp-tab__count">{tabCount(tab.filter)}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="adp-content">
        <DeviationTable
          deviations={tabData}
          loading={loading}
          onView={handleView}
          onResolve={handleResolve}
        />
      </div>

      {/* Modal */}
      <ConflictDetailModal
        isOpen={showModal}
        onClose={handleCloseModal}
        deviation={selectedDeviation}
        onSubmit={handleSubmitResolve}
        submitting={submitting}
      />
    </div>
  );
}
