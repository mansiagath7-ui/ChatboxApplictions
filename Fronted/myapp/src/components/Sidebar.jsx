import React, { useState, useEffect } from 'react';
import { LogOut, Settings, MessageSquarePlus, Search, Users, MessageSquare, Plus, Check, X } from 'lucide-react';
import { api } from '../services/api';
import Avater from './Avater';

const Sidebar = ({
  currentUser,
  activeChat,
  onSelectChat,
  onLogout,
  onOpenProfile,
  allUsers,
  allGroups,
  unreadCounts,
  lastMessages,
  onGroupCreated,
}) => {
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' or 'groups'
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupAvatar, setGroupAvatar] = useState(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [groupError, setGroupError] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Filter users based on search
  const filteredUsers = allUsers.filter((user) => {
    const term = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  // Filter groups based on search
  const filteredGroups = allGroups.filter((group) => {
    const term = searchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(term) ||
      (group.description && group.description.toLowerCase().includes(term))
    );
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupAvatar(file);
      setGroupAvatarPreview(URL.createObjectURL(file));
    }
  };

  const toggleMemberSelection = (userId) => {
    if (selectedGroupMembers.includes(userId)) {
      setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== userId));
    } else {
      setSelectedGroupMembers([...selectedGroupMembers, userId]);
    }
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setGroupError('Group name is required');
      return;
    }

    try {
      setCreatingGroup(true);
      setGroupError('');

      const newGroup = await api.createGroup({
        name: groupName,
        description: groupDesc,
        members: selectedGroupMembers,
        avatarFile: groupAvatar,
      });

      onGroupCreated(newGroup);
      
      // Reset form
      setGroupName('');
      setGroupDesc('');
      setGroupAvatar(null);
      setGroupAvatarPreview('');
      setSelectedGroupMembers([]);
      setShowCreateGroup(false);
    } catch (err) {
      setGroupError(err.message || 'Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Format timestamp nicely
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="sidebar">
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="user-profile-summary" onClick={onOpenProfile} title="Edit Profile">
          <Avater user={currentUser} size="md" showStatus={true} isPulse={true} />
          <div className="user-profile-details">
            <span className="username-display">{currentUser.username}</span>
            <span className="user-status-display">{currentUser.status || 'Hey there!'}</span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="icon-btn" onClick={() => setShowCreateGroup(true)} title="Create Group">
            <MessageSquarePlus size={20} />
          </button>
          <button className="icon-btn" onClick={onOpenProfile} title="Profile Settings">
            <Settings size={20} />
          </button>
          <button className="icon-btn" onClick={onLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder={activeTab === 'chats' ? 'Search or start new chat...' : 'Search groups...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <MessageSquare size={16} /> Chats
          </span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Users size={16} /> Groups
          </span>
        </button>
      </div>

      {/* Sidebar List */}
      <div className="sidebar-list">
        {activeTab === 'chats' ? (
          filteredUsers.length === 0 ? (
            <div className="empty-state-sidebar">No users found</div>
          ) : (
            filteredUsers.map((user) => {
              const unread = unreadCounts[user._id] || 0;
              const lastMsg = lastMessages[user._id];
              const isActive = activeChat && activeChat._id === user._id && !activeChat.members;

              return (
                <div
                  key={user._id}
                  className={`chat-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChat(user, false)}
                >
                  <Avater user={user} size="md" showStatus={true} />
                  <div className="chat-item-content">
                    <div className="chat-item-header">
                      <span className="chat-item-name">{user.username}</span>
                      {lastMsg && (
                        <span className="chat-item-time">{formatTime(lastMsg.createdAt)}</span>
                      )}
                    </div>
                    <div className="chat-item-meta">
                      <span className="chat-item-snippet">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender._id === currentUser._id ? 'You: ' : ''}
                            {lastMsg.mediaUrl ? '📷 Image' : lastMsg.content}
                          </>
                        ) : (
                          user.status || 'Hey there! I am using Chatbox.'
                        )}
                      </span>
                      {unread > 0 && <span className="chat-item-badge">{unread}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          filteredGroups.length === 0 ? (
            <div className="empty-state-sidebar">No groups joined yet</div>
          ) : (
            filteredGroups.map((group) => {
              const unread = unreadCounts[group._id] || 0;
              const lastMsg = lastMessages[group._id];
              const isActive = activeChat && activeChat._id === group._id && activeChat.members;

              return (
                <div
                  key={group._id}
                  className={`chat-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChat(group, true)}
                >
                  <Avater user={{ username: group.name, avatar: group.avatar }} size="md" />
                  <div className="chat-item-content">
                    <div className="chat-item-header">
                      <span className="chat-item-name">{group.name}</span>
                      {lastMsg && (
                        <span className="chat-item-time">{formatTime(lastMsg.createdAt)}</span>
                      )}
                    </div>
                    <div className="chat-item-meta">
                      <span className="chat-item-snippet">
                        {lastMsg ? (
                          <>
                            <span style={{ fontWeight: 600 }}>{lastMsg.sender.username}: </span>
                            {lastMsg.mediaUrl ? '📷 Image' : lastMsg.content}
                          </>
                        ) : (
                          group.description || 'No description'
                        )}
                      </span>
                      {unread > 0 && <span className="chat-item-badge">{unread}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create New Group</h2>
              <button className="icon-btn" onClick={() => setShowCreateGroup(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit}>
              <div className="modal-body">
                {groupError && <div className="error-message">{groupError}</div>}

                {/* Group Avatar Upload */}
                <div className="avatar-upload-wrapper">
                  <div className="avatar-upload-btn">
                    <input
                      type="file"
                      id="group-avatar-file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                    />
                    <label htmlFor="group-avatar-file" style={{ cursor: 'pointer' }}>
                      <Avater user={{ username: groupName || 'G', avatar: groupAvatarPreview }} size="lg" />
                      <div className="avatar-upload-overlay" style={{ borderRadius: '50%' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Upload</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Group Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter group name"
                    className="form-input"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    placeholder="Enter group description"
                    className="form-input"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>

                {/* Member Selection */}
                <div className="form-group">
                  <label className="form-label">Select Initial Members</label>
                  <div className="user-select-list" style={{ maxHeight: '150px' }}>
                    {allUsers.length === 0 ? (
                      <div className="empty-state-sidebar" style={{ padding: '0.5rem' }}>No other users available</div>
                    ) : (
                      allUsers.map((user) => (
                        <div
                          key={user._id}
                          className={`user-select-item ${
                            selectedGroupMembers.includes(user._id) ? 'selected' : ''
                          }`}
                          onClick={() => toggleMemberSelection(user._id)}
                        >
                          <Avater user={user} size="sm" />
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.username}</span>
                          </div>
                          <div className="checkbox-round" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateGroup(false)}
                  style={{ width: 'auto' }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn" style={{ width: 'auto' }} disabled={creatingGroup}>
                  {creatingGroup ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
