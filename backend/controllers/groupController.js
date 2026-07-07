const Group = require('../models/Group');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  const { name, description, members } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    let parsedMembers = [];
    if (members) {
      try {
        parsedMembers = JSON.parse(members);
      } catch (err) {
        // If members is sent as a list of strings instead of JSON string
        parsedMembers = Array.isArray(members) ? members : [members];
      }
    }

    const myIdStr = req.user._id.toString();
    if (!parsedMembers.includes(myIdStr)) {
      parsedMembers.push(myIdStr);
    }

    const groupData = {
      name: name.trim(),
      description: description ? description.trim() : 'No description provided.',
      createdBy: req.user._id,
      admins: [req.user._id],
      members: parsedMembers,
    };

    if (req.file) {
      groupData.avatar = `/uploads/${req.file.filename}`;
    }

    const newGroup = await Group.create(groupData);
    const populatedGroup = await Group.findById(newGroup._id)
      .populate('members', 'username email avatar status isOnline lastSeen')
      .populate('admins', 'username email avatar status isOnline lastSeen')
      .populate('createdBy', 'username email avatar status');

    res.status(201).json(populatedGroup);
  } catch (error) {
    console.error('CreateGroup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's joined groups
// @route   GET /api/groups
// @access  Private
const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'username email avatar status isOnline lastSeen')
      .populate('admins', 'username email avatar status isOnline lastSeen')
      .populate('createdBy', 'username email avatar status');
    res.json(groups);
  } catch (error) {
    console.error('GetUserGroups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get group details
// @route   GET /api/groups/:id
// @access  Private
const getGroupDetails = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'username email avatar status isOnline lastSeen')
      .populate('admins', 'username email avatar status isOnline lastSeen')
      .populate('createdBy', 'username email avatar status');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    res.json(group);
  } catch (error) {
    console.error('GetGroupDetails error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update group settings or membership (add members)
// @route   PUT /api/groups/:id/add
// @access  Private
const addMembers = async (req, res) => {
  const { memberIds } = req.body;

  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.admins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Only group admins can add members' });
    }

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ message: 'Invalid member ids payload' });
    }

    memberIds.forEach(id => {
      if (!group.members.includes(id)) {
        group.members.push(id);
      }
    });

    await group.save();
    const updatedGroup = await Group.findById(group._id)
      .populate('members', 'username email avatar status isOnline lastSeen')
      .populate('admins', 'username email avatar status isOnline lastSeen');

    res.json(updatedGroup);
  } catch (error) {
    console.error('AddMembers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Kick member from group
// @route   PUT /api/groups/:id/kick
// @access  Private
const kickMember = async (req, res) => {
  const { memberId } = req.body;

  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.admins.includes(req.user._id.toString())) {
      return res.status(403).json({ message: 'Only admins can kick members' });
    }

    if (memberId === group.createdBy.toString()) {
      return res.status(400).json({ message: 'Cannot kick the creator of the group' });
    }

    group.members = group.members.filter(id => id.toString() !== memberId);
    group.admins = group.admins.filter(id => id.toString() !== memberId);

    await group.save();
    const updatedGroup = await Group.findById(group._id)
      .populate('members', 'username email avatar status isOnline lastSeen')
      .populate('admins', 'username email avatar status isOnline lastSeen');

    res.json(updatedGroup);
  } catch (error) {
    console.error('KickMember error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Leave group
// @route   PUT /api/groups/:id/leave
// @access  Private
const leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const myIdStr = req.user._id.toString();
    if (!group.members.includes(myIdStr)) {
      return res.status(400).json({ message: 'You are not in this group' });
    }

    if (group.createdBy.toString() === myIdStr) {
      return res.status(400).json({ message: 'Group creator cannot leave the group.' });
    }

    group.members = group.members.filter(id => id.toString() !== myIdStr);
    group.admins = group.admins.filter(id => id.toString() !== myIdStr);

    if (group.admins.length === 0 && group.members.length > 0) {
      group.admins.push(group.members[0]);
    }

    await group.save();
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('LeaveGroup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createGroup, getUserGroups, getGroupDetails, addMembers, kickMember, leaveGroup };
