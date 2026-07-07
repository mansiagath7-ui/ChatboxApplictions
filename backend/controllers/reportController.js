const Report = require('../models/Report');

// @desc    File a report for moderation
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res) => {
  const { reason, reportedUserId, reportedGroupId, reportedMessageId } = req.body;

  try {
    if (!reason) {
      return res.status(400).json({ message: 'Reason for report is required' });
    }

    const reportData = {
      reporter: req.user._id,
      reason,
    };

    if (reportedUserId) reportData.reportedUser = reportedUserId;
    if (reportedGroupId) reportData.reportedGroup = reportedGroupId;
    if (reportedMessageId) reportData.reportedMessage = reportedMessageId;

    const report = await Report.create(reportData);
    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    console.error('CreateReport error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createReport };
