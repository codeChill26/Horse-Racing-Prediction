/**
 * SpectatorProfilePage - Trang hồ sơ Spectator
 * Giao diện dark theme đồng bộ với admin
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyProfile, updateMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import { RoleBadge, StatusBadge } from '../../components/ui/Badges'
import './SpectatorProfilePage.css'

function getInitials(name) {
  if (!name?.trim()) return '?'
  return name.trim().split(/\s+/).slice(-2).map(w => w[0]?.toUpperCase()).join('')
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="sp-profile-row">
      <dt>{label}</dt>
      <dd className={mono ? 'sp-profile-mono' : undefined}>{value ?? '—'}</dd>
    </div>
  )
}

// ====== POINT WALLET MODAL ======
function PointWalletModal({ wallet, userName, onClose }) {
  const transactions = wallet?.transactions || []
  const totalIn = transactions
    .filter(t => (t.amount || 0) > 0)
    .reduce((s, t) => s + (t.amount || 0), 0)
  const totalOut = transactions
    .filter(t => (t.amount || 0) < 0)
    .reduce((s, t) => s + Math.abs(t.amount || 0), 0)

  return (
    <div className="sp-modal-overlay" onClick={onClose}>
      <div className="sp-modal sp-modal--lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sp-modal__header">
          <div>
            <p className="sp-modal__eyebrow">Ví điểm</p>
            <h3 className="sp-modal__title">Chi tiết ví điểm</h3>
          </div>
          <button type="button" className="sp-modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="sp-modal__body">
          {/* Balance Hero */}
          <div className="pwm-balance-card">
            <div className="pwm-balance-card__icon">💰</div>
            <div className="pwm-balance-card__info">
              <span className="pwm-balance-card__label">Số dư khả dụng</span>
              <div className="pwm-balance-card__balance">
                {Number(wallet?.balance ?? 0).toLocaleString('vi-VN')}
                <span> điểm</span>
              </div>
            </div>
            {wallet?.isFrozen && (
              <span className="pwm-wallet-frozen-badge">VÍ ĐÓNG BĂNG</span>
            )}
          </div>

          {/* Summary row */}
          <div className="pwm-summary">
            <div className="pwm-summary__card pwm-summary__card--in">
              <p className="pwm-summary__label">Tổng nạp</p>
              <p className="pwm-summary__value">+{totalIn.toLocaleString('vi-VN')}</p>
            </div>
            <div className="pwm-summary__card pwm-summary__card--out">
              <p className="pwm-summary__label">Tổng tiêu</p>
              <p className="pwm-summary__value">-{totalOut.toLocaleString('vi-VN')}</p>
            </div>
            <div className="pwm-summary__card pwm-summary__card--net">
              <p className="pwm-summary__label">Hiện có</p>
              <p className="pwm-summary__value">{Number(wallet?.balance ?? 0).toLocaleString('vi-VN')}</p>
            </div>
          </div>

          {/* Transaction Log */}
          <div className="pwm-tx-section">
            <p className="pwm-tx-section__label">Lịch sử giao dịch gần đây</p>
            {transactions.length > 0 ? (
              <div className="pwm-tx-list">
                {transactions.map((tx, idx) => {
                  const isPositive = (tx.amount || 0) > 0
                  return (
                    <div key={tx.transactionId || idx} className="pwm-tx-item">
                      <div className="pwm-tx-item__icon">
                        {isPositive ? '↓' : '↑'}
                      </div>
                      <div className="pwm-tx-item__info">
                        <p className="pwm-tx-item__reason">{tx.reason || (isPositive ? 'Nạp điểm' : 'Chi tiêu')}</p>
                        <p className="pwm-tx-item__date">{formatDateTime(tx.createdAt)}</p>
                      </div>
                      <span className={`pwm-tx-item__amount ${isPositive ? 'is-positive' : 'is-negative'}`}>
                        {isPositive ? '+' : ''}{Number(tx.amount || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="pwm-empty">
                <p>Chưa có giao dịch nào.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sp-modal__footer">
          <button type="button" className="sp-btn sp-btn--ghost" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

// ====== MAIN COMPONENT ======
export default function SpectatorProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' })
  const [formData, setFormData] = useState({ fullName: '', phoneNumber: '', bio: '' })
  const [showWallet, setShowWallet] = useState(false)
  const avatarInputRef = useRef(null)

  const loadProfile = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await getMyProfile(token)
      setUser(data)
      setFormData({
        fullName: data.fullName || '',
        phoneNumber: data.phoneNumber || '',
        bio: data.bio || '',
      })
    } catch (e) {
      setUser(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    setFormData(prev => ({ ...prev, _avatarPreview: objectUrl }))
  }

  const startEditing = () => {
    if (!user) return
    setFormData({
      fullName: user.fullName || '',
      phoneNumber: user.phoneNumber || '',
      bio: user.bio || '',
    })
    setEditing(true)
    setSaveMsg({ type: '', text: '' })
  }

  const cancelEditing = () => {
    setEditing(false)
    setSaveMsg({ type: '', text: '' })
  }

  const handleSave = async () => {
    if (!formData.fullName?.trim()) {
      setSaveMsg({ type: 'error', text: 'Họ và tên không được để trống.' })
      return
    }
    const token = getAccessToken()
    if (!token) return
    setSaving(true)
    setSaveMsg({ type: '', text: '' })
    try {
      const updated = await updateMyProfile(token, {
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber?.trim() || undefined,
        bio: formData.bio?.trim() || undefined,
      })
      setUser(updated)
      setEditing(false)
      setSaveMsg({ type: 'success', text: 'Cập nhật hồ sơ thành công!' })
      await loadProfile()
    } catch (e) {
      setSaveMsg({ type: 'error', text: e instanceof Error ? e.message : 'Cập nhật thất bại.' })
    } finally {
      setSaving(false)
    }
  }

  const balance = user?.pointWallet?.balance
  const walletFrozen = user?.pointWallet?.isFrozen === 1

  return (
    <div className="spectator-page">
      <div className="spectator-page-inner">

        {/* Header */}
        <div className="sp-page-header">
          <div>
            <p className="sp-page-eyebrow">Trang cá nhân</p>
            <h1 className="sp-page-title">Hồ sơ khán giả</h1>
            <p className="sp-page-subtitle">Thông tin tài khoản của bạn</p>
          </div>
          {!loading && user && (
            <div className="sp-page-header-actions">
              {editing ? (
                <>
                  <button type="button" className="sp-btn sp-btn--ghost" onClick={cancelEditing} disabled={saving}>
                    Hủy
                  </button>
                  <button type="button" className="sp-btn sp-btn--primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </button>
                </>
              ) : (
                <button type="button" className="sp-btn sp-btn--outline" onClick={startEditing}>
                  Chỉnh sửa hồ sơ
                </button>
              )}
            </div>
          )}
        </div>

        {/* Alerts */}
        {error ? (
          <div className="sp-alert sp-alert--error">
            <span>{error}</span>
            <Link to="/login" className="sp-profile-link">Đăng nhập lại</Link>
          </div>
        ) : null}
        {saveMsg.text ? (
          <div className={`sp-alert sp-alert--${saveMsg.type}`}>
            <span>{saveMsg.text}</span>
          </div>
        ) : null}

        {/* Loading */}
        {loading && !user ? (
          <div className="sp-loading" aria-busy="true">
            <div className="sp-spinner" />
            <p>Đang tải hồ sơ…</p>
          </div>
        ) : null}

        {user && (
          <>
            {/* Hero Card: Left = User Info | Right = Point Wallet */}
            <section className="sp-profile-hero">

              {/* LEFT: Avatar + User Info */}
              <div className="sp-profile-hero__left">
                {/* Avatar */}
                <div className="sp-profile-avatar-wrap">
                  <div className="sp-profile-avatar-container">
                    {formData._avatarPreview || user.avatarUrl ? (
                      <img
                        src={formData._avatarPreview || user.avatarUrl}
                        alt=""
                        className="sp-profile-avatar-img"
                      />
                    ) : (
                      <span className="sp-profile-avatar-fallback">{getInitials(user.fullName)}</span>
                    )}
                    {editing && (
                      <button
                        type="button"
                        className="sp-profile-avatar-edit"
                        onClick={() => avatarInputRef.current?.click()}
                        title="Đổi ảnh đại diện"
                      >
                        📷
                      </button>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="sp-profile-hidden-input"
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* User info body */}
                <div className="sp-profile-body">
                  {editing ? (
                    <input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="sp-profile-name-input"
                      placeholder="Họ và tên"
                    />
                  ) : (
                    <h2 className="sp-profile-name">{user.fullName}</h2>
                  )}
                  <p className="sp-profile-email">{user.email}</p>
                  <div className="sp-profile-badges">
                    <RoleBadge role={user.role?.code || user.role?.name || 'SPECTATOR'} label={user.role?.name} />
                    <span className="sp-profile-badge">
                      {user.role?.code || 'SPECTATOR'}
                    </span>
                    <StatusBadge
                      status={user.isActive ? 'ACTIVE' : 'INACTIVE'}
                      label={user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                    />
                    {user.isProfileComplete && (
                      <span className="sp-profile-badge sp-profile-badge--complete">Hồ sơ đầy đủ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Point Wallet */}
              {user.pointWallet != null && (
                <button
                  type="button"
                  className="sp-profile-hero__wallet"
                  onClick={() => setShowWallet(true)}
                  title="Xem chi tiết ví điểm"
                >
                  <div className="sp-profile-wallet__header">
                    <span className="sp-profile-wallet__label">Ví điểm</span>
                    <span className="sp-profile-wallet__chevron">›</span>
                  </div>
                  <div className="sp-profile-wallet__balance">
                    {Number(balance ?? 0).toLocaleString('vi-VN')}
                    <span className="sp-profile-wallet__unit"> điểm</span>
                  </div>
                  {walletFrozen ? (
                    <span className="sp-profile-wallet-frozen">Ví đóng băng</span>
                  ) : (
                    <span className="sp-profile-wallet__hint">Nhấn để xem chi tiết</span>
                  )}
                </button>
              )}
            </section>

            {/* Info Grid */}
            <div className="sp-profile-grid">

              {/* Thông tin liên hệ */}
              <section className="sp-profile-card">
                <h3>Thông tin liên hệ</h3>
                {editing ? (
                  <div className="sp-profile-edit-form">
                    <div className="sp-profile-field">
                      <label className="sp-profile-field-label" htmlFor="fullName">Họ và tên</label>
                      <input id="fullName" name="fullName" type="text" value={formData.fullName}
                        onChange={handleChange} className="sp-profile-field-input" placeholder="Nhập họ và tên" />
                    </div>
                    <div className="sp-profile-field">
                      <label className="sp-profile-field-label" htmlFor="phoneNumber">Số điện thoại</label>
                      <input id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber}
                        onChange={handleChange} className="sp-profile-field-input" placeholder="0xxx xxx xxx" />
                    </div>
                  </div>
                ) : (
                  <dl className="sp-profile-dl">
                    <InfoRow label="Họ và tên" value={user.fullName} />
                    <InfoRow label="Email" value={user.email} mono />
                    <InfoRow label="Số điện thoại" value={user.phoneNumber || 'Chưa cập nhật'} mono />
                  </dl>
                )}
              </section>

              {/* Tài khoản hệ thống */}
              <section className="sp-profile-card">
                <h3>Tài khoản hệ thống</h3>
                <dl className="sp-profile-dl">
                  <InfoRow label="Mã người dùng" value={`#${user.userId}`} mono />
                  <InfoRow label="Mã vai trò" value={user.roleId} mono />
                  <InfoRow label="Vai trò" value={`${user.role?.name} (${user.role?.code})`} />
                  <InfoRow label="Hồ sơ hoàn chỉnh" value={user.isProfileComplete ? 'Có' : 'Chưa'} />
                </dl>
              </section>

              {/* Giới thiệu */}
              <section className="sp-profile-card">
                <h3>Giới thiệu</h3>
                {editing ? (
                  <div className="sp-profile-edit-form">
                    <div className="sp-profile-field">
                      <label className="sp-profile-field-label" htmlFor="bio">Tiểu sử</label>
                      <textarea id="bio" name="bio" value={formData.bio}
                        onChange={handleChange} className="sp-profile-field-textarea"
                        placeholder="Viết giới thiệu ngắn về bản thân…" rows={3} />
                    </div>
                  </div>
                ) : (
                  <dl className="sp-profile-dl">
                    <InfoRow label="Tiểu sử" value={user.bio || 'Chưa có tiểu sử.'} />
                  </dl>
                )}
              </section>

              {/* Thời gian */}
              <section className="sp-profile-card">
                <h3>Thời gian</h3>
                <dl className="sp-profile-dl">
                  <InfoRow label="Ngày tạo" value={formatDateTime(user.createdAt)} />
                  <InfoRow label="Cập nhật lần cuối" value={formatDateTime(user.updatedAt)} />
                  {user.lockedUntil && (
                    <InfoRow label="Khóa đến" value={formatDateTime(user.lockedUntil)} />
                  )}
                </dl>
              </section>
            </div>

            <p className="sp-profile-hint">
              <Link to="/spectator" className="sp-profile-link">← Về trang chủ</Link>
            </p>
          </>
        )}
      </div>

      {/* Point Wallet Modal */}
      {showWallet && user?.pointWallet && (
        <PointWalletModal
          wallet={user.pointWallet}
          userName={user.fullName}
          onClose={() => setShowWallet(false)}
        />
      )}
    </div>
  )
}
