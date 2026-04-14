exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !req.user.role.permissions) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. No permissions assigned.'
      });
    }

    if (req.user.role.permissions[permission]) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `Access denied. You don't have ${permission} permission.`
      });
    }
  };
};

exports.checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (roles.includes(req.user.role.name)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }
  };
};