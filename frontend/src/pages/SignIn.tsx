import React from "react";
import { PageType, User } from "../types";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";

interface SignInProps {
  onNavigate: (page: PageType) => void;
  onLoginSuccess: (user: User) => void;
}

export default function SignIn({ onNavigate, onLoginSuccess }: SignInProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    // Validations
    if (!email || !password) {
      setErrorMsg("Please fill in all details.");
      setIsLoading(false);
      return;
    }

    // Process a mock authentic registration login!
    setTimeout(() => {
      setIsLoading(false);
      // Give the user standard logged state
      const mockFullName = email
        .split("@")[0]
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      onLoginSuccess({
        fullName: mockFullName || "Grand Champion",
        email: email,
        role: "owner",
        points: 250, // Give them stable owner bonus points
      });

      onNavigate("dashboard");
    }, 1500);
  };

  return (
    <div className="flex-grow flex items-center justify-center p-6 sm:p-12 background-glow min-h-[calc(100vh-160px)]">
      {/* Auth Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-secondary/15 blur-[120px]" />
      </div>

      <main className="w-full max-w-[440px] flex flex-col items-center relative z-10">
        {/* Brand Identity */}
        <div className="mb-8 text-center">
          <button
            onClick={() => onNavigate("dashboard")}
            className="font-serif text-4xl text-primary font-bold tracking-tight mb-2 hover:opacity-90 active:scale-98 transition-all"
          >
            GrandStride
          </button>
          <p className="font-serif text-2xl text-on-surface font-semibold tracking-wide">
            Welcome Back
          </p>
          <p className="text-xs text-on-surface-variant mt-1.5 font-medium uppercase tracking-widest text-primary/80">
            Stable Management Suite
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card w-full rounded-xl p-6 sm:p-8 md:p-10 flex flex-col gap-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="text-xs bg-error/15 border border-error/30 text-error rounded-lg p-3 font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label
                className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative group input-focus-gold transition-all duration-250 border border-outline-variant/30 rounded-lg bg-surface-container flex items-center px-3">
                <Mail className="w-5 h-5 text-on-surface-variant/70 mr-3 shrink-0" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="champion@grandstride.com"
                  required
                  className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3 text-sm placeholder:text-on-surface-variant/30"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <label
                  className="text-xs font-semibold tracking-wider uppercase text-on-surface-variant"
                  htmlFor="password"
                >
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Verification code sent to email!");
                  }}
                  className="text-xs font-medium text-secondary hover:underline transition-all"
                >
                  Forgot Password?
                </a>
              </div>
              <div className="relative group input-focus-gold transition-all duration-250 border border-outline-variant/30 rounded-lg bg-surface-container flex items-center px-3">
                <Lock className="w-5 h-5 text-on-surface-variant/70 mr-3 shrink-0" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-transparent border-none text-on-surface focus:outline-none w-full py-3 text-sm placeholder:text-on-surface-variant/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none text-on-surface-variant/70 hover:text-secondary p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-secondary text-on-secondary/95 py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:brightness-110 active:scale-[0.98] transition-all duration-200 mt-2 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-on-secondary" />
                  Verifying Credentials...
                </>
              ) : (
                <>Sign In</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="h-[1px] bg-outline-variant/30 flex-grow" />
            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest">
              or
            </span>
            <div className="h-[1px] bg-outline-variant/30 flex-grow" />
          </div>

          {/* Social login option */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  onLoginSuccess({
                    fullName: "Sterling Spectator",
                    email: "spec.winner@gmail.com",
                    role: "spectator",
                    points: 100,
                  });
                  onNavigate("dashboard");
                }, 1000);
              }}
              className="w-full flex items-center justify-center gap-3 py-3 border border-outline-variant/30 text-xs tracking-wider uppercase font-semibold rounded-lg hover:bg-surface-variant transition-all active:scale-[0.98] cursor-pointer"
            >
              <img
                alt="Google Logo"
                className="w-4 h-4"
                referrerPolicy="no-referrer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAnbYEIzlBsD6ZcJ5k0OmdBe0PgtRVvXoVSf85wFf6a1qwcCvIBNTmZxwgUaT2SllHSsp6a3d62xELx6M24yKVuZTaOFNnYjbyZEYHmuHZq27hzrdcF4Huui3BHOWm_oA65cvI_8hSK8FcVjlpiFV5199--gQCtMnw6t1MlhIJhbEwzI9vf0ayM_Rj6vBOCVlfGHDKsSqwbKYD8pLv5yjlV0Rq_P9JpCGp5Bg867r5LU5T3gtmWJ-19bWSOCyvCvoUQAM1aCkMa_-v6"
              />
              Continue with Google
            </button>
          </div>

          {/* Footer Link */}
          <div className="text-center pt-2 border-t border-outline-variant/10">
            <p className="text-xs text-on-surface-variant">
              Don't have an account?{" "}
              <button
                onClick={() => onNavigate("signup")}
                className="text-secondary font-bold hover:underline cursor-pointer"
              >
                Register
              </button>
            </p>
          </div>
        </div>

        {/* Atmospheric Back-to-site */}
        <button
          onClick={() => onNavigate("dashboard")}
          className="mt-6 flex items-center gap-2 text-on-surface-variant/70 hover:text-primary transition-colors duration-300 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[10px] uppercase font-semibold tracking-wider">
            Back to GrandStride.com
          </span>
        </button>
      </main>
    </div>
  );
}
