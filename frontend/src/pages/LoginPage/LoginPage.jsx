import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginUser } from '../../api/auth';
import {
  getAccessToken,
  getHomePathForRole,
  getStoredAuthRole,
  parseJwtPayload,
  setAuthTokens,
} from '../../utils/token';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import './LoginPage.css';

const ROLE_LABELS = {
  ADMIN: 'Quản trị viên',
  RACE_REFEREE: 'Trọng tài',
  HORSE_OWNER: 'Chủ ngựa',
  JOCKEY: 'Kỵ sĩ',
  SPECTATOR: 'Khán giả',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(() => location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [otherRoleSuccess, setOtherRoleSuccess] = useState(null);

  useEffect(() => {
    const home = getHomePathForRole(getStoredAuthRole());
    if (getAccessToken() && home) {
      navigate(home, { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOtherRoleSuccess(null);

    if (!email.includes('@')) {
      setError('Email không hợp lệ.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await loginUser({ email: email.trim(), password });
      const { accessToken, refreshToken } = data;

      setAuthTokens({ accessToken, refreshToken, remember });

      const role = getStoredAuthRole();
      const home = getHomePathForRole(role);

      if (home) {
        navigate(home, { replace: true, state: { loginSuccess: true } });
        return;
      }

      const payload = parseJwtPayload(accessToken);
      setOtherRoleSuccess({
        email: payload?.email || email.trim(),
        roleLabel: ROLE_LABELS[role] || role,
      });
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
        </div>

        {/* Login Card */}
        <div className="login-card w-full rounded-xl p-6 sm:p-8 md:p-10 flex flex-col gap-6">
          {otherRoleSuccess ? (
            <div className="flex flex-col gap-4 text-center">
              <div className="text-sm bg-primary/10 border border-primary/30 text-primary rounded-lg p-4 font-semibold">
                Đăng nhập thành công!
              </div>
              <p className="text-xs text-on-surface-variant">
                Tài khoản <span className="text-secondary font-semibold">{otherRoleSuccess.email}</span> — vai trò{' '}
                <span className="text-secondary font-semibold">{otherRoleSuccess.roleLabel}</span>.
              </p>
              <p className="text-xs text-on-surface-variant/80 italic">
                Trang chủ cho vai trò này sẽ được bổ sung sau.
              </p>
              <button
                type="button"
                className="w-full py-3 border border-outline-variant/30 text-xs tracking-wider uppercase font-semibold rounded-lg hover:bg-surface-variant transition-all active:scale-[0.98] cursor-pointer mt-2 text-on-surface bg-transparent"
                onClick={() => {
                  setOtherRoleSuccess(null);
                  setPassword('');
                }}
              >
                Đăng nhập tài khoản khác
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

              {/* Password Field */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant" htmlFor="password">
                    Mật khẩu
                  </label>
                  <Link
                    to="/forgot-password"
                    state={{ email: email.trim() }}
                    className="text-xs font-medium text-secondary hover:underline transition-all"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative group input-focus-gold transition-all duration-250 border border-outline-variant/30 rounded-lg bg-surface-container flex items-center px-3">
                  <Lock className="w-5 h-5 text-on-surface-variant/70 mr-3 shrink-0" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setError('');
                      setPassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    required
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

              {/* Remember Login Row */}
              <div className="flex items-center gap-2 py-1">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-outline-variant/30 text-secondary bg-surface-container focus:ring-secondary/50 w-4 h-4 accent-secondary cursor-pointer"
                />
                <label htmlFor="remember" className="text-xs text-on-surface-variant cursor-pointer select-none font-semibold uppercase tracking-wider">
                  Ghi nhớ đăng nhập
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-secondary text-on-secondary/95 py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:brightness-110 active:scale-[0.98] transition-all duration-200 mt-2 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-on-secondary" />
                    Đang Xác Thực...
                  </>
                ) : (
                  <>Đăng Nhập</>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="h-[1px] bg-outline-variant/30 flex-grow" />
            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest">hoặc</span>
            <div className="h-[1px] bg-outline-variant/30 flex-grow" />
          </div>

          {/* Social login option */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => alert("Tính năng Đăng nhập bằng Google sẽ sớm được ra mắt!")}
              className="w-full flex items-center justify-center gap-3 py-3 border border-outline-variant/30 text-xs tracking-wider uppercase font-semibold rounded-lg hover:bg-surface-variant transition-all active:scale-[0.98] cursor-pointer text-on-surface bg-transparent"
            >
              <img
                alt="Google Logo"
                className="w-4 h-4"
                referrerPolicy="no-referrer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnbYEIzlBsD6ZcJ5k0OmdBe0PgtRVvXoVSf85wFf6a1qwcCvIBNTmZxwgUaT2SllHSsp6a3d62xELx6M24yKVuZTaOFNnYjbyZEYHmuHZq27hzrdcF4Huui3BHOWm_oA65cvI_8hSK8FcVjlpiFV5199--gQCtMnw6t1MlhIJhbEwzI9vf0ayM_Rj6vBOCVlfGHDKsSqwbKYD8pLv5yjlV0Rq_P9JpCGp5Bg867r5LU5T3gtmWJ-19bWSOCyvCvoUQAM1aCkMa_-v6"
              />
              Tiếp tục với Google
            </button>
          </div>

          {/* Footer Link */}
          <div className="text-center pt-2 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">
              Chưa có tài khoản?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-secondary font-bold hover:underline cursor-pointer bg-transparent border-none"
              >
                Đăng ký ngay
              </button>
            </p>
          </div>
        </div>

        {/* quay về trang chủ */}
        <button
          onClick={() => navigate('/')}
          className="mt-6 flex items-center gap-2 text-on-surface-variant/70 hover:text-primary transition-colors duration-300 cursor-pointer bg-transparent border-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] uppercase font-semibold tracking-wider">Quay về trang chủ GrandStride</span>
        </button>
      </main>
    </div>
  );
}
