import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

// Create event (DRAFT) by organizer/head for at least one club
router.post('/', authRequired, async (req, res) => {
  const { title, description, startDate, endDate, clubIds, budgetEstimate } = req.body;
  if (!title || !startDate || !endDate || !Array.isArray(clubIds) || clubIds.length === 0) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  // Ensure user is organizer/head of at least one provided club unless admin
  if (!req.user.isAdmin) {
    const memberships = await prisma.membership.findMany({ where: { userId: req.user.id, clubId: { in: clubIds } } });
    const allowed = memberships.some(m => ['ORGANIZER','HEAD'].includes(m.role));
    if (!allowed) return res.status(403).json({ error: 'Organizer/Head role required in at least one club' });
  }
  const event = await prisma.event.create({
    data: {
      title, description, startDate: new Date(startDate), endDate: new Date(endDate), createdById: req.user.id, budgetEstimate,
      clubs: { create: clubIds.map(cid => ({ clubId: cid })) }
    },
    include: { clubs: true }
  });
  res.json(event);
});

// List my created events
router.get('/', authRequired, async (req, res) => {
  const events = await prisma.event.findMany({ where: { createdById: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json(events);
});

// Get one event
router.get('/:id', authRequired, async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: { clubs: true, bookings: true, registrations: true } });
  if (!event) return res.status(404).json({ error: 'Not found' });
  if (event.createdById !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  res.json(event);
});

// Submit for approval
router.post('/:id/submit', authRequired, async (req, res) => {
  const { id } = req.params;
  const event = await prisma.event.findUnique({ where: { id }, include: { clubs: true } });
  if (!event) return res.status(404).json({ error: 'Not found' });
  if (event.createdById !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  if (event.status !== 'DRAFT') return res.status(400).json({ error: 'Only DRAFT can be submitted' });
  const updated = await prisma.event.update({ where: { id }, data: { status: 'SUBMITTED' } });
  res.json(updated);
});

// Approve/Reject (Admin only)
router.post('/:id/review', authRequired, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { approve, reason } = req.body;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: 'Not found' });
  if (event.status !== 'SUBMITTED') return res.status(400).json({ error: 'Only SUBMITTED can be reviewed' });
  const data = approve ? { status: 'APPROVED', rejectionReason: null } : { status: 'REJECTED', rejectionReason: reason || 'Not specified' };
  const updated = await prisma.event.update({ where: { id }, data });
  res.json(updated);
});

// Publish (only APPROVED)
router.post('/:id/publish', authRequired, async (req, res) => {
  const { id } = req.params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: 'Not found' });
  if (event.createdById !== req.user.id && !req.user.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  if (event.status !== 'APPROVED') return res.status(400).json({ error: 'Only APPROVED can be published' });
  const updated = await prisma.event.update({ where: { id }, data: { status: 'PUBLISHED' } });
  res.json(updated);
});

// List published events for participants
router.get('/public', async (_req, res) => {
  const events = await prisma.event.findMany({ where: { status: 'PUBLISHED' }, orderBy: { startDate: 'asc' } });
  res.json(events);
});

export default router;
