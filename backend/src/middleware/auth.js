const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in as admin.' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

function requireSupplier(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Supplier login required to submit a bid.' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (decoded.role !== 'supplier') {
      return res.status(403).json({ error: 'Supplier account required.' });
    }
    req.supplier = decoded; // { supplierId, companyName, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

module.exports = { requireAdmin, requireSupplier };

