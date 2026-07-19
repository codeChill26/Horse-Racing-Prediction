import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Coins, AlertCircle, CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import { bettingService } from '../../services/bettingService'
import { formatPoints } from '../../utils/formatter'
import { showToast } from '../../hooks/showToast'
import { StatusBadge } from '../ui/Badges'
import './BettingModal.css'

const BET_TYPES = [
  // FIX BUG-7.13: thêm `multiplier` cho QUINELLA/EXACTA để khớp settlement spec
  // ở mainflow.md FLOW 8 (payout = betAmount * lockedOdds * multiplier).
  // WIN/PLACE/SHOW = ×1 (multiplier implicit). MinBet = 10 ở service.
  { code: 'WIN',      label: 'WIN',      description: 'Ngựa về nhất',                     icon: '🥇', color: 'bet-type--gold',   picks: 1, multiplier: 1.0 },
  { code: 'PLACE',    label: 'PLACE',    description: 'Ngựa vào Top 2',                   icon: '🥈', color: 'bet-type--silver', picks: 1, multiplier: 0.7 },
  { code: 'SHOW',     label: 'SHOW',     description: 'Ngựa vào Top 3',                   icon: '🥉', color: 'bet-type--bronze', picks: 1, multiplier: 0.5 },
  { code: 'QUINELLA', label: 'QUINELLA', description: '2 ngựa nhất+nhì (bất kỳ thứ tự)', icon: '🔁', color: 'bet-type--teal',   picks: 2, multiplier: 1.5 },
  { code: 'EXACTA',   label: 'EXACTA',   description: 'Chỉ định chính xác nhất+nhì',     icon: '🎯', color: 'bet-type--purple', picks: 2, multiplier: 2.0 },
]

const MIN_BET = 10
const QUICK_AMOUNTS = [100, 500, 1000, 5000]
// Khớp AI_PREDICTION_COST ở backend/src/services/predictions.js — chỉ để hiện giá
// trước cho user biết, số tiền thật trừ luôn do backend quyết định.
const AI_PREDICTION_COST = 15

// Những status mà modal vẫn cho phép đặt cược. Theo spec, chỉ SCHEDULED.
// Tuy nhiên, BE đôi khi trả BETTING_OPEN — cũng chấp nhận để tránh false negative.
const BETTABLE_STATUSES = new Set(['SCHEDULED', 'BETTING_OPEN', 'REGISTRATION_OPEN', 'UPCOMING'])

/**
 * Modal đặt cược — hỗ trợ WIN / PLACE / SHOW / QUINELLA / EXACTA.
 *
 * Props:
 *  - race          : object thông tin race (từ API)
 *  - entries       : array từ GET /api/races/:id/detail
 *                    [ { entryId, horse: {horseId, name, imageUrl, careerStats},
 *                        jockey: {userId, fullName, careerStats}, pairCareerStats, oddsFinal } ]
 *  - userBalance   : số PTS hiện có
 *  - onClose()
 *  - onPlaced(prediction) : callback sau khi đặt cược thành công
 */
export default function BettingModal({
  race,
  entries = [],
  userBalance = 0,
  walletFrozen = false,
  onRefreshBalance,
  onClose,
  onPlaced,
}) {
  const [betType, setBetType]       = useState('WIN')
  const [pick1, setPick1]           = useState(null)   // entry object (first pick)
  const [pick2, setPick2]           = useState(null)   // entry object (second pick, QUINELLA/EXACTA only)
  const [amount, setAmount]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]       = useState(null)
  const [error, setError]           = useState('')
  // FIX BUG-7.05: lưu entries trong state để patch khi nhận `odds:updated` từ socket.
  // Snapshot ban đầu từ props `entries`.
  const [liveEntries, setLiveEntries] = useState(entries || [])
  const [raceStatus, setRaceStatus]   = useState(race?.status)
  // FIX BUG-7.06: dùng state (không ref) vì phải đọc lúc render trong `canSubmit`.
  // Initial false; flip thành true khi entry:status_changed có raceStatus mới
  // không thuộc BETTABLE_STATUSES (race đã start).
  const [raceChangedDuringOpen, setRaceChangedDuringOpen] = useState(false)
  const closeRef = useRef(null)

  // Gợi ý % thắng AI (tính năng trả điểm) — map horseId -> winProbability.
  // Không cache giữa các lần mở modal; mỗi lần bấm "Xem gợi ý AI" đều gọi lại API
  // và bị trừ điểm mới (theo đúng thiết kế: không mua 1 lần dùng mãi).
  const [aiPredictions, setAiPredictions] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const handleViewAiPrediction = async () => {
    if (!race?.raceId) return
    setAiLoading(true)
    setAiError('')
    try {
      const data = await bettingService.viewAiPrediction(race.raceId)
      const map = {}
      for (const p of data.predictions || []) {
        map[p.horseId] = p.winProbability
      }
      setAiPredictions(map)
      onRefreshBalance?.()
      showToast.success(
        `Đã trừ ${data.pointsCharged} điểm. Số dư còn ${formatPoints(data.walletBalance)} PTS.`,
        'Gợi ý AI'
      )
    } catch (err) {
      setAiError(err.message || 'Không xem được gợi ý AI')
    } finally {
      setAiLoading(false)
    }
  }

  // Đồng bộ entries prop → state khi parent truyền entries mới (race detail load)
  useEffect(() => {
    setLiveEntries(Array.isArray(entries) ? entries : [])
  }, [entries, race?.raceId])

  // Update raceStatus when race prop changes
  useEffect(() => {
    setRaceStatus(race?.status)
    setRaceChangedDuringOpen(false)
  }, [race?.raceId, race?.status])

  const betTypeDef = BET_TYPES.find(b => b.code === betType)
  const isDual     = betTypeDef?.picks === 2
  // FIX BUG-7.06: kiểm tra status thông qua set allowlist thay vì chỉ SCHEDULED.
  const isOpen     = BETTABLE_STATUSES.has(String(raceStatus || '').toUpperCase())

  // FIX BUG-7.14: ref để ESC listener không re-attach mỗi render (parent
  // truyền arrow function mới). Cập nhật ref qua effect để không mutate lúc render.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // A11y: focus close button khi modal mount; ESC để đóng (khi không submit).
  useEffect(() => {
    if (closeRef.current) closeRef.current.focus()
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting && !success) onCloseRef.current?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [submitting, success])

  // Reset picks when switching between single/dual mode
  useEffect(() => {
    setPick1(null)
    setPick2(null)
    setError('')
  }, [betType])

  // Reset all on race change
  useEffect(() => {
    setBetType('WIN')
    setPick1(null)
    setPick2(null)
    setAmount('')
    setError('')
    setSuccess(null)
  }, [race?.raceId])

  // Handle entry card click
  function handleEntryClick(entry) {
    if (!isOpen || success) return
    // FIX BUG-7.06: nếu race đã thay đổi status → block selection.
    if (raceChangedDuringOpen) {
      setError('Cuộc đua vừa chuyển trạng thái — không thể chọn ngựa.')
      return
    }
    if (!isDual) {
      setPick1(entry)
      return
    }
    // Dual mode logic
    const id = entry.entryId
    if (pick1?.entryId === id) {
      setPick1(pick2)
      setPick2(null)
      return
    }
    if (pick2?.entryId === id) {
      setPick2(null)
      return
    }
    if (!pick1) { setPick1(entry); return }
    if (!pick2) { setPick2(entry); return }
    // Both already picked — replace pick1, shift old pick1 to nowhere (reset both)
    setPick1(entry)
    setPick2(null)
  }

  // Compute lockedOdds preview
  const lockedOddsPreview = useMemo(() => {
    if (!pick1) return null
    const o1 = Number(pick1.oddsFinal ?? 0)
    if (!isDual) return o1
    if (!pick2) return null
    const o2 = Number(pick2.oddsFinal ?? 0)
    return Math.round(((o1 + o2) / 2) * 100) / 100
  }, [pick1, pick2, isDual])

  // FIX BUG-7.13: multiplier cho QUINELLA/EXACTA (settlement spec). WIN/PLACE/SHOW = 1.
  const betMultiplier = betTypeDef?.multiplier ?? 1.0

  const numericAmount  = Number(amount) || 0
  const maxAllowed     = Math.floor(userBalance * 0.5)
  // FIX BUG-7.13: potential payout = numericAmount * lockedOdds * multiplier
  // khớp với settlement engine ở FLOW 8.
  const potentialPayout = lockedOddsPreview && numericAmount > 0 && isOpen
    ? Math.floor(numericAmount * lockedOddsPreview * betMultiplier)
    : 0

  const amountError = useMemo(() => {
    if (!amount) return ''
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 'Số điểm phải là số dương'
    if (numericAmount < MIN_BET) return `Tối thiểu ${MIN_BET.toLocaleString('vi-VN')} điểm`
    if (numericAmount > maxAllowed) return `Tối đa 50% số dư (${formatPoints(maxAllowed)} điểm)`
    return ''
  }, [amount, numericAmount, maxAllowed])

  const picksReady = isDual ? (pick1 && pick2 && pick1.entryId !== pick2.entryId) : !!pick1
  // FIX BUG-7.06: thêm kiểm tra raceChangedDuringOpen. Service chỉ check
  // race.status === 'SCHEDULED' qua BE; FE cũng phải ngăn submit.
  const canSubmit  = isOpen && !submitting && !success && !walletFrozen && picksReady &&
                     numericAmount >= MIN_BET && numericAmount <= maxAllowed && !amountError &&
                     !raceChangedDuringOpen && lockedOddsPreview > 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (walletFrozen) {
      setError('Ví của bạn đang bị đóng băng — không thể đặt cược.')
      return
    }
    // FIX BUG-7.06: nếu race đã đổi status (start) trong lúc modal mở → block submit.
    if (raceChangedDuringOpen) {
      setError('Cuộc đua vừa chuyển trạng thái — không thể đặt cược nữa.')
      return
    }
    if (!picksReady) { setError(isDual ? 'Vui lòng chọn đủ 2 ngựa khác nhau.' : 'Vui lòng chọn ngựa.'); return }
    if (amountError)  { setError(amountError); return }
    setError('')
    setSubmitting(true)

    // G7: refresh balance ngay trước khi submit để chắc chắn maxAllowed đúng
    let effectiveBalance = userBalance
    if (typeof onRefreshBalance === 'function') {
      try {
        const fresh = await onRefreshBalance()
        if (Number.isFinite(fresh)) {
          effectiveBalance = fresh
          // Validate lại sau khi refresh
          const newMax = Math.floor(fresh * 0.5)
          if (numericAmount > newMax) {
            setError(`Số dư vừa thay đổi. Tối đa hiện tại là ${formatPoints(newMax)} điểm.`)
            setSubmitting(false)
            return
          }
        }
      } catch {
        // Không block submit nếu refresh fail — service sẽ validate
      }
    }

    try {
      const entryIds = isDual ? [pick1.entryId, pick2.entryId] : [pick1.entryId]
      const prediction = await bettingService.placeBet({
        raceId:        race.raceId,
        betType,
        entryIds,
        betAmount:     numericAmount,
        walletBalance: effectiveBalance,
      })
      setSuccess(prediction)
      onPlaced?.(prediction)
      showToast.success(
        `Đặt cược thành công ${formatPoints(numericAmount)} PTS — odds khoá ×${Number(prediction?.lockedOdds ?? 0).toFixed(2)}.`,
        'Đặt cược'
      )
    } catch (err) {
      setError(err.message || 'Đặt cược thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bet-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="bet-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bet-modal-title"
        aria-describedby="bet-modal-subtitle"
        onClick={e => e.stopPropagation()}
      >
        <div className="bet-modal__bar" />

        {/* Header */}
        <header className="bet-modal__header">
          <div className="bet-modal__title-wrap">
            <Coins className="bet-modal__icon" size={18} />
            <div>
              <h2 id="bet-modal-title" className="bet-modal__title">Đặt cược PTS</h2>
              <p id="bet-modal-subtitle" className="bet-modal__subtitle">{race?.name}</p>
            </div>
          </div>
          <div className="bet-modal__header-right">
            <StatusBadge status={raceStatus} />
            <button
              ref={closeRef}
              type="button"
              className="bet-modal__close"
              onClick={onClose}
              aria-label="Đóng"
              disabled={submitting}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="bet-modal__notice">
          <AlertCircle size={14} />
          <span>Odds hiển thị chỉ là <strong>tạm tính</strong>. Odds có thể thay đổi theo lượng cược dồn vào từng cửa (cửa càng nhiều người cược càng có thể bị hạ). Tiền thưởng cuối cùng được tính theo <strong>odds cuối cùng</strong> khi chốt sổ, nên số thực nhận có thể khác odds lúc bạn đặt.</span>
        </div>

        <div className="bet-modal__notice">
          <Sparkles size={14} />
          <span style={{ flex: 1 }}>
            Xem gợi ý % thắng từ AI cho từng ngựa (tốn {AI_PREDICTION_COST} điểm mỗi lần xem,
            chỉ mang tính tham khảo).
          </span>
          <button
            type="button"
            className="bet-ai-btn"
            onClick={handleViewAiPrediction}
            disabled={aiLoading || !race?.raceId}
          >
            {aiLoading ? <Loader2 size={14} className="bet-spin" /> : `Xem gợi ý AI (${AI_PREDICTION_COST} điểm)`}
          </button>
        </div>
        {aiError && (
          <div className="bet-modal__notice bet-modal__notice--error" role="alert">
            <AlertCircle size={14} />
            <span>{aiError}</span>
          </div>
        )}

        {walletFrozen && (
          <div className="bet-modal__notice bet-modal__notice--error" role="alert">
            <AlertCircle size={14} />
            <span>Ví điểm của bạn đang bị đóng băng bởi Admin — không thể đặt cược cho tới khi được mở.</span>
          </div>
        )}

        <form id="bet-form" className="bet-modal__body" onSubmit={handleSubmit}>
          {!isOpen && !success && (
            <div className="bet-modal__blocked">
              <AlertCircle size={16} />
              <span>Trận đấu này không ở trạng thái SCHEDULED nên không thể đặt cược.</span>
            </div>
          )}

          {/* === Bước 1: Loại cược === */}
          <section className="bet-section">
            <h3 className="bet-section__title">1. Chọn loại cược</h3>
            <div className="bet-types">
              {BET_TYPES.map(bt => (
                <button
                  key={bt.code}
                  type="button"
                  disabled={!isOpen || !!success}
                  className={`bet-type ${bt.color} ${betType === bt.code ? 'is-active' : ''}`}
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

          {/* === Bước 2: Chọn ngựa === */}
          <section className="bet-section">
            <h3 className="bet-section__title">
              2. Chọn ngựa
              {isDual && (
                <span className="bet-section__hint">
                  {' '}— Chọn 2 ngựa {betType === 'EXACTA' ? '(thứ tự quan trọng: Pick 1 = nhất, Pick 2 = nhì)' : '(bất kỳ thứ tự)'}
                </span>
              )}
            </h3>

            {liveEntries.length === 0 ? (
              <div className="bet-empty">Chưa có ngựa nào được duyệt cho trận này.</div>
            ) : (
              <div className="bet-horses">
                {liveEntries.map(entry => {
                  const isPick1 = pick1?.entryId === entry.entryId
                  const isPick2 = pick2?.entryId === entry.entryId
                  const horse   = entry.horse
                  const jockey  = entry.jockey
                  const odds    = Number(entry.oddsFinal ?? 0)
                  const cs      = horse?.careerStats

                  return (
                    <button
                      key={entry.entryId}
                      type="button"
                      disabled={!isOpen || !!success}
                      className={[
                        'bet-horse',
                        isPick1 ? 'is-selected' : '',
                        isPick2 ? 'is-second' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => handleEntryClick(entry)}
                    >
                      {/* Pick badge */}
                      {isDual && (isPick1 || isPick2) && (
                        <span className={`bet-horse__pick-badge ${isPick1 ? 'badge--p1' : 'badge--p2'}`}>
                          {isPick1 ? 'Pick 1' : 'Pick 2'}
                        </span>
                      )}

                      <div className="bet-horse__gate">{entry.entryId}</div>

                      <div className="bet-horse__info">
                        <div className="bet-horse__name">{horse?.name ?? '—'}</div>
                        <div className="bet-horse__jockey">
                          Kỵ sĩ: {jockey?.fullName ?? '—'}
                        </div>
                        {cs && (
                          <div className="bet-horse__stats">
                            <span>{cs.totalStarts} trận</span>
                            <span>·</span>
                            <span>Thắng {cs.winRate ?? 0}%</span>
                            {cs.avgPosition != null && (
                              <>
                                <span>·</span>
                                <span>TB #{cs.avgPosition}</span>
                              </>
                            )}
                          </div>
                        )}
                        {entry.pairCareerStats && (
                          <div className="bet-horse__pair">
                            Cặp đôi: {entry.pairCareerStats.totalStarts} trận · Thắng {entry.pairCareerStats.winRate ?? 0}%
                          </div>
                        )}
                        {aiPredictions && horse?.horseId != null && aiPredictions[horse.horseId] != null && (
                          <div className="bet-horse__ai">
                            <Sparkles size={11} /> AI dự đoán thắng: {aiPredictions[horse.horseId]}%
                          </div>
                        )}
                      </div>

                      <div className="bet-horse__odds">
                        <div className="bet-horse__odds-label">Odds</div>
                        <div className="bet-horse__odds-value">
                          {odds > 0 ? `×${odds.toFixed(2)}` : '—'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* === Bước 3: Nhập số điểm === */}
          <section className="bet-section">
            <h3 className="bet-section__title">3. Nhập số điểm cược</h3>
            <div className="bet-amount">
              <input
                type="number"
                className="bet-amount__input"
                min={MIN_BET}
                max={maxAllowed}
                step={10}
                value={amount}
                disabled={!isOpen || !!success}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Tối thiểu ${MIN_BET} · Tối đa 50% số dư (${formatPoints(maxAllowed)})`}
              />
              <div className="bet-amount__quick">
                {QUICK_AMOUNTS.map(v => (
                  <button
                    key={v}
                    type="button"
                    disabled={!isOpen || !!success || v > maxAllowed}
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

          {/* === Tóm tắt === */}
          {picksReady && lockedOddsPreview != null && (
            <section className="bet-summary">
              {isDual ? (
                <>
                  <div className="bet-summary__row">
                    <span>Pick 1 ({betType === 'EXACTA' ? 'về nhất' : 'ngựa A'})</span>
                    <strong>{pick1?.horse?.name} — ×{Number(pick1.oddsFinal).toFixed(2)}</strong>
                  </div>
                  <div className="bet-summary__row">
                    <span>Pick 2 ({betType === 'EXACTA' ? 'về nhì' : 'ngựa B'})</span>
                    <strong>{pick2?.horse?.name} — ×{Number(pick2.oddsFinal).toFixed(2)}</strong>
                  </div>
                  <div className="bet-summary__row">
                    <span>Odds khoá (trung bình)</span>
                    <strong>×{lockedOddsPreview.toFixed(2)}</strong>
                  </div>
                  <div className="bet-summary__row">
                    <span>Hệ số {betType}</span>
                    <strong>×{betMultiplier.toFixed(2)}</strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="bet-summary__row">
                    <span>Ngựa đã chọn</span>
                    <strong>{pick1?.horse?.name}</strong>
                  </div>
                  <div className="bet-summary__row">
                    <span>Odds khoá</span>
                    <strong>×{lockedOddsPreview.toFixed(2)}</strong>
                  </div>
                  {betMultiplier !== 1 && (
                    <div className="bet-summary__row">
                      <span>Hệ số {betType}</span>
                      <strong>×{betMultiplier.toFixed(2)}</strong>
                    </div>
                  )}
                </>
              )}
              <div className="bet-summary__row">
                <span>Loại cược</span>
                <strong>{betType}</strong>
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
              <span>Đặt cược thành công! Vé cược đã được ghi nhận với odds ×{Number(success.lockedOdds).toFixed(2)}.</span>
            </div>
          )}
        </form>

        <footer className="bet-modal__footer">
          <div className="bet-modal__balance">
            <Coins size={13} />
            <span>Số dư: <strong>{formatPoints(userBalance)} PTS</strong></span>
          </div>
          <div className="bet-modal__footer-actions">
            <button type="button" className="bet-btn bet-btn--ghost" onClick={onClose} disabled={submitting}>
              Đóng
            </button>
            {!success && (
              <button
                type="submit"
                form="bet-form"
                className="bet-btn bet-btn--primary"
                disabled={!canSubmit}
              >
                {submitting ? 'Đang đặt…' : walletFrozen ? 'Ví đang bị đóng băng' : 'Xác nhận đặt cược'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
