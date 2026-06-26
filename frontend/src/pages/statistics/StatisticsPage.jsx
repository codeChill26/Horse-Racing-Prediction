/**
 * StatisticsPage - Thống kê
 * Giao diện dark theme đồng bộ với admin
 */

import { TrendingUp, Award, Target, BarChart3 } from 'lucide-react'
import './StatisticsPage.css'

// Mock data
const MOCK_STATS = {
  totalBets: 45,
  totalSpent: 12500000,
  totalWon: 18750000,
  winRate: 62,
  totalRaces: 32,
  avgOdds: 3.2,
  bestStreak: 5,
  favoriteHorse: 'Hồng Xa Vơi',
  favoriteJockey: 'Nguyễn Văn A',
  recentPerformance: [
    { race: 'Giải mùa xuân - Chặng 1', result: 'win', profit: 900000 },
    { race: 'Giải mùa xuân - Chặng 2', result: 'lose', profit: -200000 },
    { race: 'Giải mùa xuân - Chặng 3', result: 'win', profit: 750000 },
    { race: 'Cúp tốc độ - Chặng 1', result: 'win', profit: 300000 },
    { race: 'Cúp tốc độ - Chặng 2', result: 'lose', profit: -150000 },
    { race: 'Cúp tốc độ - Chặng 3', result: 'win', profit: 400000 },
  ],
}

function StatCard({ icon: Icon, label, value, color, valueColor }) {
  return (
    <div className="st-card">
      <div className={`st-card__icon-wrap st-card__icon-wrap--${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="st-card__label">{label}</p>
        <p className={`st-card__value ${valueColor ? `st-card__value--${valueColor}` : ''}`}>{value}</p>
      </div>
    </div>
  )
}

export default function StatisticsPage() {
  const net = MOCK_STATS.totalWon - MOCK_STATS.totalSpent

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
        </div>

        {/* Summary stats */}
        <div className="st-summary">
          <StatCard icon={Target} label="Tổng lần đặt cược" value={MOCK_STATS.totalBets} color="primary" />
          <StatCard icon={TrendingUp} label="Tổng thắng" value={`${(MOCK_STATS.totalWon / 1000000).toFixed(1)}M đ`} color="secondary" valueColor="green" />
          <StatCard icon={BarChart3} label="Tỷ lệ thắng" value={`${MOCK_STATS.winRate}%`} color="tertiary" />
          <StatCard icon={Award} label="Chuỗi thắng tốt nhất" value={`${MOCK_STATS.bestStreak} lần`} color="secondary" />
        </div>

        {/* Additional stats */}
        <div className="st-summary" style={{ marginBottom: '1.5rem' }}>
          <div className="st-card">
            <div>
              <p className="st-card__label">Tổng đã đặt</p>
              <p className="st-card__value">{(MOCK_STATS.totalSpent / 1000000).toFixed(1)}M đ</p>
            </div>
          </div>
          <div className="st-card">
            <div>
              <p className="st-card__label">Số giải đã tham gia</p>
              <p className="st-card__value">{MOCK_STATS.totalRaces}</p>
            </div>
          </div>
          <div className="st-card">
            <div>
              <p className="st-card__label">Tỷ lệ cược trung bình</p>
              <p className="st-card__value">×{MOCK_STATS.avgOdds}</p>
            </div>
          </div>
          <div className="st-card">
            <div>
              <p className="st-card__label">Lãi/Lỗ ròng</p>
              <p className={`st-card__value ${net >= 0 ? 'st-card__value--green' : 'st-card__value--lost'}`}>
                {net >= 0 ? '+' : ''}{(net / 1000000).toFixed(1)}M đ
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
                <p className="st-fav-card__name">{MOCK_STATS.favoriteHorse}</p>
                <p className="st-fav-card__desc">Ngựa được đặt cược nhiều nhất</p>
              </div>
            </div>
            <div className="st-fav-card">
              <div className="st-fav-card__avatar st-fav-card__avatar--jockey">
                {MOCK_STATS.favoriteJockey.split(' ').slice(-2).map(w => w[0]).join('')}
              </div>
              <div>
                <p className="st-fav-card__name">{MOCK_STATS.favoriteJockey}</p>
                <p className="st-fav-card__desc">Kỵ sĩ được đặt cược nhiều nhất</p>
              </div>
            </div>
          </div>

          {/* Hiệu suất gần đây */}
          <div className="st-perf">
            <div className="st-perf__header">
              <div>
                <p className="st-perf__title">Hiệu suất gần đây</p>
                <p className="st-perf__subtitle">6 lần đặt cược gần nhất</p>
              </div>
            </div>
            <div className="st-perf__list">
              {MOCK_STATS.recentPerformance.map((item, idx) => (
                <div key={idx} className="st-perf__item">
                  <span className="st-perf__race">{item.race}</span>
                  <span className={`st-perf__result st-perf__result--${item.result === 'win' ? 'win' : 'lose'}`}>
                    {item.result === 'win' ? 'Thắng' : 'Thua'}
                  </span>
                  <span className={`st-perf__points st-perf__points--${item.result === 'win' ? 'win' : 'lose'}`}>
                    {item.profit > 0 ? '+' : ''}{(item.profit / 1000).toFixed(0)}K đ
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
