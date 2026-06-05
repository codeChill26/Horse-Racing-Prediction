import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { resetPassword } from '../../api/auth'
import './LoginPage.css'

function validateForm({ email, otpCode, newPassword, confirmPassword }) {
  if (!email?.includes('@')) return 'Email không hợp lệ.'
  if (!otpCode || otpCode.length !== 6) return 'Mã OTP phải đúng 6 chữ số.'
  if (!/^\d{6}$/.test(otpCode)) return 'Mã OTP chỉ gồm số.'
  if (!newPassword || newPassword.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự.'
  if (newPassword !== confirmPassword) return 'Mật khẩu xác nhận không khớp.'
  return null
}

export default function ResetPasswordPage() {
  const location = useLocation()
  const [email, setEmail] = useState(() => location.state?.email || '')
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const onOtpChange = (value) => {
    setError('')
    setOtpCode(value.replace(/\D/g, '').slice(0, 6))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const clientError = validateForm({ email, otpCode, newPassword, confirmPassword })
    if (clientError) {
      setError(clientError)
      return
    }

    setSubmitting(true)
    try {
      await resetPassword({
        email: email.trim(),
        otpCode,
        newPassword,
        confirmPassword,
      })
      setDone(true)
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
          <p className="login-eyebrow">Xác minh OTP</p>
          <h1>Đặt mật khẩu mới</h1>
          <p>Nhập mã 6 số từ email và mật khẩu mới (tối thiểu 8 ký tự).</p>
        </div>
      </aside>

      <section className="login-panel">
        <header className="login-panel-header">
          <div className="login-brand-mark" aria-hidden="true">
            ✉
          </div>
          <div>
            <h2>Đổi mật khẩu</h2>
            <p>Mã OTP từ Gmail · hiệu lực 10 phút</p>
          </div>
        </header>

        {done ? (
          <div className="login-alert login-alert--success" role="status">
            <strong>Đổi mật khẩu thành công!</strong>
            <p>Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.</p>
            <Link className="login-btn login-btn--primary" to="/login" state={{ email: email.trim() }}>
              Đăng nhập
            </Link>
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
              <span>Mã OTP (6 số)</span>
              <input
                type="text"
                name="otpCode"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="login-otp-input"
                value={otpCode}
                onChange={(e) => onOtpChange(e.target.value)}
                maxLength={6}
                required
              />
            </label>

            <label className="login-field">
              <span>Mật khẩu mới</span>
              <div className="login-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  autoComplete="new-password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={newPassword}
                  onChange={(e) => {
                    setError('')
                    setNewPassword(e.target.value)
                  }}
                  required
                  minLength={8}
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

            <label className="login-field">
              <span>Xác nhận mật khẩu mới</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => {
                  setError('')
                  setConfirmPassword(e.target.value)
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
              {submitting ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <footer className="login-footer">
          <Link className="login-link" to="/forgot-password" state={{ email: email.trim() }}>
            Gửi lại mã OTP
          </Link>
          <Link className="login-link-quiet" to="/login">
            ← Đăng nhập
          </Link>
        </footer>
      </section>
    </div>
  )
}
