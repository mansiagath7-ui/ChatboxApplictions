import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, X, AlertOctagon, MoreVertical, Eye, Image as ImageIcon, Smile, ArrowLeft, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import Avater from './Avater';

const BACKEND_URL = 'http://localhost:5000';

const Chatwindow = ({
  activeChat,
  isGroup,
  currentUser,
  onOpenDetails,
  onNewMessageSent,
  onBack,
  onProfileUpdated,
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputText, setInputText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [typingUser, setTypingUser] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isCurrentlyTypingRef = useRef(false);

  const emojis = ['😂', '❤️', '👍', '🔥', '😍', '🎉', '🚀', '😭', '😮', '👏', '🙏', '✨'];

  // Fetch messages when activeChat changes
  useEffect(() => {
    if (!activeChat) return;

    fetchMessages();
    setTypingUser('');
    setInputText('');
    setMediaFile(null);
    setMediaPreview('');
    setShowEmojiPicker(false);
    setShowOptionsDropdown(false);

    // Join room if group
    if (isGroup) {
      socketService.joinGroup(activeChat._id);
    }

    return () => {
      if (isGroup) {
        socketService.leaveGroup(activeChat._id);
      }
    };
  }, [activeChat, isGroup]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await api.getMessages(activeChat._id, isGroup);
      setMessages(data);
      setError('');
      scrollToBottom();

      // Mark messages as read
      await api.markAsRead(activeChat._id, isGroup);
    } catch (err) {
      setError('Could not load messages');
    } finally {
      setLoading(false);
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to socket messages for the current active chat
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleIncomingMessage = (newMessage) => {
      // Check if message belongs to current chat
      const isForCurrentChat = isGroup
        ? newMessage.chatType === 'group' && newMessage.group === activeChat._id
        : newMessage.chatType === 'private' &&
          (newMessage.sender._id === activeChat._id || newMessage.receiver === activeChat._id);

      if (isForCurrentChat) {
        setMessages((prev) => [...prev, newMessage]);
        // Auto mark read if we are looking at the chat
        api.markAsRead(activeChat._id, isGroup).catch(() => {});
      }
    };

    const handleTypingEvent = (room) => {
      // If typing room matches current chat id
      if (room === activeChat?._id) {
        // If private chat, active chat partner is typing. If group, show that someone is typing.
        if (isGroup) {
          setTypingUser('Someone');
        } else {
          setTypingUser(activeChat.username);
        }
      }
    };

    const handleStopTypingEvent = (room) => {
      if (room === activeChat?._id) {
        setTypingUser('');
      }
    };

    const handleMessageDeleted = ({ messageId, isDeletedForEveryone }) => {
      if (isDeletedForEveryone) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, content: 'This message was deleted', mediaUrl: '', isDeleted: true }
              : msg
          )
        );
      }
    };

    socket.on('messageReceived', handleIncomingMessage);
    socket.on('typing', handleTypingEvent);
    socket.on('stopTyping', handleStopTypingEvent);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('messageReceived', handleIncomingMessage);
      socket.off('typing', handleTypingEvent);
      socket.off('stopTyping', handleStopTypingEvent);
      socket.off('messageDeleted', handleMessageDeleted);
    };
  }, [activeChat, isGroup]);

  // Handle typing debounce
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (!socketService.getSocket() || !activeChat) return;

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      socketService.emitTyping(activeChat._id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.emitStopTyping(activeChat._id);
      isCurrentlyTypingRef.current = false;
    }, 2000);
  };

  const isBlocked = !isGroup && currentUser.blockedUsers?.includes(activeChat?._id);

  const handleBlockToggle = async () => {
    if (!activeChat || isGroup) return;

    try {
      let updatedUser;
      if (isBlocked) {
        updatedUser = await api.unblockUser(activeChat._id);
        alert(`Unblocked ${activeChat.username}`);
      } else {
        const confirmBlock = window.confirm(`Are you sure you want to block ${activeChat.username}? You will not be able to send or receive messages from them.`);
        if (!confirmBlock) return;
        updatedUser = await api.blockUser(activeChat._id);
        alert(`Blocked ${activeChat.username}`);
      }
      if (onProfileUpdated) {
        onProfileUpdated(updatedUser);
      }
      setShowOptionsDropdown(false);
    } catch (err) {
      alert('Failed to block/unblock user: ' + err.message);
    }
  };

  const handleCopyText = (content) => {
    navigator.clipboard.writeText(content);
    setActiveMessageMenuId(null);
  };

  const handleDeleteMessage = async (messageId, type) => {
    try {
      await api.deleteMessage(messageId, type);
      if (type === 'me') {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, content: 'This message was deleted', mediaUrl: '', isDeleted: true }
              : msg
          )
        );
      }
      setActiveMessageMenuId(null);
    } catch (err) {
      alert('Failed to delete message: ' + err.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !mediaFile) return;

    try {
      const chatType = isGroup ? 'group' : 'private';
      const receiverId = isGroup ? null : activeChat._id;
      const groupId = isGroup ? activeChat._id : null;

      // Stop typing status
      if (isCurrentlyTypingRef.current) {
        socketService.emitStopTyping(activeChat._id);
        isCurrentlyTypingRef.current = false;
      }

      // Add optimistic message locally or wait for API response
      const sentMsg = await api.sendMessage({
        content: inputText,
        chatType,
        receiverId,
        groupId,
        mediaFile,
      });

      setMessages((prev) => [...prev, sentMsg]);
      setInputText('');
      setMediaFile(null);
      setMediaPreview('');
      scrollToBottom();

      // Trigger callback to parent to update sidebar last message snippet
      if (onNewMessageSent) {
        onNewMessageSent(activeChat._id, sentMsg);
      }
    } catch (err) {
      setError('Failed to send message: ' + err.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const selectEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleReportChat = async () => {
    const reason = window.prompt('Please enter the reason for reporting this chat:');
    if (!reason) return;

    try {
      const payload = { reason };
      if (isGroup) {
        payload.reportedGroupId = activeChat._id;
      } else {
        payload.reportedUserId = activeChat._id;
      }

      await api.createReport(payload);
      alert('Report submitted successfully. Our moderators will review it.');
      setShowOptionsDropdown(false);
    } catch (err) {
      alert('Failed to submit report: ' + err.message);
    }
  };

  const handleReportMessage = async (messageId) => {
    const reason = window.prompt('Please enter the reason for reporting this message:');
    if (!reason) return;

    try {
      await api.createReport({
        reason,
        reportedMessageId: messageId,
      });
      alert('Message reported successfully.');
    } catch (err) {
      alert('Failed to report message: ' + err.message);
    }
  };

  // Group messages by Date
  const groupMessagesByDate = (msgs) => {
    const groups = {};
    msgs.forEach((msg) => {
      const dateStr = new Date(msg.createdAt).toDateString();
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(msg);
    });
    return groups;
  };

  const renderDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  if (!activeChat) {
    return (
      <div className="chat-window-empty">
        <ImageIcon />
        <h2>Your Premium Space</h2>
        <p>Select a contact or open a group channel to begin your real-time conversation.</p>
      </div>
    );
  }

  const groupedMsgs = groupMessagesByDate(messages);

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info" onClick={onOpenDetails}>
          {onBack && (
            <button
              className="back-btn"
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <Avater
            user={isGroup ? { username: activeChat.name, avatar: activeChat.avatar } : activeChat}
            size="md"
            showStatus={!isGroup}
          />
          <div className="chat-header-details">
            <span className="chat-header-name">
              {isGroup ? activeChat.name : activeChat.username}
            </span>
            <span className="chat-header-status">
              {isGroup
                ? `${activeChat.members?.length || 0} members`
                : activeChat.isOnline
                ? 'Online now'
                : 'Offline'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
          <button className="icon-btn" onClick={onOpenDetails} title="View Details">
            <Eye size={20} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
            title="Options"
          >
            <MoreVertical size={20} />
          </button>

          {showOptionsDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.25rem',
                zIndex: 50,
                boxShadow: 'var(--shadow-lg)',
                minWidth: '150px',
              }}
            >
              <button
                onClick={handleReportChat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#ff4b72',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-family)',
                  fontSize: '0.85rem',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255, 75, 114, 0.1)')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                <AlertOctagon size={16} />
                Report {isGroup ? 'Group' : 'User'}
              </button>

              {!isGroup && (
                <button
                  onClick={handleBlockToggle}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#ff4b72',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-family)',
                    fontSize: '0.85rem',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255, 75, 114, 0.1)')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                >
                  <AlertOctagon size={16} />
                  {isBlocked ? 'Unblock User' : 'Block User'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages-container">
        {loading && messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Retrieving history...
          </div>
        ) : (
          Object.keys(groupedMsgs).map((dateStr) => (
            <React.Fragment key={dateStr}>
              <div className="date-divider">
                <span className="date-divider-text">{renderDateLabel(dateStr)}</span>
              </div>

              {groupedMsgs[dateStr].map((msg) => {
                const isSentByMe = msg.sender._id === currentUser._id;
                const showSeenReceipt = isSentByMe && msg.chatType === 'private';
                const isSeen = msg.seenBy && msg.seenBy.includes(isGroup ? '' : activeChat._id);
                const isMsgDeleted = msg.isDeleted;

                return (
                  <div
                    key={msg._id}
                    className={`message-bubble-wrapper ${isSentByMe ? 'sent' : 'received'}`}
                  >
                    <div
                      className={`message-bubble ${isMsgDeleted ? 'deleted' : ''}`}
                      style={{ position: 'relative' }}
                    >
                      {/* Show sender username in group messages */}
                      {isGroup && !isSentByMe && (
                        <span className="message-sender">{msg.sender.username}</span>
                      )}

                      {/* Content */}
                      {!isMsgDeleted && msg.mediaUrl && (
                        <div className="message-media">
                          <img
                            src={`${BACKEND_URL}${msg.mediaUrl}`}
                            alt="attachment"
                            onClick={() => window.open(`${BACKEND_URL}${msg.mediaUrl}`)}
                          />
                        </div>
                      )}

                      {isMsgDeleted ? (
                        <p className="message-content deleted">
                          🚫 This message was deleted
                        </p>
                      ) : (
                        msg.content && <p className="message-content">{msg.content}</p>
                      )}

                      {/* Footer Info */}
                      <div className="message-footer">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        {showSeenReceipt && (
                          <span
                            className="message-seen-icon"
                            style={{ color: isSeen ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                          >
                            {isSeen ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>

                      {/* Message Actions Menu (Only for non-deleted messages) */}
                      {!isMsgDeleted && (
                        <div className="message-actions-container">
                          <button
                            type="button"
                            className="message-actions-trigger"
                            onClick={() => setActiveMessageMenuId(activeMessageMenuId === msg._id ? null : msg._id)}
                            title="Message Options"
                          >
                            <ChevronDown size={14} />
                          </button>
                          
                          {activeMessageMenuId === msg._id && (
                            <div className="message-dropdown">
                              {msg.content && (
                                <button type="button" onClick={() => handleCopyText(msg.content)}>Copy Text</button>
                              )}
                              <button type="button" onClick={() => handleDeleteMessage(msg._id, 'me')}>Delete for Me</button>
                              {isSentByMe && (
                                <button type="button" onClick={() => handleDeleteMessage(msg._id, 'everyone')}>Delete for Everyone</button>
                              )}
                              {!isSentByMe && (
                                <button type="button" onClick={() => handleReportMessage(msg._id)}>Report Message</button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        {/* Typing indicator */}
        <div className="typing-indicator-container">
          {typingUser && (
            <div className="typing-text">
              <span>{typingUser} is writing</span>
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        {/* Media Preview inside Chat Area */}
        {mediaPreview && (
          <div className="input-media-preview-container">
            <img src={mediaPreview} alt="preview" className="media-preview-thumb" />
            <span className="media-preview-name">{mediaFile?.name}</span>
            <button className="icon-btn" onClick={removeMedia} style={{ padding: '0.25rem' }}>
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="chat-input-form">
          <button
            type="button"
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach File/Image"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileChange}
          />

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Emojis"
            >
              <Smile size={20} />
            </button>
            {showEmojiPicker && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.35rem',
                  zIndex: 60,
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => selectEmoji(emoji)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1.25rem',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.target.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="input-field-container">
            <textarea
              className="chat-textarea"
              placeholder="Type a premium message..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              rows={1}
            />
          </div>

          <button type="submit" className="btn" style={{ width: '44px', height: '44px', padding: 0, borderRadius: '50%' }}>
            <Send size={18} style={{ transform: 'translateX(1px)' }} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatwindow;
