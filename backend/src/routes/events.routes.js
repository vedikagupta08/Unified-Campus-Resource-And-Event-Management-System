import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// List published events for participants (must be BEFORE dynamic routes)
router.get('/public', async (_req, res) => {
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { startDate: 'asc' },
    include: {
      clubs: { include: { club: { select: { name: true } } } },
      createdBy: { select: { name: true } }
    }
  });
  res.json(events);
});

// Get one published event by id (no auth) — for event detail page
router.get('/public/:id', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id, status: 'PUBLISHED' },
    include: {
      clubs: { include: { club: { select: { name: true } } } },
      createdBy: { select: { name: true, email: true } },
      bookings: { where: { approved: true }, include: { resource: { select: { name: true, type: true } } } }
    }
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Create event (DRAFT) by organizer/head for at least one club
router.post('/', authRequired, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    clubIds: z.array(z.string().uuid()).min(1),
    budgetEstimate: z.number().int().nonnegative().optional(),
    participationFee: z.number().int().nonnegative().optional(),
    teamSizeMin: z.number().int().nonnegative().optional(),
    teamSizeMax: z.number().int().nonnegative().optional(),
    category: z.string().optional(),
    eligibilityTags: z.string().optional(),
    registrationDeadline: z.string().datetime().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  const { title, description, location, startDate, endDate, clubIds, budgetEstimate, participationFee, teamSizeMin, teamSizeMax, category, eligibilityTags, registrationDeadline } = parsed.data;
  const isAdmin = req.user.globalRole === 'ADMIN';
  if (!isAdmin) {
    const memberships = await prisma.membership.findMany({ where: { userId: req.user.id, clubId: { in: clubIds } } });
    const allowed = memberships.some(m => ['ORGANIZER','HEAD'].includes(m.clubRole));
    if (!allowed) return res.status(403).json({ error: 'Organizer/Head role required in at least one club' });
  }
  const event = await prisma.event.create({
    data: {
      title, description, location, startDate: new Date(startDate), endDate: new Date(endDate), createdById: req.user.id, budgetEstimate,
      participationFee, teamSizeMin, teamSizeMax, category, eligibilityTags,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
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
  const isAdmin = req.user.globalRole === 'ADMIN';
  if (event.createdById !== req.user.id && !isAdmin) return res.status(403).json({ error: "You don't have permission to perform this action." });
  res.json(event);
});

// Admin: list submitted events (must be before /:id)
router.get('/admin/submitted', authRequired, adminOnly, async (_req, res) => {
  const events = await prisma.event.findMany({
    where: { status: 'SUBMITTED' },
    orderBy: { createdAt: 'asc' }, // use submittedAt after running migrations that add Event.submittedAt
    include: {
      clubs: { include: { club: { select: { name: true } } } },
      createdBy: { select: { name: true, email: true } }
    }
  });
  res.json(events);
});

// Submit for approval
router.post('/:id/submit', authRequired, async (req, res) => {
  const { id } = req.params;
  const event = await prisma.event.findUnique({ where: { id }, include: { clubs: true } });
  if (!event) return res.status(404).json({ error: 'Not found' });
  const isAdmin = req.user.globalRole === 'ADMIN';
  if (event.createdById !== req.user.id && !isAdmin) return res.status(403).json({ error: "You don't have permission to perform this action." });
  if (event.status !== 'DRAFT') return res.status(400).json({ error: 'Only DRAFT can be submitted' });
  const updated = await prisma.event.update({
    where: { id },
    data: { status: 'SUBMITTED' } // add submittedAt: new Date() after running migrations for Event.submittedAt
  });
  res.json(updated);
});

// Approve/Reject (Admin only) – rejection reason is mandatory
router.post('/:id/review', authRequired, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { approve, reason } = req.body;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: 'Not found' });
  if (event.status !== 'SUBMITTED') return res.status(400).json({ error: 'Only SUBMITTED can be reviewed' });
  if (!approve && (!reason || typeof reason !== 'string' || !reason.trim())) {
    return res.status(400).json({ error: 'Rejection reason is required when rejecting an event.' });
  }
  const rejectionReasonVal = approve ? null : (reason || '').trim();
  const data = approve ? { status: 'APPROVED', rejectionReason: null } : { status: 'REJECTED', rejectionReason: rejectionReasonVal };
  const updated = await prisma.event.update({ where: { id }, data });
  const category = 'Events';
  await prisma.notification.create({
    data: {
      userId: event.createdById,
      type: 'EVENT_REVIEW',
      category,
      message: approve
        ? `Your event "${event.title}" was approved.`
        : `Your event "${event.title}" was rejected: ${rejectionReasonVal}`,
    }
  });
  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'EVENT_REVIEW',
      entity: 'Event',
      entityId: event.id,
      metadata: { approve, reason: rejectionReasonVal || null }
    }
  });
  res.json(updated);
});

// Publish (only APPROVED)
router.post('/:id/publish', authRequired, async (req, res) => {
  const { id } = req.params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: 'Not found' });
  const isAdmin = req.user.globalRole === 'ADMIN';
  if (event.createdById !== req.user.id && !isAdmin) return res.status(403).json({ error: "You don't have permission to perform this action." });
  if (event.status !== 'APPROVED') return res.status(400).json({ error: 'Only APPROVED can be published' });
  const updated = await prisma.event.update({ where: { id }, data: { status: 'PUBLISHED' } });
  res.json(updated);
});

// (moved '/public' route above dynamic routes)

export default router;
