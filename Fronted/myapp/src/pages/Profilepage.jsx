import React, { useState, useEffect } from 'react';
import { Camera, X, User, Edit3, MessageSquare, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import Avater from '../components/Avater';

const Profilepage = ({ currentUser, onProfileUpdated, onClose }) => {
  const [username, setUsername] = useState(currentUser.username || '');
  const [status, setStatus] = useState(currentUser.status || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setUsername(currentUser.username || '');
    setStatus(currentUser.status || '');
    setAvatarFile(null);
    setAvatarPreview('');
  }, [currentUser]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));

      // Instantly upload avatar to backend
      const updatedUser = await api.updateAvatar(file);
      onProfileUpdated(updatedUser);
      setSuccess('Avatar updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to upload avatar');
      setAvatarPreview('');
      setAvatarFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const updatedUser = await api.updateProfile({
        username: username.trim(),
        status: status.trim(),
      });

      onProfileUpdated(updatedUser);
      setSuccess('Profile updated successfully!');
      
      // Close after short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h2>My Profile Settings</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleProfileSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}
            {success && (
              <div className="error-message" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                <Sparkles size={16} />
                <span>{success}</span>
              </div>
            )}

            {/* Avatar Upload Container */}
            <div className="avatar-upload-wrapper">
              <div className="avatar-upload-btn">
                <input
                  type="file"
                  id="profile-avatar-input"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
                <label htmlFor="profile-avatar-input" style={{ cursor: 'pointer' }}>
                  <Avater
                    user={{
                      username: currentUser.username,
                      avatar: avatarPreview || currentUser.avatar,
                    }}
                    size="lg"
                  />
                  <div className="avatar-upload-overlay" style={{ borderRadius: '50%' }}>
                    <Camera size={24} />
                  </div>
                </label>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Click picture to upload a custom avatar
              </span>
            </div>

            {/* Form Fields */}
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
                <User className="input-icon" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio Status</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Tell others what you are doing..."
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={loading}
                />
                <Edit3 className="input-icon" />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ width: 'auto' }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn"
              style={{ width: 'auto' }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profilepage;
