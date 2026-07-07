const Message = require('../models/Message');

// @desc    Send a message (text or with media attachment)
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  const { content, chatType, receiverId, groupId } = req.body;
  let mediaUrl = '';

  try {
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    if (!content && !mediaUrl) {
      return res.status(400).json({ message: 'Cannot send empty message' });
    }

    if (!chatType || (chatType === 'private' && !receiverId) || (chatType === 'group' && !groupId)) {
      return res.status(400).json({ message: 'Invalid message routing details' });
    }

    // Check if user is blocked or has blocked the other user
    if (chatType === 'private') {
      const User = require('../models/User');
      const receiver = await User.findById(receiverId);
      if (receiver && receiver.blockedUsers.includes(req.user._id)) {
        return res.status(400).json({ message: 'You have been blocked by this user.' });
      }
      const sender = await User.findById(req.user._id);
      if (sender && sender.blockedUsers.includes(receiverId)) {
        return res.status(400).json({ message: 'You have blocked this user. Unblock to send messages.' });
      }
    }

    const msgData = {
      sender: req.user._id,
      content: content || '',
      mediaUrl,
      chatType,
      seenBy: [req.user._id],
    };

    if (chatType === 'private') {
      msgData.receiver = receiverId;
    } else {
      msgData.group = groupId;
    }

    let message = await Message.create(msgData);
    message = await message.populate('sender', 'username email avatar status isOnline lastSeen');
    
    if (chatType === 'private') {
      message = await message.populate('receiver', 'username email avatar status isOnline lastSeen');
    } else {
      message = await message.populate('group', 'name description avatar');
    }

    // Emit live socket event
    const io = req.app.get('io');
    if (io) {
      if (chatType === 'private') {
        io.to(receiverId.toString()).emit('messageReceived', message);
      } else {
        io.to(groupId.toString()).emit('messageReceived', message);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('SendMessage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages for a conversation (private or group)
// @route   GET /api/messages/:id
// @access  Private
const getMessages = async (req, res) => {
  const chatPartnerOrGroupId = req.params.id;
  const { isGroup } = req.query; // 'true' or 'false'

  try {
    let messages;
    if (isGroup === 'true') {
      messages = await Message.find({
        group: chatPartnerOrGroupId,
        deletedFor: { $ne: req.user._id },
      })
        .populate('sender', 'username email avatar status isOnline lastSeen')
        .sort({ createdAt: 1 });
    } else {
      messages = await Message.find({
        $or: [
          { sender: req.user._id, receiver: chatPartnerOrGroupId },
          { sender: chatPartnerOrGroupId, receiver: req.user._id },
        ],
        deletedFor: { $ne: req.user._id },
      })
        .populate('sender', 'username email avatar status isOnline lastSeen')
        .populate('receiver', 'username email avatar status isOnline lastSeen')
        .sort({ createdAt: 1 });
    }

    res.json(messages);
  } catch (error) {
    console.error('GetMessages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark messages as read/seen
// @route   PUT /api/messages/seen/:id
// @access  Private
const markAsRead = async (req, res) => {
  const conversationId = req.params.id; // User or Group ID
  const { isGroup } = req.body;

  try {
    let updated;
    if (isGroup) {
      updated = await Message.updateMany(
        { group: conversationId, seenBy: { $ne: req.user._id } },
        { $push: { seenBy: req.user._id } }
      );
    } else {
      updated = await Message.updateMany(
        {
          sender: conversationId,
          receiver: req.user._id,
          seenBy: { $ne: req.user._id },
        },
        { $push: { seenBy: req.user._id } }
      );
    }

    res.json({ message: 'Messages marked as read', modifiedCount: updated.modifiedCount });
  } catch (error) {
    console.error('MarkAsRead error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a message (for me or everyone)
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = async (req, res) => {
  const messageId = req.params.id;
  const { type } = req.query; // 'me' or 'everyone'

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (type === 'everyone') {
      // Must be the sender to delete for everyone
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: 'You can only delete your own messages for everyone' });
      }

      // Mark message as deleted
      message.content = 'This message was deleted';
      message.mediaUrl = ''; // Clear media url
      message.isDeleted = true;
      await message.save();

      // Emit live socket event so other users update their chat windows
      const io = req.app.get('io');
      if (io) {
        if (message.chatType === 'private') {
          io.to(message.receiver.toString()).emit('messageDeleted', { messageId, isDeletedForEveryone: true });
        } else {
          io.to(message.group.toString()).emit('messageDeleted', { messageId, isDeletedForEveryone: true });
        }
      }
    } else {
      // Delete for me
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }
    }

    res.json({ message: 'Message deleted successfully', messageId });
  } catch (error) {
    console.error('DeleteMessage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { sendMessage, getMessages, markAsRead, deleteMessage };
