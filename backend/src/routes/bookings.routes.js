import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

// List pending bookings (admin review queue)
router.get('/pending', authRequired, adminOnly, async (_req, res) => {
  const items = await prisma.booking.findMany({
    where: { approved: false, rejected: false },
    include: { event: true, resource: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(items);
});

// Request booking for an event's resource
router.post('/', authRequired, async (req, res) => {
  const { eventId, resourceId, startTime, endTime } = req.body;
  if (!eventId || !resourceId || !startTime || !endTime) return res.status(400).json({ error: 'Missing fields' });
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.createdById !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  // conflict detection
  const conflicts = await prisma.booking.findFirst({
    where: {
      resourceId,
      OR: [
        { startTime: { lte: new Date(endTime) }, endTime: { gte: new Date(startTime) } }
      ]
    }
  });
  if (conflicts) return res.status(409).json({ error: 'Time slot conflict' });
  const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
  let approved = false;
  if (resource && (resource.autoApprove || !resource.requiresApproval)) {
    approved = true;
  }
  const booking = await prisma.booking.create({
    data: { eventId, resourceId, startTime: new Date(startTime), endTime: new Date(endTime), approved }
  });
  res.json(booking);
});

// Admin approval/rejection
router.post('/:id/review', authRequired, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { approve, reason } = req.body;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.booking.update({ where: { id }, data: approve ? { approved: true, rejected: false, rejectionReason: null } : { approved: false, rejected: true, rejectionReason: reason || 'Not specified' } });
  res.json(updated);
});

export default router;
