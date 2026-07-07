import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ChatPage from './pages/ChatPage';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' or 'signup'
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    checkAuthSession();
  }, []);

  const checkAuthSession = async () => {
    const token = localStorage.getItem('chatbox_token');
    if (!token) {
      setInitializing(false);
      return;
    }

    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (err) {
      console.warn('Auth session invalid:', err.message);
      localStorage.removeItem('chatbox_token');
    } finally {
      setInitializing(false);
    }
  };

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('chatbox_token');
    setCurrentUser(null);
    setAuthView('login');
  };

  const handleProfileUpdated = (updatedUser) => {
    // Merge new details
    setCurrentUser((prev) => ({
      ...prev,
      ...updatedUser,
    }));
  };

  if (initializing) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center' }}>
          <div className="typing-dots" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
            <span />
            <span />
            <span />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Initializing secure connection...</p>
        </div>
      </div>
    );
  }

  if (currentUser) {
    return (
      <ChatPage
        currentUser={currentUser}
        onLogout={handleLogout}
        onProfileUpdated={handleProfileUpdated}
      />
    );
  }

  return authView === 'login' ? (
    <LoginPage
      onLoginSuccess={handleLoginSuccess}
      onNavigateToSignup={() => setAuthView('signup')}
    />
  ) : (
    <SignupPage
      onSignupSuccess={handleLoginSuccess}
      onNavigateToLogin={() => setAuthView('login')}
    />
  );
}

export default App;
