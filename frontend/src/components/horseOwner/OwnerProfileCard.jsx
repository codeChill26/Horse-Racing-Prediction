/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared components cho Horse Owner Profile UI
 */

import { useState } from 'react'
import { Pencil, Save, X, Mail, Phone, MapPin, Calendar, Hash, ShieldCheck, CircleUserRound } from 'lucide-react'
import { RoleBadge, StatusBadge } from '../ui/Badges'
import './OwnerProfileCard.css'

/* ============================================================
   OWNER HERO CARD
   - Hiển thị tên + email + role + status
   ============================================================ */
export function OwnerHeroCard({ user }) {
  if (!user) return null
  const initials = (user.fullName || user.name || '?')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <section className="op-hero">
      <div className="op-hero__avatar" aria-hidden="true">
        {initials || '👤'}
      </div>
      <div className="op-hero__body">
        <p className="op-hero__eyebrow">Chủ ngựa · Horse Owner</p>
        <h1>{user.fullName || user.name || 'Chủ ngựa'}</h1>
        <div className="op-hero__meta">
          <span>
            <Mail size={13} /> {user.email || '—'}
          </span>
          {user.phoneNumber ? (
            <span>
              <Phone size={13} /> {user.phoneNumber}
            </span>
          ) : null}
          {user.createdAt ? (
            <span>
              <Calendar size={13} /> Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}
            </span>
          ) : null}
        </div>
        <div className="op-hero__badges">
          <RoleBadge role={user.role?.code || user.role || 'HORSE_OWNER'} />
          <StatusBadge status={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
          {user.isVerified || user.isProfileComplete ? (
            <span className="op-hero__verify">
              <ShieldCheck size={12} /> Đã xác minh
            </span>
          ) : null}
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   OWNER INFO CARD
   - Thông tin chủ ngựa (id, số ngựa, ...)
   ============================================================ */
export function OwnerInfoCard({ owner = {}, stats = {} }) {
  const rows = [
    { icon: Hash, label: 'Mã chủ ngựa', value: owner.ownerId || owner.userId || owner.id || '—' },
    { icon: CircleUserRound, label: 'Vai trò', value: 'HORSE_OWNER' },
    { icon: ShieldCheck, label: 'Trạng thái xác minh', value: owner.isVerified ? 'Đã xác minh' : 'Chưa xác minh' },
    { icon: Calendar, label: 'Ngày tham gia', value: owner.joinedAt || owner.createdAt ? new Date(owner.joinedAt || owner.createdAt).toLocaleDateString('vi-VN') : '—' },
  ]

  return (
    <section className="op-card">
      <header className="op-card__head">
        <h3>Thông tin chủ ngựa</h3>
        <p>Thống kê hoạt động & xác minh</p>
      </header>
      <dl className="op-card__list">
        {rows.map((r) => {
          const Icon = r.icon
          return (
            <div key={r.label} className="op-card__row">
              <dt>
                <Icon size={13} /> {r.label}
              </dt>
              <dd>{r.value}</dd>
            </div>
          )
        })}
      </dl>
      <div className="op-card__stats">
        <div>
          <span>Ngựa sở hữu</span>
          <strong>{stats.totalHorses ?? 0}</strong>
        </div>
        <div>
          <span>Ngựa hoạt động</span>
          <strong>{stats.activeHorses ?? 0}</strong>
        </div>
        <div>
          <span>Đang chờ duyệt</span>
          <strong>{stats.pendingHorses ?? 0}</strong>
        </div>
        <div>
          <span>Số giải tham gia</span>
          <strong>{stats.tournamentCount ?? 0}</strong>
        </div>
      </div>
    </section>
  )
}

/* ============================================================
   ACCOUNT INFO CARD
   - Thông tin tài khoản cơ bản + nút chỉnh sửa
   ============================================================ */
export function OwnerAccountCard({ user, editable, onSave, saving = false }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    fullName: user?.fullName || user?.name || '',
    phoneNumber: user?.phoneNumber || '',
    address: user?.address || '',
    avatarUrl: user?.avatarUrl || '',
  })

  if (!user) return null

  const handleChange = (field) => (e) => {
    setForm((s) => ({ ...s, [field]: e.target.value }))
  }

  const handleSave = async () => {
    if (!onSave) return
    try {
      await onSave(form)
      setEditing(false)
    } catch {
      /* error displayed by parent via toast */
    }
  }

  return (
    <section className="op-card">
      <header className="op-card__head">
        <div>
          <h3>Thông tin tài khoản</h3>
          <p>Chi tiết liên hệ và bảo mật</p>
        </div>
        {editable && !editing ? (
          <button
            type="button"
            className="op-edit-btn"
            onClick={() => setEditing(true)}
          >
            <Pencil size={13} /> Chỉnh sửa
          </button>
        ) : null}
      </header>

      {editing ? (
        <div className="op-form">
          <label>
            <span>Họ tên</span>
            <input
              type="text"
              value={form.fullName}
              onChange={handleChange('fullName')}
              placeholder="Nhập họ tên"
            />
          </label>
          <label>
            <span>Số điện thoại</span>
            <input
              type="text"
              value={form.phoneNumber}
              onChange={handleChange('phoneNumber')}
              placeholder="VD: 0901234567"
            />
          </label>
          <label className="op-form__full">
            <span>Địa chỉ</span>
            <input
              type="text"
              value={form.address}
              onChange={handleChange('address')}
              placeholder="Số nhà, đường, phường/xã, quận/huyện"
            />
          </label>
          <label className="op-form__full">
            <span>Avatar URL</span>
            <input
              type="text"
              value={form.avatarUrl}
              onChange={handleChange('avatarUrl')}
              placeholder="https://..."
            />
          </label>
          <div className="op-form__actions">
            <button
              type="button"
              className="op-btn op-btn--ghost"
              onClick={() => {
                setForm({
                  fullName: user?.fullName || user?.name || '',
                  phoneNumber: user?.phoneNumber || '',
                  address: user?.address || '',
                  avatarUrl: user?.avatarUrl || '',
                })
                setEditing(false)
              }}
              disabled={saving}
            >
              <X size={13} /> Hủy
            </button>
            <button
              type="button"
              className="op-btn op-btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={13} /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      ) : (
        <dl className="op-card__list">
          <div className="op-card__row">
            <dt>
              <CircleUserRound size={13} /> Họ tên
            </dt>
            <dd>{user.fullName || user.name || '—'}</dd>
          </div>
          <div className="op-card__row">
            <dt>
              <Mail size={13} /> Email
            </dt>
            <dd>{user.email || '—'}</dd>
          </div>
          <div className="op-card__row">
            <dt>
              <Phone size={13} /> Số điện thoại
            </dt>
            <dd>{user.phoneNumber || '—'}</dd>
          </div>
          {user.address ? (
            <div className="op-card__row">
              <dt>
                <MapPin size={13} /> Địa chỉ
              </dt>
              <dd>{user.address}</dd>
            </div>
          ) : null}
          <div className="op-card__row">
            <dt>
              <Hash size={13} /> User ID
            </dt>
            <dd>{user.userId || user.id || '—'}</dd>
          </div>
          <div className="op-card__row">
            <dt>
              <Calendar size={13} /> Ngày tạo
            </dt>
            <dd>
              {user.createdAt
                ? new Date(user.createdAt).toLocaleString('vi-VN')
                : '—'}
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}

/* ============================================================
   OWNER WALLET CARD (mock - wallet PTS chưa có cho owner)
   ============================================================ */
export function OwnerWalletCard({ wallet, loading }) {
  const hasWallet = !!wallet
  const balance = wallet?.balance ?? 0
  const totalAdded = wallet?.totalAdded ?? 0
  const totalUsed = wallet?.totalUsed ?? 0
  const recent = wallet?.recent || []

  return (
    <section className="op-card">
      <header className="op-card__head">
        <div>
          <h3>Ví điểm PTS</h3>
          <p>Điểm thưởng & giao dịch gần đây</p>
        </div>
        <span className={`op-wallet-status ${hasWallet ? 'is-active' : 'is-empty'}`}>
          {hasWallet ? 'Đang hoạt động' : 'Chưa kích hoạt'}
        </span>
      </header>

      {loading ? (
        <p className="op-card__loading">Đang tải ví…</p>
      ) : hasWallet ? (
        <>
          <div className="op-wallet__balance">
            <span>Số dư khả dụng</span>
            <strong>
              {Number(balance).toLocaleString('vi-VN')} <em>PTS</em>
            </strong>
          </div>
          <div className="op-wallet__stats">
            <div>
              <span>Tổng nạp</span>
              <strong>+{Number(totalAdded).toLocaleString('vi-VN')}</strong>
            </div>
            <div>
              <span>Đã sử dụng</span>
              <strong>-{Number(totalUsed).toLocaleString('vi-VN')}</strong>
            </div>
          </div>
          {recent.length ? (
            <ul className="op-wallet__history">
              {recent.slice(0, 5).map((tx, idx) => (
                <li key={tx.id || idx}>
                  <span className="op-wallet__history-label">{tx.label || tx.description || 'Giao dịch'}</span>
                  <span className={`op-wallet__history-amount ${tx.amount >= 0 ? 'is-plus' : 'is-minus'}`}>
                    {tx.amount >= 0 ? '+' : ''}
                    {Number(tx.amount || 0).toLocaleString('vi-VN')} PTS
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="op-card__empty">Chưa có giao dịch gần đây</p>
          )}
        </>
      ) : (
        <p className="op-card__empty">
          {/* TODO: Ví PTS cho Horse Owner chưa được bật trong backend. */}
          Ví PTS cho chủ ngựa sẽ được kích hoạt trong phiên bản tiếp theo.
        </p>
      )}
    </section>
  )
}