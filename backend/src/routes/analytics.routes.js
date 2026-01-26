import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authRequired, adminOnly, async (_req, res) => {
  const [eventsPerClub, resourceUtilization, participation, clubs] = await Promise.all([
    prisma.eventClub.groupBy({ by: ['clubId'], _count: { clubId: true } }),
    prisma.booking.count(),
    prisma.registration.count(),
    prisma.club.findMany({ select: { id: true, name: true } })
  ]);
  res.json({ eventsPerClub, resourceUtilization, participation, clubs });
});

export default router;
