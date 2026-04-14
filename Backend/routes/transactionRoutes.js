const express = require('express');
const { 
  getTransactions, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction 
} = require('../controllers/transactionController');
const { protect, authorize, canModifyTransaction } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, authorize('viewer', 'analyst', 'admin'), getTransactions);
router.post('/', protect, authorize('viewer', 'analyst', 'admin'), createTransaction);
router.put('/:id', protect, authorize('analyst', 'admin'), canModifyTransaction, updateTransaction);
router.delete('/:id', protect, authorize('admin'), deleteTransaction);

module.exports = router;