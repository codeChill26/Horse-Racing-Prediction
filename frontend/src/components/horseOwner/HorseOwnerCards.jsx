/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared components cho Horse Owner UI
 */

import { Link } from 'react-router-dom'
import { ShieldCheck, Trophy, AlertTriangle, Calendar, MapPin, Hash, Activity, PawPrint } from 'lucide-react'
import { StatusBadge } from '../ui/Badges'
import './HorseOwnerCards.css'

/* ============================================================
   HORSE OWNER STAT CARD
   - Hiển thị một số liệu tổng quan (tổng ngựa, đang hoạt động, ...)
   - tone: 'primary' (xanh emerald) | 'gold' (vàng regal) | 'danger'
   ============================================================ */
export function HorseOwnerStatCard({
  icon: Icon = PawPrint,
  label,
  value,
  hint,
  tone = 'primary',
  loading = false,
}) {
  const safeValue = value ?? (loading ? '—' : 0)
  return (
    <article className={`ho-stat-card ho-stat-card--${tone}`}>
      <div className="ho-stat-card__icon" aria-hidden="true">
        <Icon size={20} />
      </div>
      <div className="ho-stat-card__body">
        <p className="ho-stat-card__label">{label}</p>
        <p className="ho-stat-card__value">{loading ? '—' : safeValue}</p>
        {hint ? <p className="ho-stat-card__hint">{hint}</p> : null}
      </div>
    </article>
  )
}

/* ============================================================
   OWNER HORSE CARD
   - Một con ngựa trong danh sách "Ngựa của tôi"
   - Hiển thị: id, tên, tuổi, breed, status, recentForm, jockey
   ============================================================ */
export function OwnerHorseCard({ horse, onViewDetails }) {
  if (!horse) return null
  const metrics = horse.careerMetrics || {}
  const recentText = metrics.recentFormText || '—'

  return (
    <article className="ho-horse-card">
      <div className="ho-horse-card__head">
        <div className="ho-horse-card__avatar" aria-hidden="true">
          <PawPrint size={22} />
        </div>
        <div className="ho-horse-card__title">
          <h3>{horse.name ?? 'Chưa có tên'}</h3>
          <p>
            <Hash size={11} /> #{horse.horseId} · {horse.breed || 'Chưa rõ giống'}
          </p>
        </div>
        <StatusBadge status={horse.status} />
      </div>

      <div className="ho-horse-card__meta">
        <div className="ho-horse-card__meta-item">
          <span>Tuổi</span>
          <strong>{horse.age ?? '—'}</strong>
        </div>
        <div className="ho-horse-card__meta-item">
          <span>Số lần đua</span>
          <strong>{metrics.totalStarts ?? 0}</strong>
        </div>
        <div className="ho-horse-card__meta-item">
          <span>Số trận thắng</span>
          <strong>{metrics.wins ?? 0}</strong>
        </div>
        <div className="ho-horse-card__meta-item">
          <span>Phong độ</span>
          <strong className="ho-horse-card__form">{recentText || '—'}</strong>
        </div>
      </div>

      {horse.color || horse.sex ? (
        <p className="ho-horse-card__sub">
          {[horse.sex, horse.color].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      <div className="ho-horse-card__footer">
        {onViewDetails ? (
          <button
            type="button"
            className="ho-btn ho-btn--ghost"
            onClick={() => onViewDetails(horse)}
          >
            Xem chi tiết
          </button>
        ) : (
          <span />
        )}
        {horse.dateOfBirth ? (
          <span className="ho-horse-card__age">
            <Calendar size={11} />{' '}
            {new Date(horse.dateOfBirth).toLocaleDateString('vi-VN')}
          </span>
        ) : null}
      </div>
    </article>
  )
}

/* ============================================================
   OWNER TOURNAMENT CARD
   - Một giải đấu mà ngựa của owner đang/sẽ tham gia
   ============================================================ */
export function OwnerTournamentCard({ tournament, onView }) {
  if (!tournament) return null
  const start = tournament.startAt ? new Date(tournament.startAt) : null
  const end = tournament.endAt ? new Date(tournament.endAt) : null
  const period =
    start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
      ? `${start.toLocaleDateString('vi-VN')} – ${end.toLocaleDateString('vi-VN')}`
      : '—'

  return (
    <article className="ho-tournament-card">
      <div className="ho-tournament-card__head">
        <div className="ho-tournament-card__icon" aria-hidden="true">
          <Trophy size={20} />
        </div>
        <div className="ho-tournament-card__title">
          <h3>{tournament.name ?? 'Giải đấu'}</h3>
          <p>{tournament.description || 'Giải đấu đua ngựa chuyên nghiệp'}</p>
        </div>
        <StatusBadge status={tournament.status} />
      </div>

      <ul className="ho-tournament-card__meta">
        <li>
          <Calendar size={13} /> {period}
        </li>
        {tournament.location ? (
          <li>
            <MapPin size={13} /> {tournament.location}
          </li>
        ) : null}
        {tournament.horseCount ? (
          <li>
            <PawPrint size={13} /> {tournament.horseCount} ngựa tham gia
          </li>
        ) : null}
      </ul>

      <div className="ho-tournament-card__footer">
        {onView ? (
          <button
            type="button"
            className="ho-btn ho-btn--primary ho-btn--sm"
            onClick={() => onView(tournament)}
          >
            Xem chi tiết
          </button>
        ) : null}
        {tournament.entryStatus ? (
          <span className="ho-tournament-card__entry">{tournament.entryStatus}</span>
        ) : null}
      </div>
    </article>
  )
}

/* ============================================================
   OWNER WARNING CARD
   - Cảnh báo nếu có ngựa bị vi phạm, sai lệch, chưa đủ điều kiện
   ============================================================ */
export function OwnerWarningCard({ warnings = [] }) {
  if (!warnings.length) return null
  return (
    <section className="ho-warning-card">
      <header className="ho-warning-card__head">
        <AlertTriangle size={18} />
        <h3>Cảnh báo ({warnings.length})</h3>
      </header>
      <ul>
        {warnings.map((w, idx) => (
          <li key={w.id || idx}>
            <ShieldCheck size={13} /> <span>{w.message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ============================================================
   QUICK ACTION CARD
   - Nút thao tác nhanh trên Home
   ============================================================ */
export function OwnerQuickAction({ icon: Icon = Activity, title, desc, tag, to, onClick, disabled }) {
  const content = (
    <>
      <div className="ho-quick-action__icon" aria-hidden="true">
        <Icon size={20} />
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      {tag ? <span className="ho-quick-action__tag">{tag}</span> : null}
    </>
  )

  if (disabled || !to) {
    return (
      <div className={`ho-quick-action ho-quick-action--disabled`} aria-disabled="true">
        {content}
      </div>
    )
  }
  if (to && !onClick) {
    return (
      <Link to={to} className="ho-quick-action">
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className="ho-quick-action" onClick={onClick}>
      {content}
    </button>
  )
}