const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-2024-finance-app'
    );
    const user = await User.findById(decoded.id);
    
    // Backward compatibility: old users may not have status yet
    const userStatus = user?.status || 'active';
    if (!user || userStatus !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user can modify transaction
exports.canModifyTransaction = async (req, res, next) => {
  const Transaction = require('../models/Transaction');
  const transaction = await Transaction.findById(req.params.id);
  
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found'
    });
  }
  
  if (req.user.role === 'admin' || transaction.createdBy.toString() === req.user._id.toString()) {
    req.transaction = transaction;
    return next();
  }
  
  res.status(403).json({
    success: false,
    message: 'You can only modify your own transactions'
  });
};