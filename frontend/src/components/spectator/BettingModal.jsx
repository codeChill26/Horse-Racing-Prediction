/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { X, Coins, AlertCircle, CheckCircle2 } from "lucide-react";
import { bettingService } from "../../services/bettingService";
import { formatPoints } from "../../utils/formatter";
import { StatusBadge } from "../ui/Badges";
import "./BettingModal.css";

const BET_TYPES = [
  {
    code: "WIN",
    label: "WIN",
    description: "Chọn ngựa về nhất",
    icon: "🥇",
    color: "bet-type--gold",
  },
  {
    code: "PLACE",
    label: "PLACE",
    description: "Chọn ngựa vào Top 2",
    icon: "🥈",
    color: "bet-type--silver",
  },
  {
    code: "SHOW",
    label: "SHOW",
    description: "Chọn ngựa vào Top 3",
    icon: "🥉",
    color: "bet-type--bronze",
  },
];

const MIN_BET = 10;
const MAX_BET = 10000;
const QUICK_AMOUNTS = [100, 500, 1000, 5000];

// TODO: Replace mock odds with real API when backend endpoint is available.
// Backend chưa có API trả về odds cho từng ngựa + từng loại cược.
// Khi sẵn sàng, cần GET /api/races/:id/odds và truyền vào prop `odds`.
function buildMockOdds(horseGate) {
  // Tạo odds giả lập theo gate, ngựa số thấp thường có odds thấp hơn.
  const base = 1.8 + (horseGate % 4) * 0.4;
  return {
    WIN: Number((base + 0.5 + Math.random() * 0.3).toFixed(2)),
    PLACE: Number((base - 0.3 + Math.random() * 0.15).toFixed(2)),
    SHOW: Number((base - 0.6 + Math.random() * 0.1).toFixed(2)),
  };
}

// TODO: Replace mock analysis with real API when available.
const MOCK_ANALYSIS = [
  "Phong độ ổn định, thường bứt tốc tốt ở đoạn cuối.",
  "Xuất phát nhanh nhưng dễ giảm tốc ở chặng dài.",
  "Kỵ sĩ có tỷ lệ hoàn thành cao trong 5 trận gần nhất.",
  "Rủi ro trung bình do thành tích gần đây không ổn định.",
  "Đường đua ngắn phù hợp với thể lực của ngựa.",
  "Ngựa từng về nhì 3 lần liên tiếp trên cùng cự ly.",
];
function pickAnalysis(seed) {
  return MOCK_ANALYSIS[seed % MOCK_ANALYSIS.length];
}

/**
 * Modal đặt cược WIN/PLACE/SHOW.
 * Props:
 *  - race: object thông tin race
 *  - horses: array các ngựa tham gia
 *  - oddsMap: optional { [horseId]: { WIN, PLACE, SHOW } } - nếu không có sẽ dùng mock
 *  - userBalance: số PTS hiện có của user
 *  - onClose()
 *  - onPlaced(bet): callback sau khi đặt cược thành công
 */
export default function BettingModal({
  race,
  horses = [],
  oddsMap,
  userBalance = 0,
  onClose,
  onPlaced,
}) {
  const [selectedHorse, setSelectedHorse] = useState(null);
  const [betType, setBetType] = useState("WIN");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  const status = race?.status || race?.bettingStatus || "BETTING_OPEN";
  const isOpen = status === "BETTING_OPEN";

  // Reset on race change
  useEffect(() => {
    setSelectedHorse(null);
    setBetType("WIN");
    setAmount("");
    setError("");
    setSuccess(null);
  }, [race?.raceId ?? race?.id]);

  const odds = useMemo(() => {
    if (!selectedHorse) return 0;
    const id = selectedHorse.horseId ?? selectedHorse.id;
    return (
      oddsMap?.[id]?.[betType] ||
      buildMockOdds(selectedHorse.gate || 1)[betType]
    );
  }, [selectedHorse, betType, oddsMap]);

  const numericAmount = Number(amount) || 0;
  const potentialPayout =
    numericAmount > 0 && odds > 0 ? numericAmount * odds : 0;

  const amountError = useMemo(() => {
    if (!amount) return "";
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return "Số điểm phải là số dương";
    }
    if (numericAmount < MIN_BET) return `Tối thiểu ${MIN_BET.toLocaleString("vi-VN")} điểm`;
    if (numericAmount > MAX_BET) return `Tối đa ${MAX_BET.toLocaleString("vi-VN")} điểm`;
    if (numericAmount > userBalance) {
      return `Số dư không đủ (${formatPoints(userBalance)} điểm)`;
    }
    return "";
  }, [amount, numericAmount, userBalance]);

  const canSubmit =
    isOpen &&
    !submitting &&
    !success &&
    selectedHorse &&
    numericAmount >= MIN_BET &&
    numericAmount <= MAX_BET &&
    numericAmount <= userBalance &&
    !!betType;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHorse) {
      setError("Vui lòng chọn ngựa.");
      return;
    }
    if (amountError) {
      setError(amountError);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const bet = await bettingService.placeBet({
        raceId: race.raceId ?? race.id,
        horseId: selectedHorse.horseId ?? selectedHorse.id,
        amount: numericAmount,
      });
      setSuccess(bet);
      onPlaced?.(bet);
    } catch (err) {
      setError(err.message || "Đặt cược thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bet-modal-backdrop" onClick={onClose}>
      <div
        className="bet-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bet-modal__bar" />
        <header className="bet-modal__header">
          <div className="bet-modal__title-wrap">
            <Coins className="bet-modal__icon" size={18} />
            <div>
              <h2 className="bet-modal__title">Đặt cược PTS</h2>
              <p className="bet-modal__subtitle">{race?.name || race?.raceName}</p>
            </div>
          </div>
          <div className="bet-modal__header-right">
            <StatusBadge
              status={status}
              label={
                isOpen
                  ? "Đang mở cược"
                  : status === "BETTING_CLOSED"
                  ? "Đã đóng cược"
                  : status === "RACE_FINISHED"
                  ? "Đã kết thúc"
                  : status === "PAYOUT_COMPLETED"
                  ? "Đã trả thưởng"
                  : status === "CANCELLED"
                  ? "Đã hủy"
                  : status
              }
            />
            <button
              type="button"
              className="bet-modal__close"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="bet-modal__notice">
          <AlertCircle size={14} />
          <span>
            Tỷ lệ cược hiện tại chỉ là tỷ lệ dự kiến. Tỷ lệ cuối cùng sẽ được chốt
            khi phiên cược kết thúc và được dùng để tính trả thưởng.
          </span>
        </div>

        <form id="bet-form" className="bet-modal__body" onSubmit={handleSubmit}>
          {!isOpen && !success && (
            <div className="bet-modal__blocked">
              <AlertCircle size={16} />
              <span>
                Phiên cược hiện không mở. Bạn chỉ có thể xem thông tin, không thể đặt cược.
              </span>
            </div>
          )}

          {/* === Horse Selection === */}
          <section className="bet-section">
            <h3 className="bet-section__title">1. Chọn ngựa</h3>
            <div className="bet-horses">
              {horses.length === 0 ? (
                <div className="bet-empty">Chưa có ngựa nào trong chặng.</div>
              ) : (
                horses.map((h) => {
                  const id = h.horseId ?? h.id;
                  const isSelected = selectedHorse && (selectedHorse.horseId ?? selectedHorse.id) === id;
                  const hOdds = oddsMap?.[id] || buildMockOdds(h.gate || 1);
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={!isOpen || !!success}
                      className={`bet-horse ${isSelected ? "is-selected" : ""}`}
                      onClick={() => setSelectedHorse(h)}
                    >
                      <div className="bet-horse__gate">{h.gate ?? "?"}</div>
                      <div className="bet-horse__info">
                        <div className="bet-horse__name">{h.horseName || h.name}</div>
                        <div className="bet-horse__jockey">
                          Kỵ sĩ: {h.jockeyName || "—"}
                        </div>
                        <div className="bet-horse__analysis" title={pickAnalysis(h.gate ?? 1)}>
                          {pickAnalysis(h.gate ?? 1)}
                        </div>
                      </div>
                      <div className="bet-horse__odds">
                        <div className="bet-horse__odds-row">
                          <span>WIN</span>
                          <strong>{hOdds.WIN.toFixed(2)}</strong>
                        </div>
                        <div className="bet-horse__odds-row">
                          <span>PLACE</span>
                          <strong>{hOdds.PLACE.toFixed(2)}</strong>
                        </div>
                        <div className="bet-horse__odds-row">
                          <span>SHOW</span>
                          <strong>{hOdds.SHOW.toFixed(2)}</strong>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* === Bet Type === */}
          <section className="bet-section">
            <h3 className="bet-section__title">2. Chọn loại cược</h3>
            <div className="bet-types">
              {BET_TYPES.map((bt) => (
                <button
                  key={bt.code}
                  type="button"
                  disabled={!isOpen || !!success}
                  className={`bet-type ${bt.color} ${betType === bt.code ? "is-active" : ""}`}
                  onClick={() => setBetType(bt.code)}
                >
                  <div className="bet-type__icon">{bt.icon}</div>
                  <div className="bet-type__info">
                    <div className="bet-type__label">{bt.label}</div>
                    <div className="bet-type__desc">{bt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* === Amount === */}
          <section className="bet-section">
            <h3 className="bet-section__title">3. Nhập số điểm</h3>
            <div className="bet-amount">
              <input
                type="number"
                className="bet-amount__input"
                min={MIN_BET}
                max={MAX_BET}
                step={10}
                value={amount}
                disabled={!isOpen || !!success}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Tối thiểu ${MIN_BET} điểm`}
              />
              <div className="bet-amount__quick">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!isOpen || !!success}
                    onClick={() => setAmount(String(v))}
                    className="bet-amount__quick-btn"
                  >
                    {formatPoints(v)}
                  </button>
                ))}
              </div>
            </div>
            {amountError && <div className="bet-amount__error">{amountError}</div>}
          </section>

          {/* === Summary === */}
          {selectedHorse && (
            <section className="bet-summary">
              <div className="bet-summary__row">
                <span>Ngựa đã chọn</span>
                <strong>
                  #{selectedHorse.gate} {selectedHorse.horseName || selectedHorse.name}
                </strong>
              </div>
              <div className="bet-summary__row">
                <span>Loại cược</span>
                <strong>{betType}</strong>
              </div>
              <div className="bet-summary__row">
                <span>Tỷ lệ dự kiến</span>
                <strong>×{odds.toFixed(2)}</strong>
              </div>
              <div className="bet-summary__row bet-summary__row--total">
                <span>Thưởng ước tính</span>
                <strong>{formatPoints(potentialPayout)} điểm</strong>
              </div>
            </section>
          )}

          {error && (
            <div className="bet-alert bet-alert--error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bet-alert bet-alert--success">
              <CheckCircle2 size={14} />
              <span>Đặt cược thành công! Hệ thống đã ghi nhận giao dịch.</span>
            </div>
          )}
        </form>

        <footer className="bet-modal__footer">
          <button
            type="button"
            className="bet-btn bet-btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Đóng
          </button>
          {!success && (
            <button
              type="submit"
              form="bet-form"
              className="bet-btn bet-btn--primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? "Đang đặt…" : "Xác nhận đặt cược"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
