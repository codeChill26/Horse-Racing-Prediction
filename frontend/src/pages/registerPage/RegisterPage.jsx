import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../../api/auth'
import { getAccessToken, getHomePathForRole, getStoredAuthRole } from '../../utils/token'
import './RegisterPage.css'

const PUBLIC_ROLES = [
  {
    code: 'SPECTATOR',
    title: 'Khán giả',
    description: 'Xem giải, dự đoán kết quả và nhận thưởng điểm.',
    icon: '◎',
  },
  {
    code: 'HORSE_OWNER',
    title: 'Chủ ngựa',
    description: 'Đăng ký ngựa, thuê jockey và quản lý lịch thi đấu.',
    icon: '♞',
  },
  {
    code: 'JOCKEY',
    title: 'Kỵ sĩ',
    description: 'Nhận lời mời, xác nhận tham gia và theo dõi thành tích.',
    icon: '⚑',
  },
]

const INITIAL_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  phoneNumber: '',
  roleCode: 'SPECTATOR',
  licenseNumber: '',
  weight: '',
  bio: '',
}

function validateClient(form) {
  if (!form.email?.includes('@')) return 'Email không hợp lệ.'
  if (!form.password || form.password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.'
  if (form.password !== form.confirmPassword) return 'Mật khẩu xác nhận không khớp.'
  if (!form.fullName?.trim()) return 'Họ tên là bắt buộc.'
  if (!form.phoneNumber?.trim()) return 'Số điện thoại là bắt buộc.'
  if (!PUBLIC_ROLES.some((r) => r.code === form.roleCode)) return 'Vai trò không hợp lệ.'

  if (form.roleCode === 'JOCKEY') {
    if (!form.licenseNumber?.trim()) return 'Số chứng chỉ hành nghề là bắt buộc với Kỵ sĩ.'
    const w = parseFloat(form.weight)
    if (Number.isNaN(w) || w <= 0) return 'Cân nặng phải là số dương hợp lệ.'
  }

  return null
}

function buildPayload(form) {
  const payload = {
    email: form.email.trim(),
    password: form.password,
    fullName: form.fullName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    roleCode: form.roleCode,
  }

  if (form.roleCode === 'JOCKEY') {
    payload.licenseNumber = form.licenseNumber.trim()
    payload.weight = parseFloat(form.weight)
    if (form.bio?.trim()) payload.bio = form.bio.trim()
  }

  return payload
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    const home = getHomePathForRole(getStoredAuthRole())
    if (getAccessToken() && home) {
      navigate(home, { replace: true })
    }
  }, [navigate])

  const isJockey = form.roleCode === 'JOCKEY'
  const selectedRole = useMemo(
    () => PUBLIC_ROLES.find((r) => r.code === form.roleCode),
    [form.roleCode],
  )

  const setField = (name, value) => {
    setError('')
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(null)

    const clientError = validateClient(form)
    if (clientError) {
      setError(clientError)
      return
    }

    setSubmitting(true)
    try {
      const user = await registerUser(buildPayload(form))
      setSuccess(user)
      setForm(INITIAL_FORM)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="register-page">
      <aside className="register-hero" aria-hidden="true">
        <div className="register-hero-inner">
          <p className="register-eyebrow">Horse Racing Prediction</p>
          <h1 className="register-hero-title">Đăng ký tham gia hệ thống đua ngựa</h1>
          <p className="register-hero-text">
            Một tài khoản — nhiều vai trò trong hệ sinh thái: từ khán giả dự đoán đến chủ ngựa và
            kỵ sĩ chuyên nghiệp.
          </p>
          <ul className="register-hero-list">
            <li>Lịch thi đấu & kết quả trực tiếp</li>
            <li>Quản lý ngựa, jockey và giải đấu</li>
            <li>Bảo mật JWT & xác thực email</li>
          </ul>
        </div>
        <div className="register-hero-pattern" />
      </aside>

      <section className="register-panel">
        <header className="register-panel-header">
          <div>
            <h2>Tạo tài khoản mới</h2>
            <p>Điền thông tin bên dưới để đăng ký. Trọng tài và Admin do hệ thống cấp quyền.</p>
          </div>
          <div className="register-panel-links">
            <Link className="register-link-quiet" to="/login">
              Đăng nhập
            </Link>
            <Link className="register-link-quiet" to="/admin">
              Quản trị
            </Link>
          </div>
        </header>

        {success ? (
          <div className="register-alert register-alert--success" role="status">
            <strong>Đăng ký thành công!</strong>
            <p>
              Chào <span className="register-highlight">{success.fullName}</span> — email{' '}
              <span className="register-highlight">{success.email}</span>. Bạn có thể đăng nhập ngay.
            </p>
            <div className="register-success-actions">
              <Link
                className="register-btn register-btn--primary"
                to="/login"
                state={{ email: success.email }}
                style={{ textDecoration: 'none', textAlign: 'center' }}
              >
                Đăng nhập ngay
              </Link>
              <button
                type="button"
                className="register-btn register-btn--ghost"
                onClick={() => setSuccess(null)}
              >
                Đăng ký tài khoản khác
              </button>
            </div>
          </div>
        ) : (
          <form className="register-form" onSubmit={onSubmit} noValidate>
            <fieldset className="register-fieldset">
              <legend>Vai trò tham gia</legend>
              <div className="register-role-grid">
                {PUBLIC_ROLES.map((role) => (
                  <label
                    key={role.code}
                    className={`register-role-card${form.roleCode === role.code ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="roleCode"
                      value={role.code}
                      checked={form.roleCode === role.code}
                      onChange={() => setField('roleCode', role.code)}
                    />
                    <span className="register-role-icon" aria-hidden="true">
                      {role.icon}
                    </span>
                    <span className="register-role-title">{role.title}</span>
                    <span className="register-role-desc">{role.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="register-grid">
              <label className="register-field register-field--full">
                <span>Họ và tên</span>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  required
                />
              </label>

              <label className="register-field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  required
                />
              </label>

              <label className="register-field">
                <span>Số điện thoại</span>
                <input
                  type="tel"
                  name="phoneNumber"
                  autoComplete="tel"
                  placeholder="0900000000"
                  value={form.phoneNumber}
                  onChange={(e) => setField('phoneNumber', e.target.value)}
                  required
                />
              </label>

              <label className="register-field">
                <span>Mật khẩu</span>
                <div className="register-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    placeholder="Tối thiểu 8 ký tự"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="register-toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              </label>

              <label className="register-field">
                <span>Xác nhận mật khẩu</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Nhập lại mật khẩu"
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  required
                />
              </label>
            </div>

            {isJockey ? (
              <fieldset className="register-fieldset register-fieldset--jockey">
                <legend>Hồ sơ Kỵ sĩ — {selectedRole?.title}</legend>
                <div className="register-grid">
                  <label className="register-field">
                    <span>Số chứng chỉ hành nghề</span>
                    <input
                      type="text"
                      name="licenseNumber"
                      placeholder="VD: JKY-2024-001"
                      value={form.licenseNumber}
                      onChange={(e) => setField('licenseNumber', e.target.value)}
                      required={isJockey}
                    />
                  </label>

                  <label className="register-field">
                    <span>Cân nặng (kg)</span>
                    <input
                      type="number"
                      name="weight"
                      min="1"
                      step="0.1"
                      placeholder="53"
                      value={form.weight}
                      onChange={(e) => setField('weight', e.target.value)}
                      required={isJockey}
                    />
                  </label>

                  <label className="register-field register-field--full">
                    <span>Tiểu sử / kinh nghiệm (tùy chọn)</span>
                    <textarea
                      name="bio"
                      rows={3}
                      placeholder="Mô tả ngắn về kinh nghiệm thi đấu..."
                      value={form.bio}
                      onChange={(e) => setField('bio', e.target.value)}
                    />
                  </label>
                </div>
              </fieldset>
            ) : null}

            {error ? (
              <div className="register-alert register-alert--error" role="alert">
                {error}
              </div>
            ) : null}

            <div className="register-actions">
              <button className="register-btn register-btn--primary" type="submit" disabled={submitting}>
                {submitting ? 'Đang đăng ký…' : 'Đăng ký tài khoản'}
              </button>
              <p className="register-footnote">
                Bằng việc đăng ký, bạn đồng ý với quy định sử dụng hệ thống đua ngựa. Khán giả nhận{' '}
                <strong>100 điểm</strong> khởi tạo.
              </p>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
