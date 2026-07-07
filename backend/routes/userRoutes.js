const express = require('express');
const { getUsers, updateProfile, updateAvatar, blockUser, unblockUser, deleteUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/', protect, getUsers);
router.put('/profile', protect, updateProfile);
router.delete('/profile', protect, deleteUserProfile);
router.post('/avatar', protect, upload.single('avatar'), updateAvatar);
router.put('/block/:id', protect, blockUser);
router.put('/unblock/:id', protect, unblockUser);

module.exports = router;
