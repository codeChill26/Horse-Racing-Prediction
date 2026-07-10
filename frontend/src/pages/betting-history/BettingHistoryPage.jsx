/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BettingHistoryPage — FLOW 7
 * Lịch sử đặt cược của spectator. Hiển thị:
 *   - Status map đầy đủ theo mainflow.md: PENDING | WON | LOST | REFUNDED | PARTIAL_WON
 *   - Cancel button cho vé cược PENDING (race còn SCHEDULED)
 *   - Realtime update qua socket `race:published` (admin settle xong → status đổi WON/LOST)
 *
 * G2: KHÔNG dùng silent mock fallback — nếu API lỗi/trả [] thì hiển thị empty state + retry
 *     (đồng bộ với pattern B-002 của repository khác).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, X, AlertTriangle, Coins } from 'lucide-react'
import { bettingService } from '../../services/bettingService'
import { showToast } from '../../hooks/showToast'
import { onSocketEvent, onSocketStatus } from '../../utils/socket'
import { getAccessToken } from '../../utils/token'
import { formatPoints } from '../../utils/formatter'
import ConfirmModal from '../../components/ui/ConfirmModal'
import './BettingHistoryPage.css'

/**
 * Map status code (BE trả) → UI label + class
 * Bao phủ đầy đủ theo mainflow.md FLOW 7:
 *   PENDING, WON, LOST, REFUNDED, PARTIAL_WON
 */
const STATUS_MAP = {
  PENDING:      { label: 'CHỜ KẾT QUẢ', cls: 'pending' },
  WON:          { label: 'ĐÃ THẮNG',     cls: 'won' },
  LOST:         { label: 'ĐÃ THUA',      cls: 'lost' },
  REFUNDED:     { label: 'ĐÃ HOÀN',      cls: 'refunded' },
  PARTIAL_WON:  { label: 'THẮNG MỘT PHẦN', cls: 'partial' },
}

function StatusBadge({ status }) {
  const code = String(status || '').toUpperCase()
  const cfg = STATUS_MAP[code] || { label: code || '—', cls: 'pending' }
  return <span className={`sp-badge sp-badge--${cfg.cls}`}>{cfg.label}</span>
}

/**
 * Tabs theo trạng thái vé cược.
 *  - 'all': Tất cả
 *  - 'pending': CHỜ KẾT QUẢ (có thể cancel)
 *  - 'won': ĐÃ THẮNG + PARTIAL_WON
 *  - 'lost': ĐÃ THUA
 *  - 'refunded': ĐÃ HOÀN
 */
const TABS = [
  { id: 'all',       label: 'Tất cả' },
  { id: 'pending',   label: 'Chờ kết quả' },
  { id: 'won',       label: 'Đã thắng' },
  { id: 'lost',      label: 'Đã thua' },
  { id: 'refunded',  label: 'Đã hoàn' },
]

/**
 * Chuẩn hoá response từ BE về shape hiển thị thống nhất:
 *   { id, raceName, raceId, raceStatus, horseName, jockeyName, betType,
 *     odds, lockedOdds, amount, payout, status, placedAt, canCancel }
 *
 * BE shape (theo mainflow.md): { predictionId, race: {raceId, name, status},
 *   entries: [{horseName, jockeyName}], betType, lockedOdds, betAmount, payout,
 *   status, placedAt }
 */
function normalizePrediction(p) {
  if (!p) return null
  const raceName = p.race?.name ?? p.raceName ?? '—'
  const raceId = p.race?.raceId ?? p.raceId ?? null
  const raceStatus = p.race?.status ?? p.raceStatus ?? null
  const firstEntry = Array.isArray(p.entries) && p.entries.length > 0 ? p.entries[0] : null
  const horseName = firstEntry?.horse?.name ?? firstEntry?.horseName ?? p.horseName ?? '—'
  const jockeyName = firstEntry?.jockey?.fullName ?? firstEntry?.jockeyName ?? p.jockeyName ?? '—'
  const id = p.predictionId ?? p.id
  const status = String(p.status ?? 'PENDING').toUpperCase()
  return {
    id,
    raceId,
    raceName,
    raceStatus,
    horseName,
    jockeyName,
    betType: p.betType ?? 'WIN',
    odds: Number(p.lockedOdds ?? p.odds ?? 0),
    lockedOdds: Number(p.lockedOdds ?? 0),
    amount: Number(p.betAmount ?? p.amount ?? 0),
    payout: Number(p.payout ?? 0),
    status,
    placedAt: p.placedAt ?? p.createdAt ?? null,
    // Cancel chỉ khả thi khi vé còn PENDING VÀ race còn SCHEDULED
    canCancel: status === 'PENDING' && (raceStatus === 'SCHEDULED' || raceStatus == null),
  }
}

/**
 * FIX BUG-7.09: matchesTab giờ normalize status về uppercase để chịu BE trả cả
 * 'pending' lẫn 'PENDING' (lowercase/uppercase). Tránh bets bị "lạc" khỏi tab.
 */
function matchesTab(prediction, tabId) {
  const status = String(prediction.status || '').toUpperCase()
  if (tabId === 'all') return true
  if (tabId === 'pending') return status === 'PENDING'
  if (tabId === 'won') return status === 'WON' || status === 'PARTIAL_WON'
  if (tabId === 'lost') return status === 'LOST'
  if (tabId === 'refunded') return status === 'REFUNDED'
  return false
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export default function BettingHistoryPage() {
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [cancellingId, setCancellingId] = useState(null)
  const [lastRefreshAt, setLastRefreshAt] = useState(null)
  // FIX BUG-7.17: thay window.confirm bằng shared <ConfirmModal>.
  const [confirmCancel, setConfirmCancel] = useState(null) // bet | null
  const [cancelError, setCancelError] = useState('')

  const loadBets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await bettingService.getMyBets()
      const list = Array.isArray(data) ? data.map(normalizePrediction).filter(Boolean) : []
      setBets(list)
      setLastRefreshAt(new Date().toISOString())
    } catch (e) {
      // G2: KHÔNG silent fallback về mock. Hiển thị lỗi để user biết phải retry.
      const msg = e?.message || 'Không tải được lịch sử đặt cược'
      setError(msg)
      setBets([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBets()
  }, [loadBets])

  // G8+G10: subscribe socket events để cập nhật realtime khi admin publish race
  // (PENDING → WON/LOST) hoặc khi race đổi status (cancel chỉ khả thi khi SCHEDULED).
  //
  // FIX BUG-7.01 + BUG-7.07: race:published handler giờ ignore patch nếu race đã
  // bị unpublish (status PENDING_RESULT), tránh patch stale data từ payload
  // cũ. Handler chỉ patch những bet có status PENDING — bets đã REFUNDED là
  // terminal và KHÔNG được phép đổi.
  //
  // Payload mong đợi (khuyến nghị BE):
  //   {
  //     raceId, status: 'FINISHED',
  //     settlement: { totalPool, payout, ... },
  //     predictions: [{ predictionId, status: 'WON'|'LOST'|'REFUNDED'|'PENDING', payout }]
  //   }
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return undefined

    const offPublished = onSocketEvent('race:published', (payload) => {
      const incomingRaceId = String(payload?.raceId ?? payload?.race?.raceId ?? '')
      const raceStatus = String(payload?.status ?? '').toUpperCase()
      const predictionPatches = Array.isArray(payload?.predictions)
        ? payload.predictions
        : []

      // Nếu BE vô tình emit race:published với race trở về PENDING_RESULT
      // (đã unpublished) thì bỏ qua toàn bộ patch — tránh stale state.
      if (raceStatus && raceStatus !== 'FINISHED') return

      if (!incomingRaceId && predictionPatches.length === 0) {
        // Không đủ dữ liệu để patch — refresh toàn bộ cho chắc
        loadBets()
        return
      }

      if (predictionPatches.length > 0) {
        // Patch chính xác theo predictionId → status
        // Lọc các patch có status hợp lệ (WON/LOST/REFUNDED/PARTIAL_WON).
        const VALID_TERMINAL = new Set(['WON', 'LOST', 'REFUNDED', 'PARTIAL_WON'])
        const patchMap = new Map()
        for (const p of predictionPatches) {
          const id = String(p.predictionId ?? p.id ?? '')
          if (!id) continue
          const status = String(p.status ?? '').toUpperCase()
          // Bỏ qua patch có status trống/không hợp lệ
          if (!status || !VALID_TERMINAL.has(status)) continue
          patchMap.set(id, {
            status,
            payout: Number.isFinite(Number(p.payout)) ? Number(p.payout) : 0,
          })
        }

        if (patchMap.size === 0) {
          loadBets()
          return
        }

        setBets((prev) =>
          prev.map((b) => {
            const key = String(b.id)
            if (!patchMap.has(key)) return b
            // FIX BUG-7.01: bets đã REFUNDED là terminal — KHÔNG bị patch.
            if (b.status === 'REFUNDED') return b
            const patch = patchMap.get(key)
            return {
              ...b,
              status: patch.status,
              payout: patch.payout,
              canCancel: false, // race đã FINISHED → không thể cancel
            }
          })
        )
      } else {
        // Fallback: payload chỉ có raceId. Race đã publish → không thể cancel nữa.
        setBets((prev) =>
          prev.map((b) =>
            String(b.raceId) === incomingRaceId
              ? { ...b, canCancel: false }
              : b
          )
        )
      }
    })

    // FIX BUG-7.01 + BUG-7.08: race:unpublished → race rollback về PENDING_RESULT.
    // CHỈ reset bets có status WON/LOST/PARTIAL_WON về PENDING. Bets REFUNDED
    // là terminal — KHÔNG được revert. Sửa dead logic `b.canCancel || true`
    // → dùng raceStatus lưu trên bet (nếu SCHEDULED/PENDING_RESULT thì cho cancel).
    //
    // Lưu ý: race:unpublished chỉ revert bets đã settle; race ở SCHEDULED thì
    // bets vốn là PENDING, không có gì để revert.
    const offUnpublished = onSocketEvent('race:unpublished', (payload) => {
      const incomingRaceId = String(payload?.raceId ?? payload?.race?.raceId ?? '')
      const raceStatus = String(payload?.status ?? '').toUpperCase()
      if (!incomingRaceId) return

      // Chỉ xử lý nếu BE xác nhận race về PENDING_RESULT
      const targetRaceStatus = raceStatus || 'PENDING_RESULT'

      setBets((prev) =>
        prev.map((b) => {
          if (String(b.raceId) !== incomingRaceId) return b
          // Giữ nguyên bets REFUNDED
          if (b.status === 'REFUNDED') return b
          // Chỉ revert bets đã settle (WON/LOST/PARTIAL_WON)
          if (b.status !== 'WON' && b.status !== 'LOST' && b.status !== 'PARTIAL_WON') {
            // Bets PENDING giữ nguyên, nhưng cap nhat raceStatus để UI phản ánh.
            return { ...b, raceStatus: targetRaceStatus }
          }
          return {
            ...b,
            raceStatus: targetRaceStatus,
            status: 'PENDING',
            payout: 0,
            // Re-enable cancel nếu race vẫn SCHEDULED.
            // Sau unpublish, race ở PENDING_RESULT → KHÔNG cho cancel.
            canCancel: false,
          }
        })
      )
    })

    const offStatus = onSocketStatus(({ socket: s }) => {
      if (s && s.connected) {
        /* connected — không cần re-subscribe */
      }
    })

    return () => {
      offPublished()
      offUnpublished()
      offStatus()
    }
  }, [loadBets])

  // FIX BUG-7.17: thay window.confirm bằng shared <ConfirmModal>.
  const handleCancel = useCallback(async (bet) => {
    if (!bet?.canCancel) return
    setConfirmCancel(bet)
    // Đợi user nhấn nút trong modal để thực sự gọi API.
  }, [])

  const doCancel = useCallback(async () => {
    const bet = confirmCancel
    if (!bet) return
    setCancellingId(bet.id)
    try {
      await bettingService.cancelBet(bet.id)
      setBets((prev) =>
        prev.map((b) =>
          b.id === bet.id
            ? { ...b, status: 'REFUNDED', canCancel: false }
            : b
        )
      )
      showToast.success(
        `Đã hủy vé #${bet.id}. ${formatPoints(bet.amount)} PTS đã hoàn về ví.`,
        'Hoàn cược'
      )
      setConfirmCancel(null)
    } finally {
      setCancellingId(null)
    }
  }, [confirmCancel])

  const submitCancel = useCallback(async () => {
    setCancelError('')
    try {
      await doCancel()
    } catch (e) {
      setCancelError(e?.message || 'Không thể hủy vé cược')
    }
  }, [doCancel])

  const closeCancel = useCallback(() => {
    if (cancellingId !== null) return
    setConfirmCancel(null)
    setCancelError('')
  }, [cancellingId])

  const filtered = useMemo(
    () => bets.filter((b) => matchesTab(b, activeTab)),
    [bets, activeTab]
  )

  // Tổng kết (theo status chuẩn hoá)
  const summary = useMemo(() => {
    let totalBet = 0
    let totalWon = 0
    let totalLost = 0
    let totalRefunded = 0
    let pendingCount = 0

    for (const b of bets) {
      totalBet += b.amount
      switch (b.status) {
        case 'WON':
          totalWon += b.payout
          break
        case 'LOST':
          totalLost += b.amount
          break
        case 'REFUNDED':
          totalRefunded += b.amount
          break
        case 'PENDING':
          pendingCount += 1
          break
        case 'PARTIAL_WON':
          totalWon += b.payout
          break
        default:
          break
      }
    }

    return { totalBet, totalWon, totalLost, totalRefunded, pendingCount, net: totalWon - totalLost }
  }, [bets])

  const tabCounts = useMemo(() => {
    return TABS.reduce((acc, t) => {
      acc[t.id] = bets.filter((b) => matchesTab(b, t.id)).length
      return acc
    }, {})
  }, [bets])

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner">
        {/* Header */}
        <div className="sp-page-header">
          <div>
            <p className="sp-page-eyebrow">Theo dõi</p>
            <h1 className="sp-page-title">Lịch sử đặt cược</h1>
            <p className="sp-page-subtitle">
              Tất cả các lần đặt cược của bạn
              {lastRefreshAt && (
                <> · Cập nhật lúc {formatDate(lastRefreshAt)}</>
              )}
            </p>
          </div>
          <button
            type="button"
            className="sp-btn sp-btn--outline"
            onClick={loadBets}
            disabled={loading}
            aria-label="Làm mới lịch sử đặt cược"
          >
            <RefreshCw size={14} className={loading ? 'sp-btn__spin' : ''} aria-hidden="true" />
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
        </div>

        {/* Error banner (G2: thay thế silent mock fallback) */}
        {error && !loading && (
          <div className="bh-error-banner" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <div>
              <strong>Không tải được lịch sử đặt cược</strong>
              <p>{error}</p>
            </div>
            <button type="button" className="sp-btn sp-btn--ghost" onClick={loadBets}>
              <RefreshCw size={12} /> Thử lại
            </button>
          </div>
        )}

        {/* Summary */}
        {!loading && !error && bets.length > 0 && (
          <div className="bh-summary">
            <div className="bh-summary__card bh-summary__card--total">
              <p className="bh-summary__label">Tổng cược</p>
              <p className="bh-summary__value">{formatPoints(summary.totalBet)}</p>
            </div>
            <div className="bh-summary__card bh-summary__card--win">
              <p className="bh-summary__label">Tổng thắng</p>
              <p className="bh-summary__value bh-summary__value--win">+{formatPoints(summary.totalWon)}</p>
            </div>
            <div className="bh-summary__card bh-summary__card--lost">
              <p className="bh-summary__label">Tổng thua</p>
              <p className="bh-summary__value bh-summary__value--lost">-{formatPoints(summary.totalLost)}</p>
            </div>
            <div className="bh-summary__card bh-summary__card--net">
              <p className="bh-summary__label">Lãi/Lỗ</p>
              <p className={`bh-summary__value ${summary.net >= 0 ? 'bh-summary__value--win' : 'bh-summary__value--lost'}`}>
                {summary.net >= 0 ? '+' : ''}{formatPoints(summary.net)}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        {!loading && !error && bets.length > 0 && (
          <div className="bh-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`bh-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span className="bh-tab__count">{tabCounts[tab.id] ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="sp-loading">
            <div className="sp-spinner" />
            <p>Đang tải lịch sử cược…</p>
          </div>
        ) : error ? (
          /* đã render error banner phía trên — không render empty state */
          null
        ) : filtered.length > 0 ? (
          <div className="bh-table-wrap">
            <table className="bh-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Giải đua</th>
                  <th>Ngựa đặt cược</th>
                  <th>Loại</th>
                  <th>Tỷ lệ</th>
                  <th>Số điểm</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bet, idx) => (
                  <tr key={bet.id} className="bh-table__row">
                    <td className="bh-table__num">{idx + 1}</td>
                    <td className="bh-table__race">{bet.raceName}</td>
                    <td>
                      <div className="bh-table__horse">
                        <span className="bh-table__horse-name">{bet.horseName}</span>
                        <span className="bh-table__jockey">{bet.jockeyName}</span>
                      </div>
                    </td>
                    <td className="bh-table__bet-type">{bet.betType}</td>
                    <td className="bh-table__odds">×{bet.odds > 0 ? bet.odds.toFixed(2) : '—'}</td>
                    <td className="bh-table__amount">{formatPoints(bet.amount)} đ</td>
                    <td>
                      <div className="bh-table__status">
                        <StatusBadge status={bet.status} />
                        {(bet.status === 'WON' || bet.status === 'PARTIAL_WON') && bet.payout > 0 && (
                          <span className="bh-table__win-amount">
                            +{formatPoints(bet.payout)} đ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="bh-table__date">{formatDate(bet.placedAt)}</td>
                    <td className="bh-table__actions">
                      {bet.canCancel && (
                        <button
                          type="button"
                          className="bh-btn-cancel"
                          onClick={() => handleCancel(bet)}
                          disabled={cancellingId === bet.id}
                          aria-label={`Hủy vé cược #${bet.id}`}
                        >
                          <X size={12} aria-hidden="true" />
                          {cancellingId === bet.id ? 'Đang hủy…' : 'Hủy vé'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sp-empty">
            <span className="sp-empty__icon">
              {activeTab === 'pending' ? '⏳' : '📋'}
            </span>
            <p className="sp-empty__title">
              {activeTab === 'all'
                ? 'Bạn chưa đặt cược lần nào'
                : 'Không có vé cược nào ở trạng thái này'}
            </p>
            <p className="sp-empty__desc">
              {activeTab === 'all'
                ? 'Bắt đầu đặt cược để xem lịch sử tại đây.'
                : 'Chuyển sang tab khác để xem các vé khác.'}
            </p>
            {activeTab === 'all' && (
              <Link to="/spectator/tournaments" className="sp-btn sp-btn--ghost">
                <Coins size={12} /> Khám phá giải đấu
              </Link>
            )}
          </div>
        )}
      </div>

      {/* FIX BUG-7.17: shared ConfirmModal thay cho window.confirm */}
      <ConfirmModal
        open={!!confirmCancel}
        title={confirmCancel ? `Hủy vé cược #${confirmCancel.id}?` : 'Hủy vé cược?'}
        message={confirmCancel ? (
          <>
            Hủy vé cược <strong>#{confirmCancel.id}</strong> ({confirmCancel.horseName}).
            Số điểm <strong>{formatPoints(confirmCancel.amount)}</strong> sẽ được hoàn 100% về ví.
            <br />
            <span style={{ opacity: 0.85 }}>Thao tác này không thể hoàn tác.</span>
          </>
        ) : ''}
        confirmLabel="Xác nhận hủy"
        confirmTone="danger"
        busy={cancellingId !== null}
        error={cancelError}
        onConfirm={submitCancel}
        onClose={closeCancel}
      />
    </div>
  )
}