import React from 'react';

const BACKEND_URL = 'http://localhost:5000';

const Avater = ({ user, size = 'md', showStatus = false, isPulse = false }) => {
  if (!user) return null;

  const { username = '?', avatar = '', isOnline = false } = user;

  // Resolve avatar URL
  let resolvedAvatarUrl = '';
  if (avatar) {
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      resolvedAvatarUrl = avatar;
    } else {
      resolvedAvatarUrl = `${BACKEND_URL}${avatar}`;
    }
  }

  // Get fallback initials (first two chars max)
  const getInitials = (name) => {
    if (!name) return '?';
    return name.trim().slice(0, 2).toUpperCase();
  };

  // Size mapping
  const sizeClasses = {
    sm: { width: '32px', height: '32px', fontSize: '0.8rem' },
    md: { width: '48px', height: '48px', fontSize: '1.2rem' },
    lg: { width: '80px', height: '80px', fontSize: '2rem' },
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  // Color generator for placeholder background
  const getBackgroundColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)',
      'linear-gradient(135deg, #13E0E0 0%, #6876E1 100%)',
      'linear-gradient(135deg, #FF007F 0%, #FF4B72 100%)',
      'linear-gradient(135deg, #00F2FE 0%, #4FACFE 100%)',
      'linear-gradient(135deg, #bd00ff 0%, #ff007f 100%)',
      'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="avatar-container" style={selectedSize}>
      {resolvedAvatarUrl ? (
        <img
          src={resolvedAvatarUrl}
          alt={username}
          className="avatar-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = ''; // Force trigger fallback on load error
          }}
        />
      ) : (
        <div
          className="avatar-fallback"
          style={{ background: getBackgroundColor(username) }}
        >
          {getInitials(username)}
        </div>
      )}

      {showStatus && (
        <span
          className={`status-indicator ${isOnline ? 'online' : 'offline'} ${
            isOnline && isPulse ? 'pulse' : ''
          }`}
        />
      )}
    </div>
  );
};

export default Avater;
