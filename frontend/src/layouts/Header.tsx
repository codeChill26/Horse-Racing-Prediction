import React from 'react';
import { PageType, User } from '../types';
import { Bell, User as UserIcon, LogOut, Menu, Trophy, Milestone, Compass } from 'lucide-react';

interface HeaderProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export default function Header({
  currentPage,
  onNavigate,
  currentUser,
  onLogout
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="bg-surface border-b border-outline-variant/30 sticky top-0 z-50">
      <div className="flex justify-between items-center h-20 px-6 sm:px-8 max-w-[1200px] mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <button 
            onClick={() => onNavigate('dashboard')}
            className="font-serif text-3xl text-primary font-bold tracking-tight hover:brightness-110 active:scale-98 transition-all cursor-pointer"
          >
            GrandStride
          </button>
          
          {/* Main Navigation (Desktop) */}
          <nav className="hidden md:flex gap-6 items-center">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-2 cursor-pointer transition-colors text-sm font-semibold tracking-wider uppercase py-2 px-3 rounded-lg ${
                currentPage === 'dashboard'
                  ? 'text-primary border-b-2 border-primary rounded-b-none'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40'
              }`}
            >
              <Compass className="w-4 h-4" />
              Tournaments
            </button>
            <button
              onClick={() => onNavigate('racedetails')}
              className={`flex items-center gap-2 cursor-pointer transition-colors text-sm font-semibold tracking-wider uppercase py-2 px-3 rounded-lg ${
                currentPage === 'racedetails'
                  ? 'text-primary border-b-2 border-primary rounded-b-none'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40'
              }`}
            >
              <Milestone className="w-4 h-4" />
              Races
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high/40 cursor-pointer transition-colors text-sm font-semibold tracking-wider uppercase py-2 px-3 rounded-lg"
            >
              <Trophy className="w-4 h-4" />
              Leaderboards
            </button>
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Points badge representing real logged in experience */}
              <div className="bg-secondary/10 border border-secondary/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-mono text-xs text-secondary font-semibold">
                  {currentUser.points} GS {currentUser.role === 'owner' ? 'Owner' : currentUser.role === 'jockey' ? 'Jockey' : 'Spectator'}
                </span>
              </div>

              {/* Action buttons */}
              <button 
                title="Notifications"
                className="p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-all rounded-full cursor-pointer relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
              </button>

              <div className="flex items-center gap-2 pr-1 border-r border-outline-variant/30">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-mono text-sm border border-primary/30">
                  {currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs text-on-surface font-medium truncate max-w-[100px]">
                  {currentUser.fullName}
                </span>
              </div>

              <button
                onClick={onLogout}
                title="Log Out"
                className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 transition-all rounded-full cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => onNavigate('signin')}
                className="border-2 border-primary/50 text-primary font-semibold text-xs tracking-wider uppercase px-4 sm:px-5 py-2 rounded-lg cursor-pointer hover:bg-primary/10 hover:border-primary transition-all active:scale-95 duration-200"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className="bg-primary text-on-primary font-semibold text-xs tracking-wider uppercase px-4 sm:px-5 py-2 rounded-lg cursor-pointer hover:brightness-110 shadow-lg shadow-primary/10 transition-all active:scale-95 duration-250"
              >
                Register
              </button>
            </div>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-lg md:hidden transition-all cursor-pointer"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-outline-variant/30 bg-surface px-6 py-4 flex flex-col gap-3 animate-fadeIn">
          <button
            onClick={() => {
              onNavigate('dashboard');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:text-primary hover:bg-surface-container-low transition-colors"
          >
            Tournaments
          </button>
          <button
            onClick={() => {
              onNavigate('racedetails');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:text-primary hover:bg-surface-container-low transition-colors"
          >
            Races
          </button>
          <button
            onClick={() => {
              onNavigate('dashboard');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-on-surface hover:text-primary hover:bg-surface-container-low transition-colors"
          >
            Leaderboards
          </button>
        </div>
      )}
    </header>
  );
}
