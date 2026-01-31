import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

// Recent audit logs for admin (latest 50) – who approved/rejected what, timestamp, entity
router.get('/recent', authRequired, adminOnly, async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { email: true, name: true } } }
  });
  res.json(logs);
});

export default router;

