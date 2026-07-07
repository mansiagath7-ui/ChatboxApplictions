import React, { useState } from 'react';
import { Mail, Lock, User, UserPlus, Sparkles, MessageSquare } from 'lucide-react';
import { api } from '../services/api';

const SignupPage = ({ onSignupSuccess, onNavigateToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const data = await api.register(username, email, password);
      
      // Save token to localStorage
      localStorage.setItem('chatbox_token', data.token);
      
      // Pass user back up
      onSignupSuccess(data);
    } catch (err) {
      setError(err.message || 'Registration failed');
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
          <h1>Create Account</h1>
          <p>Get started with Chatbox today</p>
        </div>

        {error && (
          <div className="error-message">
            <Sparkles size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Choose username"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <User className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                placeholder="Enter email address"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail className="input-icon" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                placeholder="Minimum 6 characters"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock className="input-icon" />
            </div>
          </div>

          <button type="submit" className="btn" style={{ marginTop: '1rem' }} disabled={loading}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} />
              {loading ? 'Registering...' : 'Sign Up'}
            </span>
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <button
            onClick={onNavigateToLogin}
            className="auth-link"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
