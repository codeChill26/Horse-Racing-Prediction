import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../../api/auth';
import { Mail, ArrowLeft, Loader2, Lock } from 'lucide-react';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(() => location.state?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.includes('@')) {
      setError('Email không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const goToReset = () => {
    navigate('/reset-password', { state: { email: email.trim() } });
  };

  const resendOtp = async () => {
    setError('');
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
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
            Quên Mật Khẩu
          </p>
          <p className="text-xs text-on-surface-variant mt-1.5 font-medium uppercase tracking-widest text-primary/80">
            Khôi Phục Quyền Truy Cập
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card w-full rounded-xl p-6 sm:p-8 md:p-10 flex flex-col gap-6">
          {error && sent ? (
            <div className="text-xs bg-error/15 border border-error/30 text-error rounded-lg p-3 font-semibold">
              {error}
            </div>
          ) : null}

          {sent ? (
            <div className="flex flex-col gap-4">
              <div className="text-sm bg-primary/10 border border-primary/30 text-primary rounded-lg p-4 font-semibold text-center">
                Đã gửi mã OTP thành công!
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Mã OTP đã được gửi đến email <span className="text-secondary font-semibold">{email.trim()}</span> (kiểm tra cả thư mục Spam). Mã có hiệu lực trong 10 phút.
              </p>
              
              <button
                type="button"
                className="w-full bg-secondary text-on-secondary/95 py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:brightness-110 active:scale-[0.98] transition-all duration-200 mt-2 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 cursor-pointer"
                onClick={goToReset}
              >
                Nhập mã OTP & Đặt mật khẩu mới
              </button>

              <button
                type="button"
                disabled={submitting}
                className="w-full py-3 border border-outline-variant/30 text-xs tracking-wider uppercase font-semibold rounded-lg hover:bg-surface-variant transition-all active:scale-[0.98] cursor-pointer text-on-surface bg-transparent mt-1"
                onClick={resendOtp}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
                    Đang gửi lại...
                  </>
                ) : (
                  <>Gửi lại mã OTP</>
                )}
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
                  Email đăng ký
                </label>
                <div className="relative group input-focus-gold transition-all duration-250 border border-outline-variant/30 rounded-lg bg-surface-container flex items-center px-3">
                  <Mail className="w-5 h-5 text-on-surface-variant/70 mr-3 shrink-0" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
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

              {/* Send Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-secondary text-on-secondary/95 py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:brightness-110 active:scale-[0.98] transition-all duration-200 mt-2 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-secondary" />
                    Đang Gửi...
                  </>
                ) : (
                  <>Gửi mã OTP qua email</>
                )}
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div className="text-center pt-2 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">
              Tạo tài khoản mới?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-secondary font-bold hover:underline cursor-pointer bg-transparent border-none"
              >
                Đăng ký ngay
              </button>
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
