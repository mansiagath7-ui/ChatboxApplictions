import React, { useState } from 'react';
import { Mail, Lock, LogIn, Sparkles, MessageSquare } from 'lucide-react';
import { api } from '../services/api';

const LoginPage = ({ onLoginSuccess, onNavigateToSignup }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const data = await api.login(emailOrUsername, password);
      
      // Save token to localStorage
      localStorage.setItem('chatbox_token', data.token);
      
      // Pass user back up
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <MessageSquare />
          </div>
          <h1>Chatbox Premium</h1>
          <p>Login to enter your cyber workspace</p>
        </div>

        {error && (
          <div className="error-message">
            <Sparkles size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email or Username</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Enter email or username"
                className="form-input"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
              />
              <Mail className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                placeholder="Enter password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="input-icon" />
            </div>
          </div>

          <button type="submit" className="btn" style={{ marginTop: '1rem' }} disabled={loading}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={18} />
              {loading ? 'Authenticating...' : 'Sign In'}
            </span>
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <button
            onClick={onNavigateToSignup}
            className="auth-link"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
