const express = require('express');
const { 
  getUsers, 
  createUser, 
  updateUserRole, 
  updateUserStatus, 
  deleteUser 
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;