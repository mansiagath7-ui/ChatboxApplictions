const User = require('../models/User');

// @desc    Get all users or search users
// @route   GET /api/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { username: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.json(users);
  } catch (error) {
    console.error('GetUsers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile (status or username)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  const { username, status } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username) {
      const usernameExists = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (usernameExists) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      user.username = username;
    }

    if (status !== undefined) {
      user.status = status;
    }

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    console.error('UpdateProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user avatar image
// @route   POST /api/users/avatar
// @access  Private
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.avatar = `/uploads/${req.file.filename}`;
    const updatedUser = await user.save();

    res.json(updatedUser);
  } catch (error) {
    console.error('UpdateAvatar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Block a user
// @route   PUT /api/users/block/:id
// @access  Private
const blockUser = async (req, res) => {
  const userIdToBlock = req.params.id;

  try {
    if (userIdToBlock === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot block yourself' });
    }

    const user = await User.findById(req.user._id);
    if (!user.blockedUsers.includes(userIdToBlock)) {
      user.blockedUsers.push(userIdToBlock);
      await user.save();
    }

    const updatedUser = await User.findById(req.user._id);
    res.json(updatedUser);
  } catch (error) {
    console.error('BlockUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Unblock a user
// @route   PUT /api/users/unblock/:id
// @access  Private
const unblockUser = async (req, res) => {
  const userIdToUnblock = req.params.id;

  try {
    const user = await User.findById(req.user._id);
    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== userIdToUnblock
    );
    await user.save();

    const updatedUser = await User.findById(req.user._id);
    res.json(updatedUser);
  } catch (error) {
    console.error('UnblockUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user account/profile
// @route   DELETE /api/users/profile
// @access  Private
const deleteUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Remove from all groups
    const Group = require('../models/Group');
    await Group.updateMany(
      { members: userId },
      { $pull: { members: userId, admins: userId } }
    );

    // 2. Clean up empty groups
    await Group.deleteMany({ members: { $size: 0 } });

    // 3. Delete the User document
    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('DeleteProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getUsers, updateProfile, updateAvatar, blockUser, unblockUser, deleteUserProfile };
