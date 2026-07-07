import React, { useState, useEffect } from 'react';
import { X, UserPlus, LogOut, UserMinus, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import Avater from './Avater';

const GroupinfoModel = ({ groupId, currentUser, onClose, onGroupUpdated, onGroupLeft }) => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingMembersMode, setAddingMembersMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    fetchGroupDetails();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const data = await api.getGroupDetails(groupId);
      setGroup(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch group details');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.leaveGroup(groupId);
      onGroupLeft(groupId);
    } catch (err) {
      setError(err.message || 'Failed to leave group');
    }
  };

  const handleKickMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      const updated = await api.kickMember(groupId, memberId);
      setGroup(updated);
      if (onGroupUpdated) onGroupUpdated(updated);
    } catch (err) {
      setError(err.message || 'Failed to kick member');
    }
  };

  const searchNewMembers = async () => {
    try {
      const results = await api.searchUsers(searchQuery);
      // Filter out users who are already group members
      const memberIds = group.members.map(m => m._id.toString());
      const filtered = results.filter(u => !memberIds.includes(u._id.toString()));
      setSearchResults(filtered);
    } catch (err) {
      setError('Search failed: ' + err.message);
    }
  };

  useEffect(() => {
    if (addingMembersMode) {
      searchNewMembers();
    }
  }, [searchQuery, addingMembersMode]);

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    try {
      const updated = await api.addMembers(groupId, selectedUsers);
      setGroup(updated);
      setAddingMembersMode(false);
      setSelectedUsers([]);
      if (onGroupUpdated) onGroupUpdated(updated);
    } catch (err) {
      setError(err.message || 'Failed to add members');
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="typing-text" style={{ justifyContent: 'center' }}>Loading Group Info...</div>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ padding: '2rem' }}>
          <div className="error-message">{error}</div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const isAdmin = group.admins.some(admin => admin._id.toString() === currentUser._id.toString());
  const isCreator = group.createdBy && group.createdBy._id.toString() === currentUser._id.toString();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{addingMembersMode ? 'Add Members' : 'Group Information'}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {!addingMembersMode ? (
            <>
              {/* Group Hero Details */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', textAlign: 'center' }}>
                <Avater user={{ username: group.name, avatar: group.avatar }} size="lg" />
                <h3 style={{ marginTop: '1rem', fontSize: '1.4rem', fontWeight: 700 }}>{group.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {group.description || 'No description provided.'}
                </p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Created by {group.createdBy?.username || 'unknown'}
                </span>
              </div>

              {/* Members List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Members ({group.members.length})
                  </h4>
                  {isAdmin && (
                    <button
                      className="icon-btn"
                      onClick={() => setAddingMembersMode(true)}
                      style={{ fontSize: '0.85rem', display: 'flex', gap: '0.25rem', color: 'var(--accent-cyan)' }}
                    >
                      <UserPlus size={16} /> Add
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto' }}>
                  {group.members.map((member) => {
                    const isMemberAdmin = group.admins.some(a => a._id.toString() === member._id.toString());
                    const isMemberCreator = group.createdBy && group.createdBy._id.toString() === member._id.toString();

                    return (
                      <div key={member._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderRadius: '10px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Avater user={member} size="sm" showStatus={true} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {member.username} {member._id.toString() === currentUser._id.toString() && '(You)'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.status}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {isMemberCreator ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-rose)', border: '1px solid rgba(255, 0, 127, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Owner
                            </span>
                          ) : isMemberAdmin ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Admin
                            </span>
                          ) : null}

                          {isAdmin && member._id.toString() !== currentUser._id.toString() && !isMemberCreator && (
                            <button
                              className="icon-btn"
                              onClick={() => handleKickMember(member._id)}
                              style={{ color: 'var(--accent-rose)', padding: '4px' }}
                              title="Kick member"
                            >
                              <UserMinus size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Add Members UI */}
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  className="form-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '1rem' }}
                />
              </div>

              {selectedUsers.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Selected to add ({selectedUsers.length})
                  </div>
                  <div className="selected-members-badges">
                    {selectedUsers.map(id => {
                      const userObj = searchResults.find(u => u._id === id);
                      return (
                        <div key={id} className="member-badge">
                          <span>{userObj?.username || 'user'}</span>
                          <button className="badge-remove" onClick={() => toggleUserSelection(id)}>×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="user-select-list">
                {searchResults.length === 0 ? (
                  <div className="empty-state-sidebar">No non-member users found.</div>
                ) : (
                  searchResults.map(user => (
                    <div
                      key={user._id}
                      className={`user-select-item ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                      onClick={() => toggleUserSelection(user._id)}
                    >
                      <Avater user={user} size="sm" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                      <div className="checkbox-round" />
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {addingMembersMode ? (
            <>
              <button className="btn btn-secondary" onClick={() => setAddingMembersMode(false)}>
                Back
              </button>
              <button className="btn" onClick={handleAddMembers} disabled={selectedUsers.length === 0}>
                Add Selected
              </button>
            </>
          ) : (
            <>
              {!isCreator && (
                <button className="btn btn-danger" onClick={handleLeaveGroup} style={{ display: 'flex', gap: '0.5rem', width: 'auto', marginRight: 'auto' }}>
                  <LogOut size={16} /> Leave Group
                </button>
              )}
              <button className="btn btn-secondary" onClick={onClose} style={{ width: 'auto' }}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupinfoModel;
