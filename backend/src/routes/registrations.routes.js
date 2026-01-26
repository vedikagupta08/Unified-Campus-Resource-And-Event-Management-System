import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// List my registrations
router.get('/me', authRequired, async (req, res) => {
  const regs = await prisma.registration.findMany({
    where: { userId: req.user.id },
    include: { event: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(regs);
});

// Register for a published event
router.post('/', authRequired, async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ error: 'eventId required' });
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status !== 'PUBLISHED') return res.status(400).json({ error: 'Only PUBLISHED events are open for registration' });
  try {
    const reg = await prisma.registration.create({ data: { eventId, userId: req.user.id } });
    res.json(reg);
  } catch (e) {
    // Unique constraint -> already registered
    const existing = await prisma.registration.findFirst({ where: { eventId, userId: req.user.id } });
    if (existing) return res.json(existing);
    throw e;
  }
});

// Unregister by event
router.delete('/by-event/:eventId', authRequired, async (req, res) => {
  const { eventId } = req.params;
  const existing = await prisma.registration.findFirst({ where: { eventId, userId: req.user.id } });
  if (!existing) return res.status(404).json({ error: 'Not registered' });
  await prisma.registration.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

export default router;
