import React from 'react';
import { PageType, User } from '../types';
import { Mail, Lock, Eye, EyeOff, User as UserIcon, Phone, Stars, Info, Landmark, Trophy, LogIn } from 'lucide-react';

interface SignUpProps {
  onNavigate: (page: PageType) => void;
  onSignupSuccess: (user: User) => void;
}

export default function SignUp({ onNavigate, onSignupSuccess }: SignUpProps) {
  const [role, setRole] = React.useState<'owner' | 'jockey' | 'spectator'>('spectator');
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [agreeTerms, setAgreeTerms] = React.useState(false);

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleRoleSelection = (selectedRole: 'owner' | 'jockey' | 'spectator') => {
    setRole(selectedRole);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validations
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('Please populate all required properties.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Confirmation password does not match.');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      // Determine starting bonus points based on matching Figma rules
      const startingPoints = role === 'spectator' ? 100 : role === 'jockey' ? 150 : 250;

      onSignupSuccess({
        fullName,
        email,
        role,
        points: startingPoints
      });

      alert(`Congratulations! Account authorized and created inside GrandStride with registration bonus: ${startingPoints} starting points!`);
      onNavigate('dashboard');
    }, 1500);
  };

  return (
    <div className="flex-grow flex items-center justify-center p-6 md:p-12 background-glow min-h-[calc(100vh-160px)]">
      {/* Auth Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      <main className="relative w-full max-w-[480px] z-10">
        <div className="bg-surface-container rounded-xl shadow-2xl p-6 sm:p-8 md:p-10 border border-outline-variant/30">
          
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="font-serif text-primary text-4xl font-bold mb-2 tracking-tight hover:opacity-90 active:scale-98 transition-all"
            >
              GrandStride
            </button>
            <h2 className="font-serif text-2xl text-on-surface font-semibold">Create Account</h2>
            <p className="text-on-surface-variant text-xs mt-1">Join the elite circle of digital turf champions.</p>
          </div>

          <form className="space-y-4" onSubmit={handleCreateAccount}>
            {errorMsg && (
              <div className="text-xs bg-error/15 border border-error/30 text-error rounded-lg p-3 font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Role Checker */}
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-on-surface block mb-1">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                
                {/* Owner */}
                <button
                  type="button"
                  onClick={() => handleRoleSelection('owner')}
                  className={`role-card flex flex-col items-center justify-center p-3 rounded-lg border bg-surface-container-low transition-all duration-300 group cursor-pointer ${
                    role === 'owner' ? 'border-secondary active bg-secondary/5' : 'border-outline-variant/30 hover:border-secondary/40'
                  }`}
                >
                  <Landmark className={`w-5 h-5 mb-1.5 transition-colors group-hover:text-secondary ${
                    role === 'owner' ? 'text-secondary' : 'text-on-surface-variant'
                  }`} />
                  <span className="text-[11px] font-bold text-center leading-tight">Horse Owner</span>
                </button>

                {/* Jockey */}
                <button
                  type="button"
                  onClick={() => handleRoleSelection('jockey')}
                  className={`role-card flex flex-col items-center justify-center p-3 rounded-lg border bg-surface-container-low transition-all duration-300 group cursor-pointer ${
                    role === 'jockey' ? 'border-secondary active bg-secondary/5' : 'border-outline-variant/30 hover:border-secondary/40'
                  }`}
                >
                  <Trophy className={`w-5 h-5 mb-1.5 transition-colors group-hover:text-secondary ${
                    role === 'jockey' ? 'text-secondary' : 'text-on-surface-variant'
                  }`} />
                  <span className="text-[11px] font-bold text-center leading-tight">Jockey</span>
                </button>

                {/* Spectator */}
                <button
                  type="button"
                  onClick={() => handleRoleSelection('spectator')}
                  className={`role-card flex flex-col items-center justify-center p-3 rounded-lg border bg-surface-container-low transition-all duration-300 group cursor-pointer ${
                    role === 'spectator' ? 'border-secondary active bg-secondary/5' : 'border-outline-variant/30 hover:border-secondary/40'
                  }`}
                >
                  <Stars className={`w-5 h-5 mb-1.5 transition-colors group-hover:text-secondary ${
                    role === 'spectator' ? 'text-secondary' : 'text-on-surface-variant'
                  }`} />
                  <span className="text-[11px] font-bold text-center leading-tight">Spectator</span>
                </button>

              </div>
            </div>

            {/* Info Box dynamic values matching Figma Spec */}
            <div className="bg-secondary/10 border border-secondary/25 rounded-lg p-3.5 flex items-start gap-3 transition-all duration-300">
              <Stars className="w-5 h-5 text-secondary shrink-0 mt-0.5 animate-bounce" />
              <p className="text-xs text-secondary leading-relaxed font-medium">
                {role === 'owner' && "Starting bonus: You'll receive 250 owner points, allowing immediate tournament registry! 🏅"}
                {role === 'jockey' && "Starting bonus: You'll receive 150 points for racing entry validation and fees! 🏇"}
                {role === 'spectator' && "Starting bonus: You'll receive 100 starting points upon registration! 🎉"}
              </p>
            </div>

            {/* Personal Information */}
            <div className="space-y-3">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wider text-on-surface" htmlFor="fullName">
                  Full Name
                </label>
                <div className="relative border border-outline-variant/30 rounded-lg bg-surface-container-lowest flex items-center px-3 focus-within:border-secondary transition-all">
                  <UserIcon className="w-4 h-4 text-on-surface-variant/70 mr-2 shrink-0" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    placeholder="Enter your legal name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-transparent border-none text-on-surface focus:outline-none py-2.5 text-xs placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wider text-on-surface" htmlFor="email">
                  Email Address
                </label>
                <div className="relative border border-outline-variant/30 rounded-lg bg-surface-container-lowest flex items-center px-3 focus-within:border-secondary transition-all">
                  <Mail className="w-4 h-4 text-on-surface-variant/70 mr-2 shrink-0" />
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-none text-on-surface focus:outline-none py-2.5 text-xs placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wider text-on-surface" htmlFor="phone">
                  Phone Number
                </label>
                <div className="relative border border-outline-variant/30 rounded-lg bg-surface-container-lowest flex items-center px-3 focus-within:border-secondary transition-all">
                  <Phone className="w-4 h-4 text-on-surface-variant/70 mr-2 shrink-0" />
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-transparent border-none text-on-surface focus:outline-none py-2.5 text-xs placeholder:text-on-surface-variant/30"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wider text-on-surface" htmlFor="password">
                  Password
                </label>
                <div className="relative border border-outline-variant/30 rounded-lg bg-surface-container-lowest flex items-center px-3 focus-within:border-secondary transition-all">
                  <Lock className="w-4 h-4 text-on-surface-variant/70 mr-2 shrink-0" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-none text-on-surface focus:outline-none py-2.5 text-xs placeholder:text-on-surface-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-on-surface-variant/70 hover:text-secondary p-1 shrink-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold tracking-wider text-on-surface" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative border border-outline-variant/30 rounded-lg bg-surface-container-lowest flex items-center px-3 focus-within:border-secondary transition-all">
                  <Lock className="w-4 h-4 text-on-surface-variant/70 mr-2 shrink-0" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-none text-on-surface focus:outline-none py-2.5 text-xs placeholder:text-on-surface-variant/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-on-surface-variant/70 hover:text-secondary p-1 shrink-0"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group pt-1">
              <input
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="peer h-4.5 w-4.5 mt-0.5 rounded border-outline-variant/50 bg-surface-container-lowest text-secondary focus:ring-secondary/20 transition-all cursor-pointer"
              />
              <span className="text-[11px] text-on-surface-variant group-hover:text-on-surface transition-colors leading-relaxed font-semibold">
                I agree to the{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); alert('Terms of Service Agreement'); }} className="text-secondary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); alert('Privacy Policy standards'); }} className="text-secondary hover:underline">
                  Privacy Policy
                </a>.
              </span>
            </label>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-secondary text-on-secondary py-3 rounded-lg font-semibold uppercase tracking-wider text-xs hover:brightness-110 active:scale-[0.98] transition-all duration-200 mt-2 shadow-lg shadow-secondary/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Redirection Footer Link */}
          <div className="mt-6 text-center border-t border-outline-variant/10 pt-4">
            <p className="text-xs text-on-surface-variant">
              Already have an account?{' '}
              <button 
                onClick={() => onNavigate('signin')} 
                className="text-secondary font-bold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* System Credits */}
        <p className="mt-6 text-center text-[10px] text-on-surface-variant/40 font-mono tracking-widest uppercase">
          © {new Date().getFullYear()} GrandStride. Stable system v1.2
        </p>
      </main>
    </div>
  );
}
