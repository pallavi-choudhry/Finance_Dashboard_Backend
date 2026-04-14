const express = require('express');
const {
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getDashboardStats
} = require('../controllers/recordController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard stats
router.get('/dashboard/stats', checkPermission('viewDashboard'), getDashboardStats);

// Record routes
router.route('/')
  .get(checkPermission('viewRecords'), getRecords)
  .post(checkPermission('createRecords'), createRecord);

router.route('/:id')
  .get(checkPermission('viewRecords'), getRecord)
  .put(checkPermission('updateRecords'), updateRecord)
  .delete(checkPermission('deleteRecords'), deleteRecord);

module.exports = router;