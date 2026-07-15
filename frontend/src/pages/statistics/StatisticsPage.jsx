/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * StatisticsPage — FLOW 7
 * Thống kê hiệu suất đặt cược của spectator.
 *
 * G5+G11:
 *   - Fetch từ `GET /api/predictions/stats` (thay vì 100% mock data).
 *   - Loading + error + empty states (đồng bộ với pattern B-002: KHÔNG silent mock fallback).
 *   - Nếu BE chưa sẵn sàng → empty state có CTA, không tự fill mock.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Award, Target, BarChart3, AlertTriangle, RefreshCw, Coins } from 'lucide-react'
import { bettingService } from '../../services/bettingService'
import { formatPoints } from '../../utils/formatter'
import './StatisticsPage.css'

function StatCard({ icon: Icon, label, value, color, valueColor, ariaLabel }) {
  return (
    <div className="st-card">
      {Icon ? (
        <div className={`st-card__icon-wrap st-card__icon-wrap--${color}`}>
          <Icon size={20} />
        </div>
      ) : null}
      <div>
        <p className="st-card__label">{label}</p>
        <div
          className={`st-card__value ${valueColor ? `st-card__value--${valueColor}` : ''}`}
          aria-live="polite"
          aria-label={ariaLabel || label}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

/**
 * FIX BUG-7.10: thêm NaN-safe conversion. Nếu BE trả NaN/Infinity thì fallback 0,
 * tránh `stats.totalBets === NaN` không match `=== 0` → không vào empty state.
 */
function safeNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeStats(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    totalBets: safeNumber(raw.totalBets),
    totalSpent: safeNumber(raw.totalSpent),
    totalWon: safeNumber(raw.totalWon ?? raw.totalPayout),
    winRate: safeNumber(raw.winRate),
    totalRaces: safeNumber(raw.totalRaces),
    avgOdds: safeNumber(raw.avgOdds),
    bestStreak: safeNumber(raw.bestStreak),
    favoriteHorse: raw.favoriteHorse ?? null,
    favoriteJockey: raw.favoriteJockey ?? null,
    recentPerformance: Array.isArray(raw.recentPerformance)
      ? raw.recentPerformance.slice(0, 6).map((p) => ({
          raceName: p.raceName ?? p.race ?? '—',
          result: String(p.result ?? '').toLowerCase() === 'win' ? 'win' : 'lose',
          profit: safeNumber(p.profit),
          placedAt: p.placedAt ?? null,
        }))
      : [],
  }
}

function initialsOf(name) {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.trim().split(/\s+/)
  const last = parts.slice(-1)[0] || ''
  const first = parts[0] || ''
  return `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}`
}

export default function StatisticsPage() {
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await bettingService.getMyStats()
      setStats(normalizeStats(data))
    } catch (e) {
      setError(e?.message || 'Không tải được thống kê')
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  if (loading) {
    return (
      <div className="spectator-page">
        <div className="spectator-page-inner">
          <div className="sp-page-header">
            <div>
              <p className="sp-page-eyebrow">Hiệu suất</p>
              <h1 className="sp-page-title">Thống kê</h1>
              <p className="sp-page-subtitle">Tổng quan hiệu suất đặt cược của bạn</p>
            </div>
          </div>
          <div className="sp-loading">
            <div className="sp-spinner" />
            <p>Đang tải thống kê…</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="spectator-page">
        <div className="spectator-page-inner">
          <div className="sp-page-header">
            <div>
              <p className="sp-page-eyebrow">Hiệu suất</p>
              <h1 className="sp-page-title">Thống kê</h1>
              <p className="sp-page-subtitle">Tổng quan hiệu suất đặt cược của bạn</p>
            </div>
            <button
              type="button"
              className="sp-btn sp-btn--outline"
              onClick={loadStats}
              aria-label="Tải lại thống kê"
            >
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
          <div className="bh-error-banner" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <div>
              <strong>Không tải được thống kê</strong>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // FIX BUG-7.10: Number.isFinite check trên stats; nếu normalizeStats trả null
  // hoặc totalBets=0 thì empty state.
  if (!stats || !Number.isFinite(stats.totalBets) || stats.totalBets === 0) {
    return (
      <div className="spectator-page">
        <div className="spectator-page-inner">
          <div className="sp-page-header">
            <div>
              <p className="sp-page-eyebrow">Hiệu suất</p>
              <h1 className="sp-page-title">Thống kê</h1>
              <p className="sp-page-subtitle">Tổng quan hiệu suất đặt cược của bạn</p>
            </div>
            <button
              type="button"
              className="sp-btn sp-btn--outline"
              onClick={loadStats}
            >
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>
          <div className="sp-empty">
            <span className="sp-empty__icon">📊</span>
            <p className="sp-empty__title">Chưa có dữ liệu thống kê</p>
            <p className="sp-empty__desc">Đặt cược vài ván để xem thống kê chi tiết tại đây.</p>
            <Link to="/spectator/tournaments" className="sp-btn sp-btn--ghost">
              <Coins size={12} /> Khám phá giải đấu
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const net = stats.totalWon - stats.totalSpent

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner">

        {/* Header */}
        <div className="sp-page-header">
          <div>
            <p className="sp-page-eyebrow">Hiệu suất</p>
            <h1 className="sp-page-title">Thống kê</h1>
            <p className="sp-page-subtitle">Tổng quan hiệu suất đặt cược của bạn</p>
          </div>
          <button
            type="button"
            className="sp-btn sp-btn--outline"
            onClick={loadStats}
          >
            <RefreshCw size={14} /> Làm mới
          </button>
        </div>

        {/* Summary stats */}
        <div className="st-summary">
          <StatCard icon={Target}    label="Tổng lần đặt cược"   value={stats.totalBets}                              color="primary" />
          <StatCard icon={TrendingUp} label="Tổng thắng"          value={formatPoints(stats.totalWon)}                 color="secondary" valueColor="green" />
          <StatCard icon={BarChart3}  label="Tỷ lệ thắng"         value={`${stats.winRate}%`}                          color="tertiary" />
          <StatCard icon={Award}      label="Chuỗi thắng tốt nhất" value={`${stats.bestStreak} lần`}                    color="secondary" />
        </div>

        {/* Additional stats */}
        <div className="st-summary" style={{ marginBottom: '1.5rem' }}>
          <div className="st-card">
            <div>
              <p className="st-card__label">Tổng đã đặt</p>
              <p className="st-card__value">{formatPoints(stats.totalSpent)}</p>
            </div>
          </div>
          <div className="st-card">
            <div>
              <p className="st-card__label">Số giải đã tham gia</p>
              <p className="st-card__value">{stats.totalRaces}</p>
            </div>
          </div>
          <div className="st-card">
            <div>
              <p className="st-card__label">Tỷ lệ cược trung bình</p>
              <p className="st-card__value">
                {stats.avgOdds > 0 ? `×${stats.avgOdds.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>
          <div className="st-card">
            <div>
              <p className="st-card__label">Lãi/Lỗ ròng</p>
              <p className={`st-card__value ${net >= 0 ? 'st-card__value--green' : 'st-card__value--lost'}`}>
                {net >= 0 ? '+' : ''}{formatPoints(net)}
              </p>
            </div>
          </div>
        </div>

        {/* Favorites + Performance */}
        <div className="st-grid">
          {/* Ngựa yêu thích + Kỵ sĩ yêu thích */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="st-fav-card">
              <div className="st-fav-card__avatar st-fav-card__avatar--horse">
                🐎
              </div>
              <div>
                <p className="st-fav-card__name">
                  {stats.favoriteHorse || '—'}
                </p>
                <p className="st-fav-card__desc">
                  {stats.favoriteHorse ? 'Ngựa được đặt cược nhiều nhất' : 'Chưa có dữ liệu'}
                </p>
              </div>
            </div>
            <div className="st-fav-card">
              <div className="st-fav-card__avatar st-fav-card__avatar--jockey">
                {initialsOf(stats.favoriteJockey)}
              </div>
              <div>
                <p className="st-fav-card__name">
                  {stats.favoriteJockey || '—'}
                </p>
                <p className="st-fav-card__desc">
                  {stats.favoriteJockey ? 'Kỵ sĩ được đặt cược nhiều nhất' : 'Chưa có dữ liệu'}
                </p>
              </div>
            </div>
          </div>

          {/* Hiệu suất gần đây */}
          <div className="st-perf">
            <div className="st-perf__header">
              <div>
                <p className="st-perf__title">Hiệu suất gần đây</p>
                <p className="st-perf__subtitle">
                  {stats.recentPerformance.length > 0
                    ? `${stats.recentPerformance.length} lần đặt cược gần nhất`
                    : 'Chưa có lịch sử'}
                </p>
              </div>
            </div>
            {stats.recentPerformance.length > 0 ? (
              <div className="st-perf__list">
                {stats.recentPerformance.map((item, idx) => (
                  <div key={idx} className="st-perf__item">
                    <span className="st-perf__race">{item.raceName}</span>
                    <span className={`st-perf__result st-perf__result--${item.result === 'win' ? 'win' : 'lose'}`}>
                      {item.result === 'win' ? 'Thắng' : 'Thua'}
                    </span>
                    <span className={`st-perf__points st-perf__points--${item.result === 'win' ? 'win' : 'lose'}`}>
                      {item.profit > 0 ? '+' : ''}{formatPoints(item.profit)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="st-perf__empty">Chưa có dữ liệu hiệu suất.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}