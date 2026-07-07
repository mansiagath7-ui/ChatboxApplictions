const express = require('express');
const {
  createGroup,
  getUserGroups,
  getGroupDetails,
  addMembers,
  kickMember,
  leaveGroup,
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, upload.single('avatar'), createGroup);
router.get('/', protect, getUserGroups);
router.get('/:id', protect, getGroupDetails);
router.put('/:id/add', protect, addMembers);
router.put('/:id/kick', protect, kickMember);
router.put('/:id/leave', protect, leaveGroup);

module.exports = router;
