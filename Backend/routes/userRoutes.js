const express = require('express');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  getRoles
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/roleCheck');

const router = express.Router();

// All user management routes require authentication and manageUsers permission
router.use(protect);
router.use(checkPermission('manageUsers'));

router.route('/')
  .get(getUsers)
  .post(createUser);

router.get('/roles', getRoles);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

router.put('/:id/status', updateUserStatus);

module.exports = router;