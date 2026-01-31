import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Public signup: always creates STUDENT
router.post('/register', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(6)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash, globalRole: 'STUDENT' } });
  res.json({ id: user.id, email: user.email, name: user.name, globalRole: user.globalRole });
});

// Login returns token with globalRole
router.post('/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, email: user.email, globalRole: user.globalRole }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, globalRole: user.globalRole } });
});

// Admin-only: create another admin
router.post('/create-admin', authRequired, adminOnly, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(6)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash, globalRole: 'ADMIN' } });
  res.json({ id: user.id, email: user.email, name: user.name, globalRole: user.globalRole });
});

// TEMP: backfill globalRole for existing users (remove after use)
router.post('/backfill-roles', authRequired, adminOnly, async (req, res) => {
  const updated = await prisma.user.updateMany({
    where: { globalRole: null },
    data: { globalRole: 'STUDENT' }
  });
  res.json({ message: `Backfilled ${updated.count} users to STUDENT.` });
});

export default router;
