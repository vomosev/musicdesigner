function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'Authentication required.',
    });
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'Authentication required.',
    });
  }

  if (req.session.user.role !== 'administrator') {
    return res.status(403).json({
      error: 'Administrator access required.',
    });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};