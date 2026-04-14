const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboardController');

router.get('/', protect, authorize('viewer', 'analyst', 'admin'), getDashboard);
router.get('/summary', protect, authorize('viewer', 'analyst', 'admin'), getDashboard);

module.exports = router;