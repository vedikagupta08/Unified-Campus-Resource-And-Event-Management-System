import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { z } from 'zod';

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

// List registrations for a specific event – event creator or admin only
router.get('/by-event/:eventId/list', authRequired, async (req, res) => {
  const { eventId } = req.params;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.createdById !== req.user.id && req.user.globalRole !== 'ADMIN') {
    return res.status(403).json({ error: "You don't have permission to perform this action." });
  }
  const regs = await prisma.registration.findMany({
    where: { eventId },
    include: {
      user: {
        select: { id: true, name: true, email: true, department: true, academicYear: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json(regs);
});

// Register for a published event, optionally updating student's academic info
router.post('/', authRequired, async (req, res) => {
  const schema = z.object({
    eventId: z.string().uuid(),
    department: z.string().max(100).optional(),
    academicYear: z.string().max(50).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  }
  const { eventId, department, academicYear } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.status !== 'PUBLISHED') {
    return res.status(400).json({ error: 'Only PUBLISHED events are open for registration' });
  }
  const deadline = event.registrationDeadline || event.startDate;
  if (new Date() > new Date(deadline)) {
    return res.status(400).json({
      error: 'Registration closed',
      registrationClosedOn: deadline
    });
  }

  // Update student's profile info if provided
  if (department || academicYear) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(department ? { department } : {}),
        ...(academicYear ? { academicYear } : {}),
      },
    });
  }

  try {
    const reg = await prisma.registration.create({ data: { eventId, userId: req.user.id } });
    res.json(reg);
  } catch (e) {
    // Unique constraint -> already registered
    const existing = await prisma.registration.findFirst({
      where: { eventId, userId: req.user.id },
      include: { event: true },
    });
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
