import React, { useEffect, useMemo, useState } from 'react'
import { X, Coins, AlertCircle, CheckCircle2 } from 'lucide-react'
import { bettingService } from '../../services/bettingService'
import { formatPoints } from '../../utils/formatter'
import { StatusBadge } from '../ui/Badges'
import './BettingModal.css'

const BET_TYPES = [
  { code: 'WIN',      label: 'WIN',      description: 'Ngựa về nhất',              icon: '🥇', color: 'bet-type--gold',   picks: 1 },
  { code: 'PLACE',    label: 'PLACE',    description: 'Ngựa vào Top 2',            icon: '🥈', color: 'bet-type--silver', picks: 1 },
  { code: 'SHOW',     label: 'SHOW',     description: 'Ngựa vào Top 3',            icon: '🥉', color: 'bet-type--bronze', picks: 1 },
  { code: 'QUINELLA', label: 'QUINELLA', description: '2 ngựa nhất+nhì (bất kỳ thứ tự)', icon: '🔁', color: 'bet-type--teal',   picks: 2 },
  { code: 'EXACTA',   label: 'EXACTA',   description: 'Chỉ định chính xác nhất+nhì',     icon: '🎯', color: 'bet-type--purple', picks: 2 },
]

const MIN_BET = 10
const QUICK_AMOUNTS = [100, 500, 1000, 5000]

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
export default function BettingModal({ race, entries = [], userBalance = 0, onClose, onPlaced }) {
  const [betType, setBetType]       = useState('WIN')
  const [pick1, setPick1]           = useState(null)   // entry object (first pick)
  const [pick2, setPick2]           = useState(null)   // entry object (second pick, QUINELLA/EXACTA only)
  const [amount, setAmount]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]       = useState(null)
  const [error, setError]           = useState('')

  const betTypeDef = BET_TYPES.find(b => b.code === betType)
  const isDual     = betTypeDef?.picks === 2
  const isOpen     = race?.status === 'SCHEDULED'

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

  const numericAmount  = Number(amount) || 0
  const maxAllowed     = Math.floor(userBalance * 0.5)
  const potentialPayout = lockedOddsPreview && numericAmount > 0
    ? Math.floor(numericAmount * lockedOddsPreview)
    : 0

  const amountError = useMemo(() => {
    if (!amount) return ''
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 'Số điểm phải là số dương'
    if (numericAmount < MIN_BET) return `Tối thiểu ${MIN_BET.toLocaleString('vi-VN')} điểm`
    if (numericAmount > maxAllowed) return `Tối đa 50% số dư (${formatPoints(maxAllowed)} điểm)`
    return ''
  }, [amount, numericAmount, maxAllowed])

  const picksReady = isDual ? (pick1 && pick2) : !!pick1
  const canSubmit  = isOpen && !submitting && !success && picksReady &&
                     numericAmount >= MIN_BET && numericAmount <= maxAllowed && !amountError

  async function handleSubmit(e) {
    e.preventDefault()
    if (!picksReady) { setError(isDual ? 'Vui lòng chọn đủ 2 ngựa.' : 'Vui lòng chọn ngựa.'); return }
    if (amountError)  { setError(amountError); return }
    setError('')
    setSubmitting(true)
    try {
      const entryIds = isDual ? [pick1.entryId, pick2.entryId] : [pick1.entryId]
      const prediction = await bettingService.placeBet({
        raceId:        race.raceId,
        betType,
        entryIds,
        betAmount:     numericAmount,
        walletBalance: userBalance,
      })
      setSuccess(prediction)
      onPlaced?.(prediction)
    } catch (err) {
      setError(err.message || 'Đặt cược thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bet-modal-backdrop" onClick={onClose}>
      <div className="bet-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="bet-modal__bar" />

        {/* Header */}
        <header className="bet-modal__header">
          <div className="bet-modal__title-wrap">
            <Coins className="bet-modal__icon" size={18} />
            <div>
              <h2 className="bet-modal__title">Đặt cược PTS</h2>
              <p className="bet-modal__subtitle">{race?.name}</p>
            </div>
          </div>
          <div className="bet-modal__header-right">
            <StatusBadge status={race?.status} />
            <button type="button" className="bet-modal__close" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="bet-modal__notice">
          <AlertCircle size={14} />
          <span>Odds hiển thị là tỷ lệ tại thời điểm bạn bấm "Xác nhận". Sau đó không thay đổi dù Admin điều chỉnh.</span>
        </div>

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

            {entries.length === 0 ? (
              <div className="bet-empty">Chưa có ngựa nào được duyệt cho trận này.</div>
            ) : (
              <div className="bet-horses">
                {entries.map(entry => {
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
                {submitting ? 'Đang đặt…' : 'Xác nhận đặt cược'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
