import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../api/auth';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import './LoginPage.css';

function validateForm({ email, otpCode, newPassword, confirmPassword }) {
  if (!email?.includes('@')) return 'Email không hợp lệ.';
  if (!otpCode || otpCode.length !== 6) return 'Mã OTP phải đúng 6 chữ số.';
  if (!/^\d{6}$/.test(otpCode)) return 'Mã OTP chỉ gồm số.';
  if (!newPassword || newPassword.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  if (newPassword !== confirmPassword) return 'Mật khẩu xác nhận không khớp.';
  return null;
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(() => location.state?.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const onOtpChange = (value) => {
    setError('');
    setOtpCode(value.replace(/\D/g, '').slice(0, 6));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const clientError = validateForm({ email, otpCode, newPassword, confirmPassword });
    if (clientError) {
      setError(clientError);
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({
        email: email.trim(),
        otpCode,
        newPassword,
        confirmPassword,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-6 sm:p-12 background-glow min-h-[calc(100vh-160px)] relative">
      {/* Auth Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-secondary/15 blur-[120px]" />
      </div>

      <main className="w-full max-w-[440px] flex flex-col items-center relative z-10">
        {/* Brand Identity */}
        <div className="mb-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="font-serif text-4xl text-primary font-bold tracking-tight mb-2 hover:opacity-90 active:scale-98 transition-all bg-transparent border-none cursor-pointer"
          >
            GrandStride
          </button>
          <p className="font-serif text-2xl text-on-surface font-semibold tracking-wide">
            Đặt Lại Mật Khẩu
          </p>
          <p className="text-xs text-on-surface-variant mt-1.5 font-medium uppercase tracking-widest text-primary/80">
            Xác Minh OTP & Khôi Phục
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card w-full rounded-xl p-6 sm:p-8 md:p-10 flex flex-col gap-6">
          {done ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="text-sm bg-primary/10 border border-primary/30 text-primary rounded-lg p-4 font-semibold">
                Đổi mật khẩu thành công!
              </div>
              <p className="text-xs text-on-surface-variant">
                Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
              </p>
              <button
                type="button"
                className="w-full bg-secondary text-on-secondary/95 py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:brightness-110 active:scale-[0.98] transition-all duration-200 mt-2 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 cursor-pointer"
                onClick={() => navigate('/login', { state: { email: email.trim() } })}
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : (
            <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
              {error ? (
                <div className="text-xs bg-error/15 border border-error/30 text-error rounded-lg p-3 font-semibold">
                  {error}
                </div>
              ) : null}

              {/* Email Field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant" htmlFor="email">
                  Địa chỉ Email
                </label>
                <div className="relative group input-focus-gold transition-all duration-250 border border-outline-variant/30 rounded-lg bg-surface-container flex items-center px-3">
                  <Mail className="w-5 h-5 text-on-surface-variant/70 mr-3 shrink-0" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => {
                      setError('');
                      setEmail(e.target.value);
                    }}
                    placeholder="champion@grandstride.com"
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3 text-sm placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              {/* OTP Field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant" htmlFor="otpCode">
                  Mã xác minh OTP (6 chữ số)
                </label>
                <div className="relative group input-focus-gold transition-all duration-250 border border-outline-variant/30 rounded-lg bg-surface-container flex items-center px-3">
                  <Lock className="w-5 h-5 text-on-surface-variant/70 mr-3 shrink-0" />
                  <input
                    id="otpCode"
                    type="text"
                    name="otpCode"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => onOtpChange(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3 text-sm placeholder:text-on-surface-variant/30 font-mono tracking-widest"
                  />
                </div>
              </div>

              {/* New Password Field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant" htmlFor="newPassword">
                  Mật khẩu mới (tối thiểu 8 ký tự)
                </label>
                <div className="relative group input-focus-gold transition-all duration-250 border border-outline-variant/30 rounded-lg bg-surface-container flex items-center px-3">
                  <Lock className="w-5 h-5 text-on-surface-variant/70 mr-3 shrink-0" />
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    name="newPassword"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setError('');
                      setNewPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3 text-sm placeholder:text-on-surface-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none text-on-surface-variant/70 hover:text-secondary p-1 bg-transparent border-none cursor-pointer"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant" htmlFor="confirmPassword">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative group input-focus-gold transition-all duration-250 border border-outline-variant/30 rounded-lg bg-surface-container flex items-center px-3">
                  <Lock className="w-5 h-5 text-on-surface-variant/70 mr-3 shrink-0" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setError('');
                      setConfirmPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    required
                    className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3 text-sm placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-secondary text-on-secondary/95 py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:brightness-110 active:scale-[0.98] transition-all duration-200 mt-2 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-secondary" />
                    Đang Đặt Lại...
                  </>
                ) : (
                  <>Đặt lại mật khẩu</>
                )}
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div className="text-center pt-2 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">
              Không nhận được mã?{' '}
              <Link
                to="/forgot-password"
                state={{ email: email.trim() }}
                className="text-secondary font-bold hover:underline"
              >
                Gửi lại mã OTP
              </Link>
            </p>
          </div>
        </div>

        {/* Atmospheric Back-to-login */}
        <button
          onClick={() => navigate('/login')}
          className="mt-6 flex items-center gap-2 text-on-surface-variant/70 hover:text-primary transition-colors duration-300 cursor-pointer bg-transparent border-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] uppercase font-semibold tracking-wider">Quay lại đăng nhập</span>
        </button>
      </main>
    </div>
  );
}
