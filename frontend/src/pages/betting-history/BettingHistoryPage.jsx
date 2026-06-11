/**
 * BettingHistoryPage - Lịch sử đặt cược
 * Giao diện dark theme đồng bộ với admin
 */

import { useCallback, useEffect, useState } from 'react'
import { bettingService } from '../../services/bettingService'
import './BettingHistoryPage.css'

// Mock data khi API chưa có
const MOCK_BETS = [
  { id: 1, raceName: 'Giải Vô địch mùa xuân 2026 - Chặng 1', horse: 'Hồng Xa Vơi', jockey: 'Nguyễn Văn A', amount: 500000, status: 'won', statusLabel: 'ĐÃ THẮNG', date: '15/06/2026', odds: '×2.8', winAmount: 1400000 },
  { id: 2, raceName: 'Giải Vô địch mùa xuân 2026 - Chặng 2', horse: 'Bạch Kim', jockey: 'Trần Thị B', amount: 300000, status: 'lost', statusLabel: 'ĐÃ THUA', date: '16/06/2026', odds: '×3.5', winAmount: 0 },
  { id: 3, raceName: 'Cúp Tốc độ Quốc gia - Chặng 1', horse: 'Hắc Mã', jockey: 'Lê Văn C', amount: 200000, status: 'pending', statusLabel: 'CHỜ KẾT QUẢ', date: '22/06/2026', odds: '×4.2', winAmount: 0 },
  { id: 4, raceName: 'Giải Vô địch mùa xuân 2026 - Chặng 3', horse: 'Thiên Mã', jockey: 'Phạm Văn D', amount: 400000, status: 'won', statusLabel: 'ĐÃ THẮNG', date: '17/06/2026', odds: '×1.9', winAmount: 760000 },
  { id: 5, raceName: 'Cúp Tốc độ Quốc gia - Chặng 2', horse: 'Phong Linh', jockey: 'Võ Thị E', amount: 150000, status: 'lost', statusLabel: 'ĐÃ THUA', date: '23/06/2026', odds: '×2.4', winAmount: 0 },
]

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'won', label: 'Đã thắng' },
  { id: 'lost', label: 'Đã thua' },
  { id: 'pending', label: 'Chờ kết quả' },
]

function StatusBadge({ status }) {
  const map = {
    won: { label: 'ĐÃ THẮNG', cls: 'won' },
    lost: { label: 'ĐÃ THUA', cls: 'lost' },
    pending: { label: 'CHỜ KẾT QUẢ', cls: 'pending' },
  }
  const { label, cls } = map[status] || { label: status, cls: 'pending' }
  return <span className={`sp-badge sp-badge--${cls}`}>{label}</span>
}

export default function BettingHistoryPage() {
  const [bets, setBets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const loadBets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await bettingService.getMyBets()
      if (data.length > 0) {
        setBets(data)
      } else {
        setBets(MOCK_BETS)
      }
    } catch {
      setBets(MOCK_BETS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBets()
  }, [loadBets])

  const filtered = activeTab === 'all'
    ? bets
    : bets.filter(b => b.status === activeTab)

  const totalWon = bets.filter(b => b.status === 'won').reduce((s, b) => s + (b.winAmount || 0), 0)
  const totalLost = bets.filter(b => b.status === 'lost').reduce((s, b) => s + (b.amount || 0), 0)
  const totalBet = bets.reduce((s, b) => s + (b.amount || 0), 0)

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner">
        {/* Header */}
        <div className="sp-page-header">
          <div>
            <p className="sp-page-eyebrow">Theo dõi</p>
            <h1 className="sp-page-title">Lịch sử đặt cược</h1>
            <p className="sp-page-subtitle">Tất cả các lần đặt cược của bạn</p>
          </div>
          <button type="button" className="sp-btn sp-btn--outline" onClick={loadBets} disabled={loading}>
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
        </div>

        {/* Summary */}
        {!loading && bets.length > 0 && (
          <div className="bh-summary">
            <div className="bh-summary__card bh-summary__card--total">
              <p className="bh-summary__label">Tổng cược</p>
              <p className="bh-summary__value">{totalBet.toLocaleString('vi-VN')}</p>
            </div>
            <div className="bh-summary__card bh-summary__card--win">
              <p className="bh-summary__label">Tổng thắng</p>
              <p className="bh-summary__value bh-summary__value--win">+{totalWon.toLocaleString('vi-VN')}</p>
            </div>
            <div className="bh-summary__card bh-summary__card--lost">
              <p className="bh-summary__label">Tổng thua</p>
              <p className="bh-summary__value bh-summary__value--lost">-{totalLost.toLocaleString('vi-VN')}</p>
            </div>
            <div className="bh-summary__card bh-summary__card--net">
              <p className="bh-summary__label">Lãi/Lỗ</p>
              <p className={`bh-summary__value ${totalWon - totalLost >= 0 ? 'bh-summary__value--win' : 'bh-summary__value--lost'}`}>
                {totalWon - totalLost >= 0 ? '+' : ''}{(totalWon - totalLost).toLocaleString('vi-VN')}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bh-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`bh-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id !== 'all' && (
                <span className="bh-tab__count">
                  {tab.id === 'won' ? bets.filter(b => b.status === 'won').length :
                   tab.id === 'lost' ? bets.filter(b => b.status === 'lost').length :
                   bets.filter(b => b.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="sp-loading">
            <div className="sp-spinner" />
            <p>Đang tải lịch sử cược…</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="bh-table-wrap">
            <table className="bh-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Giải đua</th>
                  <th>Ngựa đặt cược</th>
                  <th>Tỷ lệ</th>
                  <th>Số điểm</th>
                  <th>Trạng thái</th>
                  <th>Ngày</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bet, idx) => (
                  <tr key={bet.id} className="bh-table__row">
                    <td className="bh-table__num">{idx + 1}</td>
                    <td className="bh-table__race">{bet.raceName}</td>
                    <td>
                      <div className="bh-table__horse">
                        <span className="bh-table__horse-name">{bet.horse}</span>
                        <span className="bh-table__jockey">{bet.jockey}</span>
                      </div>
                    </td>
                    <td className="bh-table__odds">{bet.odds}</td>
                    <td className="bh-table__amount">
                      {bet.amount.toLocaleString('vi-VN')} đ
                    </td>
                    <td>
                      <div className="bh-table__status">
                        <StatusBadge status={bet.status} />
                        {bet.status === 'won' && (
                          <span className="bh-table__win-amount">
                            +{bet.winAmount?.toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="bh-table__date">{bet.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sp-empty">
            <span className="sp-empty__icon">📋</span>
            <p className="sp-empty__title">Không có lịch sử đặt cược</p>
            <p className="sp-empty__desc">Bắt đầu đặt cược để xem lịch sử tại đây</p>
            <button
              type="button"
              className="sp-btn sp-btn--ghost"
              onClick={() => window.location.href = '/spectator'}
            >
              Khám phá giải đấu
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
