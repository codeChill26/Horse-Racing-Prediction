import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken, getStoredAuthRole, getHomePathForRole, parseJwtPayload } from '../../utils/token';
import { getMyProfile } from '../../api/auth';
import Dashboard from './Dashboard';

export default function LandingDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      // Decode JWT to set basic user info first
      const payload = parseJwtPayload(token);
      if (payload) {
        setCurrentUser({
          email: payload.email,
          role: payload.role,
        });
      }
      
      // Fetch full profile if token is valid
      getMyProfile(token)
        .then((user) => {
          setCurrentUser(user);
        })
        .catch(() => {
          // If profile fetch fails (e.g. token expired), reset current user
          setCurrentUser(null);
        });
    } else {
      setCurrentUser(null);
    }
  }, []);

  const handleNavigate = (page) => {
    if (page === 'signup') {
      navigate('/register');
    } else if (page === 'login') {
      navigate('/login');
    } else if (page === 'dashboard') {
      navigate('/');
    } else if (page === 'racedetails') {
      const token = getAccessToken();
      const role = getStoredAuthRole();
      const home = getHomePathForRole(role);
      
      if (token && home) {
        navigate(home);
      } else {
        navigate('/login');
      }
    }
  };

  return <Dashboard onNavigate={handleNavigate} currentUser={currentUser} />;
}
