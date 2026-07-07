import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import Sidebar from '../components/Sidebar';
import Chatwindow from '../components/Chatwindow';
import Profilepage from './Profilepage';
import GroupinfoModel from '../components/GroupinfoModel';

const ChatPage = ({ currentUser, onLogout, onProfileUpdated }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [isGroup, setIsGroup] = useState(false);

  // Maps to store message states for sidebar
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});

  // Modal triggers
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);

  // Initialize data on login
  useEffect(() => {
    fetchInitialData();
  }, [currentUser]);

  const fetchInitialData = async () => {
    try {
      const usersData = await api.searchUsers('');
      const groupsData = await api.getGroups();

      setAllUsers(usersData);
      setAllGroups(groupsData);

      // Load last messages and unread counts for all contacts/groups
      const lastMsgMap = {};
      const unreadMap = {};

      await Promise.all([
        ...usersData.map(async (u) => {
          try {
            const msgs = await api.getMessages(u._id, false);
            if (msgs.length > 0) {
              lastMsgMap[u._id] = msgs[msgs.length - 1];
              const unread = msgs.filter(
                (m) => m.sender._id !== currentUser._id && !m.seenBy.includes(currentUser._id)
              );
              unreadMap[u._id] = unread.length;
            }
          } catch (e) {
            // ignore failure
          }
        }),
        ...groupsData.map(async (g) => {
          try {
            const msgs = await api.getMessages(g._id, true);
            if (msgs.length > 0) {
              lastMsgMap[g._id] = msgs[msgs.length - 1];
              const unread = msgs.filter(
                (m) => m.sender._id !== currentUser._id && !m.seenBy.includes(currentUser._id)
              );
              unreadMap[g._id] = unread.length;
            }
          } catch (e) {
            // ignore failure
          }
        }),
      ]);

      setLastMessages(lastMsgMap);
      setUnreadCounts(unreadMap);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  // Store active chat state in refs to prevent socket callback closure issues
  const activeChatRef = useRef(activeChat);
  const isGroupRef = useRef(isGroup);

  useEffect(() => {
    activeChatRef.current = activeChat;
    isGroupRef.current = isGroup;
  }, [activeChat, isGroup]);

  // Socket Connection Lifecycle (Only reconnects if user session changes)
  useEffect(() => {
    if (!currentUser) return;

    socketService.connect(currentUser);

    return () => {
      socketService.disconnect();
    };
  }, [currentUser._id]);

  // Socket callback registration (Only registered once per session)
  useEffect(() => {
    if (!currentUser) return;

    const onMessageReceived = (newMessage) => {
      const isGroupMsg = newMessage.chatType === 'group';
      const senderId = newMessage.sender._id;
      const conversationId = isGroupMsg ? newMessage.group : senderId;

      // Update last message in sidebar
      setLastMessages((prev) => ({
        ...prev,
        [conversationId]: newMessage,
      }));

      // Update unread count if we aren't currently viewing this conversation
      const currentActiveChat = activeChatRef.current;
      const currentIsGroup = isGroupRef.current;

      const isCurrentlyViewing =
        currentActiveChat &&
        currentActiveChat._id === conversationId &&
        currentIsGroup === isGroupMsg;

      if (!isCurrentlyViewing) {
        setUnreadCounts((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1,
        }));
      }
    };

    const onUserStatusChanged = ({ userId, isOnline, lastSeen }) => {
      setAllUsers((prev) =>
        prev.map((user) =>
          user._id === userId ? { ...user, isOnline, lastSeen } : user
        )
      );
      
      // Also update online status in active chat if viewing that user
      setActiveChat((prev) => {
        if (prev && prev._id === userId && !prev.members) {
          return { ...prev, isOnline, lastSeen };
        }
        return prev;
      });
    };

    const onMessageDeleted = ({ messageId, isDeletedForEveryone }) => {
      setLastMessages((prev) => {
        const updated = { ...prev };
        for (const [key, msg] of Object.entries(updated)) {
          if (msg && msg._id === messageId) {
            updated[key] = {
              ...msg,
              content: 'This message was deleted',
              mediaUrl: '',
              isDeleted: true
            };
          }
        }
        return updated;
      });
    };

    socketService.registerCallbacks(onMessageReceived, onUserStatusChanged, onMessageDeleted);
  }, [currentUser._id]);

  // Handle active chat selection
  const handleSelectChat = async (chat, isGroupChat) => {
    setActiveChat(chat);
    setIsGroup(isGroupChat);

    // Reset unread count locally
    setUnreadCounts((prev) => ({
      ...prev,
      [chat._id]: 0,
    }));
  };

  const handleNewMessageSent = (chatId, message) => {
    setLastMessages((prev) => ({
      ...prev,
      [chatId]: message,
    }));
  };

  const handleGroupCreated = (newGroup) => {
    setAllGroups((prev) => [newGroup, ...prev]);
    // Select the new group chat instantly
    handleSelectChat(newGroup, true);
  };

  const handleGroupUpdated = (updatedGroup) => {
    setAllGroups((prev) =>
      prev.map((g) => (g._id === updatedGroup._id ? updatedGroup : g))
    );
    // If it's our active chat, update details
    if (activeChat && activeChat._id === updatedGroup._id) {
      setActiveChat(updatedGroup);
    }
  };

  const handleGroupLeft = (groupId) => {
    setAllGroups((prev) => prev.filter((g) => g._id !== groupId));
    if (activeChat && activeChat._id === groupId) {
      setActiveChat(null);
    }
    setShowGroupDetails(false);
  };

  return (
    <div className={`chat-layout ${activeChat ? 'chat-open' : ''}`}>
      <Sidebar
        currentUser={currentUser}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onLogout={onLogout}
        onOpenProfile={() => setShowProfile(true)}
        allUsers={allUsers}
        allGroups={allGroups}
        unreadCounts={unreadCounts}
        lastMessages={lastMessages}
        onGroupCreated={handleGroupCreated}
      />

      <Chatwindow
        activeChat={activeChat}
        isGroup={isGroup}
        currentUser={currentUser}
        onOpenDetails={() => {
          if (isGroup) {
            setShowGroupDetails(true);
          } else {
            // Simple report popup for users
            const reason = window.prompt(`Report ${activeChat.username} for moderation? Enter reason:`);
            if (reason) {
              api.createReport({ reason, reportedUserId: activeChat._id })
                .then(() => alert('User reported.'))
                .catch(err => alert('Failed to report: ' + err.message));
            }
          }
        }}
        onNewMessageSent={handleNewMessageSent}
        onBack={() => handleSelectChat(null, false)}
        onProfileUpdated={onProfileUpdated}
      />

      {showProfile && (
        <Profilepage
          currentUser={currentUser}
          onProfileUpdated={(updatedUser) => {
            onProfileUpdated(updatedUser);
          }}
          onClose={() => setShowProfile(false)}
        />
      )}

      {showGroupDetails && activeChat && isGroup && (
        <GroupinfoModel
          groupId={activeChat._id}
          currentUser={currentUser}
          onClose={() => setShowGroupDetails(false)}
          onGroupUpdated={handleGroupUpdated}
          onGroupLeft={handleGroupLeft}
        />
      )}
    </div>
  );
};

export default ChatPage;
