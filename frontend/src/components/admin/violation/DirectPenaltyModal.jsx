import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { tournamentService } from "../../../services/tournamentService";
import { raceService } from "../../../services/raceService";
import { raceDetailService } from "../../../services/raceDetailService";
import { violationService } from "../../../services/violationService";

const PREDEFINED_TYPES = [
  "Sử dụng chất cấm (Doping) trái phép",
  "Hành vi cản trở và gây nguy hiểm cho các ngựa khác trên đường đua",
  "Vi phạm nghiêm trọng quy định về trang thiết bị thi đấu",
  "Không tuân thủ hiệu lệnh của trọng tài",
  "Khác",
];

const PENALTY_OPTIONS = [
  { value: "WARNING", label: "Cảnh cáo", severity: "MINOR" },
  { value: "DQ", label: "Hủy bỏ kết quả của chặng", severity: "MAJOR" },
  { value: "BAN_FROM_TOURNAMENT", label: "Loại khỏi giải đấu", severity: "SEVERE" },
];

export default function DirectPenaltyModal({ isOpen, onClose, onSuccess }) {
  const [tournaments, setTournaments] = useState([]);
  const [races, setRaces] = useState([]);
  const [entries, setEntries] = useState([]);

  const [selectedTournament, setSelectedTournament] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [selectedEntry, setSelectedEntry] = useState("");

  const [violationType, setViolationType] = useState(PREDEFINED_TYPES[0]);
  const [customType, setCustomType] = useState("");
  const [selectedPenalty, setSelectedPenalty] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch Tournaments on mount
  useEffect(() => {
    if (isOpen) {
      resetState();
      loadTournaments();
    }
  }, [isOpen]);

  const loadTournaments = async () => {
    try {
      // Chỉ lấy giải đang diễn ra hoặc sắp diễn ra
      const list = await tournamentService.getTournamentsList();
      const activeTourneys = list.filter((t) => ["OPEN", "ONGOING"].includes(t.status));
      setTournaments(activeTourneys);
    } catch (err) {
      setError("Không thể tải danh sách giải đấu: " + err.message);
    }
  };

  // Fetch Races when Tournament changes
  useEffect(() => {
    if (selectedTournament) {
      loadRaces(selectedTournament);
    } else {
      setRaces([]);
      setSelectedRace("");
    }
  }, [selectedTournament]);

  const loadRaces = async (tournamentId) => {
    try {
      const list = await raceService.getRacesByTournament(tournamentId);
      // Chỉ cho phép xử phạt chặng chưa FINISHED (hoặc chưa công bố)
      const validRaces = list.filter((r) => r.status !== "FINISHED");
      setRaces(validRaces);
    } catch (err) {
      setError("Không thể tải danh sách chặng đua: " + err.message);
    }
  };

  // Fetch Entries when Race changes
  useEffect(() => {
    if (selectedRace) {
      loadEntries(selectedRace);
    } else {
      setEntries([]);
      setSelectedEntry("");
    }
  }, [selectedRace]);

  const loadEntries = async (raceId) => {
    try {
      const detail = await raceDetailService.getRaceDetail(raceId);
      const activeEntries = (detail?.entries || []).filter((e) => e.status !== "DQ" && e.status !== "REJECTED" && e.status !== "WITHDRAWN");
      setEntries(activeEntries);
    } catch (err) {
      setError("Không thể tải danh sách ngựa: " + err.message);
    }
  };

  const resetState = () => {
    setSelectedTournament("");
    setSelectedRace("");
    setSelectedEntry("");
    setViolationType(PREDEFINED_TYPES[0]);
    setCustomType("");
    setSelectedPenalty("");
    setNote("");
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedRace || !selectedEntry || !selectedPenalty) {
      setError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    const finalType = violationType === "Khác" ? customType : violationType;
    if (!finalType.trim()) {
      setError("Vui lòng nhập loại vi phạm.");
      return;
    }

    const penaltyInfo = PENALTY_OPTIONS.find((p) => p.value === selectedPenalty);

    setLoading(true);
    try {
      await violationService.directPenalty({
        raceId: selectedRace,
        entryId: selectedEntry,
        type: finalType,
        severity: penaltyInfo.severity,
        penalty: selectedPenalty,
        note,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-[var(--color-surface-2)] rounded-[var(--radius-xxl)] shadow-2xl border border-[var(--color-surface-4)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-surface-4)] flex items-center justify-between shrink-0 bg-[var(--color-surface-1)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <AlertTriangle size={20} strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-serif text-[var(--color-on-background)]">
              Ghi nhận & Xử phạt Vi Phạm
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-[var(--color-surface-3)] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-[var(--color-error)] text-sm flex items-start gap-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Giải đấu <span className="text-[var(--color-error)]">*</span></label>
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full bg-[var(--color-surface-1)] border border-[var(--color-surface-4)] text-[var(--color-on-background)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                <option value="" className="bg-slate-800 text-slate-100">-- Chọn giải đấu --</option>
                {tournaments.map((t) => (
                  <option key={t.id || t.tournamentId} value={t.id || t.tournamentId} className="bg-slate-800 text-slate-100">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Chặng đua <span className="text-[var(--color-error)]">*</span></label>
              <select
                value={selectedRace}
                onChange={(e) => setSelectedRace(e.target.value)}
                disabled={!selectedTournament}
                className="w-full bg-[var(--color-surface-1)] border border-[var(--color-surface-4)] text-[var(--color-on-background)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors disabled:opacity-50"
              >
                <option value="" className="bg-slate-800 text-slate-100">-- Chọn chặng đua --</option>
                {races.map((r) => (
                  <option key={r.id || r.raceId} value={r.id || r.raceId} className="bg-slate-800 text-slate-100">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Ngựa vi phạm <span className="text-[var(--color-error)]">*</span></label>
            <select
              value={selectedEntry}
              onChange={(e) => setSelectedEntry(e.target.value)}
              disabled={!selectedRace}
              className="w-full bg-[var(--color-surface-1)] border border-[var(--color-surface-4)] text-[var(--color-on-background)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors disabled:opacity-50"
            >
              <option value="" className="bg-slate-800 text-slate-100">-- Chọn ngựa --</option>
              {entries.map((e) => (
                <option key={e.entryId} value={e.entryId} className="bg-slate-800 text-slate-100">
                  Cổng {e.gate || e.entryId} - {e.horseName || e.horse?.name} (Jockey: {e.jockeyName || "Chưa có"})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4 pt-4 border-t border-[var(--color-surface-4)]">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Loại vi phạm <span className="text-[var(--color-error)]">*</span></label>
              <select
                value={violationType}
                onChange={(e) => setViolationType(e.target.value)}
                className="w-full bg-[var(--color-surface-1)] border border-[var(--color-surface-4)] text-[var(--color-on-background)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              >
                {PREDEFINED_TYPES.map((type) => (
                  <option key={type} value={type} className="bg-slate-800 text-slate-100">
                    {type}
                  </option>
                ))}
              </select>
              {violationType === "Khác" && (
                <input
                  type="text"
                  placeholder="Nhập loại vi phạm chi tiết..."
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="w-full mt-3 bg-[var(--color-surface-1)] border border-[var(--color-surface-4)] text-[var(--color-on-background)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Hình thức xử phạt <span className="text-[var(--color-error)]">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PENALTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedPenalty(opt.value)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      selectedPenalty === opt.value
                        ? opt.value === "WARNING"
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                          : "bg-red-500/20 border-red-500/50 text-red-400"
                        : "bg-[var(--color-surface-1)] border-[var(--color-surface-4)] text-slate-300 hover:border-[var(--color-surface-5)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Biên bản / Ghi chú xử phạt</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mô tả chi tiết biên bản xử phạt (tùy chọn)"
                rows={3}
                className="w-full bg-[var(--color-surface-1)] border border-[var(--color-surface-4)] text-[var(--color-on-background)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-surface-4)] flex items-center justify-end gap-3 shrink-0 bg-[var(--color-surface-1)]">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-[var(--color-surface-3)] rounded-xl transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 text-sm font-medium bg-[var(--color-error)] text-white rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Lưu & Áp dụng hình phạt"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
