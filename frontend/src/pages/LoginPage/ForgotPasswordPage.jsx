import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { forgotPassword } from '../../api/auth'
import './LoginPage.css'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => location.state?.email || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.includes('@')) {
      setError('Email không hợp lệ.')
      return
    }

    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const goToReset = () => {
    navigate('/reset-password', { state: { email: email.trim() } })
  }

  const resendOtp = async () => {
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSent(true)
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
          <p className="login-eyebrow">Bảo mật tài khoản</p>
          <h1>Khôi phục mật khẩu</h1>
          <p>
            Nhập email đã đăng ký. Hệ thống gửi mã OTP 6 số qua Gmail (hiệu lực 10 phút) để bạn đặt lại mật
            khẩu.
          </p>
        </div>
      </aside>

      <section className="login-panel">
        <header className="login-panel-header">
          <div className="login-brand-mark" aria-hidden="true">
            🔒
          </div>
          <div>
            <h2>Quên mật khẩu</h2>
            <p>Nhận mã xác minh qua email.</p>
          </div>
        </header>

        {error && sent ? (
          <div className="login-alert login-alert--error" role="alert">
            {error}
          </div>
        ) : null}

        {sent ? (
          <div className="login-alert login-alert--success" role="status">
            <strong>Đã gửi yêu cầu!</strong>
            <p>
              Nếu email <span className="login-highlight">{email.trim()}</span> tồn tại trong hệ thống, mã OTP
              đã được gửi tới hộp thư (kiểm tra cả thư mục Spam).
            </p>
            <p className="login-success-note">Mã có hiệu lực 10 phút.</p>
            <button type="button" className="login-btn login-btn--primary" onClick={goToReset}>
              Nhập mã OTP & đặt mật khẩu mới
            </button>
            <button
              type="button"
              className="login-btn login-btn--ghost"
              onClick={resendOtp}
              disabled={submitting}
            >
              {submitting ? 'Đang gửi lại…' : 'Gửi lại mã'}
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={onSubmit} noValidate>
            <label className="login-field">
              <span>Email đăng ký</span>
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

            {error ? (
              <div className="login-alert login-alert--error" role="alert">
                {error}
              </div>
            ) : null}

            <button className="login-btn login-btn--primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi…' : 'Gửi mã OTP qua email'}
            </button>
          </form>
        )}

        <footer className="login-footer">
          <Link className="login-link" to="/login">
            ← Quay lại đăng nhập
          </Link>
          <Link className="login-link-quiet" to="/register">
            Tạo tài khoản mới
          </Link>
        </footer>
      </section>
    </div>
  )
}
