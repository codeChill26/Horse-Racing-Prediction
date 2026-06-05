import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { loginUser } from '../../api/auth'
import {
  getAccessToken,
  getHomePathForRole,
  getStoredAuthRole,
  parseJwtPayload,
  setAuthTokens,
} from '../../utils/token'
import './LoginPage.css'

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  RACE_REFEREE: 'Trọng tài',
  HORSE_OWNER: 'Chủ ngựa',
  JOCKEY: 'Kỵ sĩ',
  SPECTATOR: 'Khán giả',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => location.state?.email || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [otherRoleSuccess, setOtherRoleSuccess] = useState(null)

  useEffect(() => {
    const home = getHomePathForRole(getStoredAuthRole())
    if (getAccessToken() && home) {
      navigate(home, { replace: true })
    }
  }, [navigate])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOtherRoleSuccess(null)

    if (!email.includes('@')) {
      setError('Email không hợp lệ.')
      return
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.')
      return
    }

    setSubmitting(true)
    try {
      const data = await loginUser({ email: email.trim(), password })
      const { accessToken, refreshToken } = data

      setAuthTokens({ accessToken, refreshToken, remember })

      const role = getStoredAuthRole()
      const home = getHomePathForRole(role)

      if (home) {
        navigate(home, { replace: true, state: { loginSuccess: true } })
        return
      }

      const payload = parseJwtPayload(accessToken)
      setOtherRoleSuccess({
        email: payload?.email || email.trim(),
        roleLabel: ROLE_LABELS[role] || role,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-visual">
        <img
          className="login-visual-img"
          src="/images/horse-racing-hero.jpg"
          alt="Ngựa đua trên đường đua"
          loading="eager"
        />
        <div className="login-visual-overlay" />
        <div className="login-visual-content">
          <p className="login-eyebrow">Horse Racing Prediction</p>
          <h1>Giải đua ngựa chuyên nghiệp</h1>
          <p>
            Theo dõi lịch thi đấu, dự đoán kết quả và quản lý hệ sinh thái đua ngựa trên một nền tảng
            thống nhất.
          </p>
          <ul className="login-visual-stats">
            <li>
              <strong>24/7</strong>
              <span>Cập nhật kết quả</span>
            </li>
            <li>
              <strong>5</strong>
              <span>Vai trò người dùng</span>
            </li>
            <li>
              <strong>100+</strong>
              <span>Điểm thưởng khán giả</span>
            </li>
          </ul>
        </div>
      </aside>

      <section className="login-panel">
        <header className="login-panel-header">
          <div className="login-brand-mark" aria-hidden="true">
            ♞
          </div>
          <div>
            <h2>Đăng nhập</h2>
            <p>Chào mừng trở lại — nhập tài khoản để tiếp tục.</p>
          </div>
        </header>

        {otherRoleSuccess ? (
          <div className="login-alert login-alert--success" role="status">
            <strong>Đăng nhập thành công!</strong>
            <p>
              Tài khoản <span className="login-highlight">{otherRoleSuccess.email}</span> — vai trò{' '}
              <span className="login-highlight">{otherRoleSuccess.roleLabel}</span>.
            </p>
            <p className="login-success-note">Trang chủ cho vai trò này sẽ được bổ sung sau.</p>
            <button
              type="button"
              className="login-btn login-btn--ghost"
              onClick={() => {
                setOtherRoleSuccess(null)
                setPassword('')
              }}
            >
              Đăng nhập tài khoản khác
            </button>
          </div>
        ) : (
        <form className="login-form" onSubmit={onSubmit} noValidate>
          <label className="login-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => {
                setError('')
                setEmail(e.target.value)
              }}
              required
            />
          </label>

          <label className="login-field">
            <span>Mật khẩu</span>
            <div className="login-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setError('')
                  setPassword(e.target.value)
                }}
                required
              />
              <button
                type="button"
                className="login-toggle-pw"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </label>

          <div className="login-form-row">
            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link className="login-forgot-link" to="/forgot-password" state={{ email: email.trim() }}>
              Quên mật khẩu?
            </Link>
          </div>

          {error ? (
            <div className="login-alert login-alert--error" role="alert">
              {error}
            </div>
          ) : null}

          <button className="login-btn login-btn--primary" type="submit" disabled={submitting}>
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
        )}

        <footer className="login-footer">
          <p>
            Chưa có tài khoản?{' '}
            <Link className="login-link" to="/register">
              Đăng ký ngay
            </Link>
          </p>
          <Link className="login-link-quiet" to="/admin">
            Khu vực quản trị
          </Link>
        </footer>
      </section>
    </div>
  )
}
