const express = require('express');
const { sendMessage, getMessages, markAsRead, deleteMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, upload.single('media'), sendMessage);
router.get('/:id', protect, getMessages);
router.put('/seen/:id', protect, markAsRead);
router.delete('/:id', protect, deleteMessage);

module.exports = router;
