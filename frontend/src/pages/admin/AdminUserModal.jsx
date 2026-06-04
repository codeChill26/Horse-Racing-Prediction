import { useEffect, useState } from 'react'
import {
  changeAdminUserRole,
  createAdminUser,
  getAdminUserById,
  updateAdminUser,
} from '../../api/admin'

const ROLE_CODES = ['ADMIN', 'RACE_REFEREE', 'HORSE_OWNER', 'JOCKEY', 'SPECTATOR']

const EMPTY_CREATE = {
  email: '',
  password: '',
  fullName: '',
  phoneNumber: '',
  roleCode: 'SPECTATOR',
  licenseNumber: '',
  weight: '',
  bio: '',
}

export default function AdminUserModal({ mode, userId, onClose, onSaved }) {
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'

  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_CREATE)
  const [roleCode, setRoleCode] = useState('SPECTATOR')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!isEdit || !userId) return

    let cancelled = false
    setLoading(true)
    setError('')

    getAdminUserById(userId)
      .then((user) => {
        if (cancelled) return
        setForm({
          email: user.email || '',
          password: '',
          fullName: user.fullName || '',
          phoneNumber: user.phoneNumber || '',
          roleCode: user.role?.code || 'SPECTATOR',
          licenseNumber: user.licenseNumber || '',
          weight: user.weight != null ? String(user.weight) : '',
          bio: user.bio || '',
        })
        setRoleCode(user.role?.code || 'SPECTATOR')
        setIsActive(!!user.isActive)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isEdit, userId])

  const setField = (name, value) => {
    setError('')
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (isCreate) {
        const payload = {
          email: form.email.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          roleCode: form.roleCode,
        }
        if (form.phoneNumber?.trim()) payload.phoneNumber = form.phoneNumber.trim()
        if (form.licenseNumber?.trim()) payload.licenseNumber = form.licenseNumber.trim()
        if (form.weight) payload.weight = parseFloat(form.weight)
        if (form.bio?.trim()) payload.bio = form.bio.trim()

        const user = await createAdminUser(payload)
        onSaved(user)
        onClose()
        return
      }

      if (isEdit && userId) {
        const payload = {}
        if (form.fullName.trim()) payload.fullName = form.fullName.trim()
        if (form.phoneNumber !== undefined) payload.phoneNumber = form.phoneNumber.trim() || null
        if (form.licenseNumber !== undefined) payload.licenseNumber = form.licenseNumber.trim() || null
        if (form.bio !== undefined) payload.bio = form.bio.trim() || null
        if (form.weight) payload.weight = parseFloat(form.weight)
        if (form.password?.length >= 8) payload.password = form.password

        let user = null
        const hasProfileUpdates = Object.keys(payload).length > 0

        if (hasProfileUpdates) {
          user = await updateAdminUser(userId, payload)
        }

        if (roleCode !== form.roleCode && roleCode) {
          user = await changeAdminUserRole(userId, roleCode)
        }

        if (!user && !hasProfileUpdates && roleCode === form.roleCode) {
          setError('Không có thay đổi nào để lưu.')
          return
        }

        onSaved(user || { userId, ...form, role: { code: roleCode } })
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const title = isCreate ? 'Tạo người dùng mới' : isEdit ? `Chỉnh sửa #${userId}` : 'Chi tiết người dùng'

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-header">
          <h2 id="admin-modal-title">{title}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </header>

        {loading ? (
          <p className="admin-modal-loading">Đang tải…</p>
        ) : (
          <form className="admin-modal-form" onSubmit={onSubmit}>
            {isCreate ? (
              <label className="admin-modal-field">
                <span>Email *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  required
                />
              </label>
            ) : (
              <div className="admin-modal-field">
                <span>Email</span>
                <p className="admin-modal-readonly">{form.email}</p>
              </div>
            )}

            <label className="admin-modal-field">
              <span>{isCreate ? 'Mật khẩu *' : 'Mật khẩu mới (tùy chọn)'}</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                required={isCreate}
                minLength={isCreate ? 8 : undefined}
                placeholder={isCreate ? 'Tối thiểu 8 ký tự' : 'Để trống nếu không đổi'}
              />
            </label>

            <label className="admin-modal-field">
              <span>Họ tên *</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setField('fullName', e.target.value)}
                required
              />
            </label>

            <label className="admin-modal-field">
              <span>Số điện thoại</span>
              <input
                type="text"
                value={form.phoneNumber}
                onChange={(e) => setField('phoneNumber', e.target.value)}
              />
            </label>

            <label className="admin-modal-field">
              <span>Vai trò</span>
              <select
                value={isEdit ? roleCode : form.roleCode}
                onChange={(e) => {
                  setError('')
                  if (isEdit) setRoleCode(e.target.value)
                  else setField('roleCode', e.target.value)
                }}
              >
                {ROLE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>

            {isEdit ? (
              <div className="admin-modal-field">
                <span>Trạng thái</span>
                <p className={`admin-status-pill${isActive ? ' is-on' : ' is-off'}`}>
                  {isActive ? 'Đang hoạt động' : 'Đã vô hiệu'}
                </p>
                <p className="admin-modal-hint">Dùng nút Khóa/Mở trên bảng để đổi isActive.</p>
              </div>
            ) : null}

            <label className="admin-modal-field">
              <span>Chứng chỉ (Kỵ sĩ)</span>
              <input
                type="text"
                value={form.licenseNumber}
                onChange={(e) => setField('licenseNumber', e.target.value)}
              />
            </label>

            <label className="admin-modal-field">
              <span>Cân nặng (kg)</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.weight}
                onChange={(e) => setField('weight', e.target.value)}
              />
            </label>

            <label className="admin-modal-field admin-modal-field--full">
              <span>Tiểu sử</span>
              <textarea rows={3} value={form.bio} onChange={(e) => setField('bio', e.target.value)} />
            </label>

            {error ? (
              <div className="admin-modal-error" role="alert">
                {error}
              </div>
            ) : null}

            <footer className="admin-modal-footer">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
                Hủy
              </button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? 'Đang lưu…' : isCreate ? 'Tạo người dùng' : 'Lưu thay đổi'}
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}
