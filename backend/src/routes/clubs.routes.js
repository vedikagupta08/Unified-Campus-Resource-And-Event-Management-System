import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// List clubs
router.get('/', authRequired, async (_req, res) => {
  const clubs = await prisma.club.findMany({ orderBy: { name: 'asc' } });
  res.json(clubs);
});

// Create club (admin only)
router.post('/', authRequired, adminOnly, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  const { name, description } = parsed.data;
  try {
    const club = await prisma.club.create({ data: { name, description } });
    res.json(club);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Club name already exists' });
    res.status(500).json({ error: 'Failed to create club' });
  }
});

// My memberships
router.get('/me', authRequired, async (req, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.user.id },
    include: { club: true },
  });
  res.json(memberships);
});

// Join a club as MEMBER
router.post('/:clubId/join', authRequired, async (req, res) => {
  const { clubId } = req.params;
  // Ensure club exists
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return res.status(404).json({ error: 'Club not found' });
  // Create membership if not exists
  const existing = await prisma.membership.findFirst({ where: { userId: req.user.id, clubId } });
  if (existing) return res.json(existing);
  const membership = await prisma.membership.create({
    data: { clubId, userId: req.user.id, role: 'MEMBER' },
  });
  res.json(membership);
});

// Leave a club
router.post('/:clubId/leave', authRequired, async (req, res) => {
  const { clubId } = req.params;
  const existing = await prisma.membership.findFirst({ where: { userId: req.user.id, clubId } });
  if (!existing) return res.status(404).json({ error: 'Membership not found' });
  await prisma.membership.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
