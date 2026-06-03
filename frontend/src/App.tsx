import React, { useState } from 'react';
import { PageType, User } from './types';
import Header from './layouts/Header';
import Footer from './layouts/Footer';
import Dashboard from './pages/Dashboard';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import RaceDetails from './pages/RaceDetails';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleSignupSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handleUpdatePoints = (newPoints: number) => {
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        points: newPoints
      });
    }
  };

  const renderActivePage = () => {
    switch (currentPage) {
      case 'signin':
        return (
          <SignIn 
            onNavigate={handleNavigate} 
            onLoginSuccess={handleLoginSuccess} 
          />
        );
      case 'signup':
        return (
          <SignUp 
            onNavigate={handleNavigate} 
            onSignupSuccess={handleSignupSuccess} 
          />
        );
      case 'racedetails':
        return (
          <RaceDetails 
            onNavigate={handleNavigate} 
            currentUser={currentUser}
            onUpdatePoints={handleUpdatePoints}
          />
        );
      case 'dashboard':
      default:
        return (
          <Dashboard 
            onNavigate={handleNavigate} 
            currentUser={currentUser}
          />
        );
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans antialiased">
      {/* Persistent Nav Bar */}
      <Header 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Body */}
      {renderActivePage()}

      {/* Persistent Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
