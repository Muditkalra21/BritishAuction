const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const registerSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/supplier/register
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { companyName, email, password } = parsed.data;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const supplier = await prisma.supplier.create({
      data: { companyName, email, passwordHash },
    });
    const token = jwt.sign(
      { supplierId: supplier.id, companyName: supplier.companyName, email: supplier.email, role: 'supplier' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.status(201).json({
      token,
      expiresIn: '12h',
      supplier: { id: supplier.id, companyName: supplier.companyName, email: supplier.email },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.includes('email') ? 'email' : 'companyName';
      return res.status(409).json({ error: `This ${field === 'email' ? 'email' : 'company name'} is already registered.` });
    }
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/supplier/login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }
  const { email, password } = parsed.data;
  try {
    const supplier = await prisma.supplier.findUnique({ where: { email } });
    if (!supplier) return res.status(401).json({ error: 'No account found with that email.' });
    const valid = await bcrypt.compare(password, supplier.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password.' });
    const token = jwt.sign(
      { supplierId: supplier.id, companyName: supplier.companyName, email: supplier.email, role: 'supplier' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      token,
      expiresIn: '12h',
      supplier: { id: supplier.id, companyName: supplier.companyName, email: supplier.email },
    });
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/supplier/verify
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (decoded.role !== 'supplier') return res.status(403).json({ error: 'Not a supplier token' });
    res.json({ valid: true, supplier: { companyName: decoded.companyName, email: decoded.email } });
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
});

module.exports = router;
