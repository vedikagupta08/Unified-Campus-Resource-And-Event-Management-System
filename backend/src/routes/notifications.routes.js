import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

const MIGRATE_MSG = 'Database schema outdated. Run: cd backend && npx prisma migrate dev';

// List my notifications (newest first); optional ?category=Events|Bookings|System
router.get('/me', authRequired, async (req, res) => {
  try {
    const { category } = req.query;
    const where = { userId: req.user.id };
    if (category && ['Events', 'Bookings', 'System'].includes(String(category))) {
      where.category = String(category);
    }
    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return res.json(items);
  } catch (e) {
    if (e.code === 'P2010' || e.message?.includes('Unknown column') || e.message?.includes('category') || e.message?.includes('readAt')) {
      try {
        const items = await prisma.notification.findMany({
          where: { userId: req.user.id },
          orderBy: { createdAt: 'desc' },
        });
        return res.json(items);
      } catch (e2) {
        return res.status(503).json({ error: MIGRATE_MSG });
      }
    }
    throw e;
  }
});

// Unread count
router.get('/me/unread-count', authRequired, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    });
    return res.json({ count });
  } catch (e) {
    if (e.code === 'P2010' || e.message?.includes('Unknown column')) {
      return res.status(503).json({ error: MIGRATE_MSG });
    }
    throw e;
  }
});

// Mark a notification as read (uses only read: true so it works before migrations add readAt)
router.patch('/:id/read', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) return res.status(404).json({ error: 'Not found' });
    if (n.userId !== req.user.id) return res.status(403).json({ error: "You don't have permission to perform this action." });
    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
    return res.json(updated);
  } catch (e) {
    if (e.code === 'P2010' || e.message?.includes('Unknown column') || e.message?.includes('readAt')) {
      const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
      if (!n) return res.status(404).json({ error: 'Not found' });
      if (n.userId !== req.user.id) return res.status(403).json({ error: "You don't have permission to perform this action." });
      await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
      return res.json({ ...n, read: true });
    }
    throw e;
  }
});

// Mark all as read
router.post('/me/mark-all-read', authRequired, async (req, res) => {
  try {
    const schema = z.object({ before: z.string().datetime().optional() });
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
    const before = parsed.data.before ? new Date(parsed.data.before) : null;
    const where = before
      ? { userId: req.user.id, read: false, createdAt: { lte: before } }
      : { userId: req.user.id, read: false };
    const result = await prisma.notification.updateMany({
      where,
      data: { read: true, readAt: new Date() },
    });
    return res.json({ updated: result.count });
  } catch (e) {
    if (e.code === 'P2010' || e.message?.includes('Unknown column') || e.message?.includes('readAt')) {
      const before = req.body?.before ? new Date(req.body.before) : null;
      const where = before
        ? { userId: req.user.id, read: false, createdAt: { lte: before } }
        : { userId: req.user.id, read: false };
      const result = await prisma.notification.updateMany({ where, data: { read: true } });
      return res.json({ updated: result.count });
    }
    throw e;
  }
});

export default router;

