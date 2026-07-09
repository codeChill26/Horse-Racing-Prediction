/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Horse Owner Profile Page
 * - Hiển thị thông tin tài khoản, thông tin chủ ngựa, ví PTS
 * - Cho phép chỉnh sửa fullName (backend chỉ hỗ trợ fullName qua PUT /api/auth/profile)
 */

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, RefreshCcw, X, ArrowLeft } from 'lucide-react'
import { getMyProfile, updateMyProfile } from '../../api/auth'
import { getAccessToken } from '../../utils/token'
import { horseService } from '../../services/horseService'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  OwnerHeroCard,
  OwnerInfoCard,
  OwnerAccountCard,
  OwnerWalletCard,
} from '../../components/horseOwner/OwnerProfileCard'
import { MyViolationsList } from '../../components/shared/MyViolationsList'
import './HorseOwnerProfilePage.css'

export default function HorseOwnerProfilePage() {
  const [user, setUser] = useState(null)
  const [horses, setHorses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingHorses, setLoadingHorses] = useState(true)
  const [error, setError] = useState('')
  const [errorHorses, setErrorHorses] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadHorses = useCallback(async () => {
    setLoadingHorses(true)
    setErrorHorses('')
    try {
      const data = await horseService.getMyHorses()
      setHorses(Array.isArray(data) ? data : [])
    } catch (e) {
      setErrorHorses(e instanceof Error ? e.message : String(e))
      setHorses([])
    } finally {
      setLoadingHorses(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
    loadHorses()
  }, [loadProfile, loadHorses])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  const ownerStats = {
    totalHorses: horses.length,
    activeHorses: horses.filter((h) => h.status === 'APPROVED').length,
    pendingHorses: horses.filter((h) => h.status === 'PENDING').length,
    tournamentCount: 0, // TODO: tích hợp API số giải tham gia nếu backend cung cấp
  }

  const handleSaveProfile = async (form) => {
    const token = getAccessToken()
    if (!token) {
      setToast({ type: 'error', text: 'Phiên đăng nhập hết hạn' })
      return
    }
    setSaving(true)
    try {
      // Backend PUT /api/auth/profile hiện chỉ hỗ trợ fullName (cùng với password)
      // Phone, address, avatarUrl: TODO tích hợp khi backend bổ sung
      const updated = await updateMyProfile(token, { fullName: form.fullName })
      setUser((prev) => ({ ...prev, ...updated }))
      setToast({ type: 'success', text: 'Cập nhật hồ sơ thành công' })
    } catch (e) {
      setToast({ type: 'error', text: e instanceof Error ? e.message : String(e) })
      throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="owner-page">
      {toast ? (
        <div className={`owner-toast owner-toast--${toast.type}`} role="status">
          <span className="owner-toast-icon" aria-hidden="true">
            {toast.type === 'success' ? '✓' : '!'}
          </span>
          <div className="owner-toast-body">
            <p>{toast.text}</p>
          </div>
          <button
            type="button"
            className="owner-toast-close"
            onClick={() => setToast(null)}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="owner-page-inner owner-profile-page">
        <header className="owner-profile-header">
          <div>
            <p className="owner-profile-eyebrow">Hồ sơ chủ ngựa</p>
            <h1>Thông tin chủ ngựa</h1>
            <p className="owner-profile-subtitle">
              Quản lý tài khoản, ngựa sở hữu và thông tin liên hệ giải đấu
            </p>
          </div>
          <div className="owner-profile-header__actions">
            <Link to="/horse-owner" className="op-back-link">
              <ArrowLeft size={14} /> Về trang chủ
            </Link>
            <button
              type="button"
              className="ho-btn ho-btn--ghost"
              onClick={() => {
                loadProfile()
                loadHorses()
              }}
              disabled={loading || loadingHorses}
            >
              <RefreshCcw size={14} /> {loading ? 'Đang tải…' : 'Làm mới'}
            </button>
          </div>
        </header>

        {error ? (
          <div className="ho-alert ho-alert--error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button type="button" className="ho-btn ho-btn--ghost" onClick={loadProfile}>
              <RefreshCcw size={12} /> Thử lại
            </button>
          </div>
        ) : null}

        {loading && !user ? (
          <ProfileSkeleton />
        ) : user ? (
          <>
            <OwnerHeroCard user={user} />

            <div className="owner-profile-grid">
              <OwnerAccountCard user={user} editable onSave={handleSaveProfile} saving={saving} />
              <OwnerInfoCard owner={user} stats={ownerStats} loading={loadingHorses} />
            </div>

            <div className="owner-profile-grid">
              <OwnerWalletCard wallet={null} loading={false} />
            </div>

            {/* FLOW 6: vi phạm của tôi — dành cho horse owner nếu stable bị phạt */}
            <section className="op-card">
              <MyViolationsList />
            </section>

            {errorHorses ? (
              <div className="ho-alert ho-alert--error" role="alert">
                <AlertCircle size={16} />
                <span>{errorHorses}</span>
                <button type="button" className="ho-btn ho-btn--ghost" onClick={loadHorses}>
                  <RefreshCcw size={12} /> Thử lại
                </button>
              </div>
            ) : null}

            {user.bio ? (
              <section className="op-card">
                <header className="op-card__head">
                  <div>
                    <h3>Giới thiệu</h3>
                    <p>Mô tả ngắn về bản thân / trang trại</p>
                  </div>
                </header>
                <p className="op-bio">{user.bio}</p>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="owner-profile-skeleton">
      <Skeleton className="owner-profile-skeleton__hero" />
      <div className="owner-profile-grid">
        <Skeleton className="owner-profile-skeleton__card" />
        <Skeleton className="owner-profile-skeleton__card" />
      </div>
    </div>
  )
}