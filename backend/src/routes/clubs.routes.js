import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const MIGRATE_MSG = 'Database schema outdated. Run: cd backend && npx prisma migrate dev';

// List clubs with last event date for activity badge (Active = event in last 60 days)
router.get('/', authRequired, async (_req, res) => {
  try {
    const clubs = await prisma.club.findMany({ orderBy: { name: 'asc' } });
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const lastEventPerClub = await prisma.eventClub.findMany({
      where: { event: { startDate: { lte: new Date() } } },
      select: { clubId: true, event: { select: { startDate: true } } },
      orderBy: { event: { startDate: 'desc' } }
    });
    const byClub = new Map();
    for (const ec of lastEventPerClub) {
      if (!byClub.has(ec.clubId)) byClub.set(ec.clubId, ec.event.startDate);
    }
    const withActivity = clubs.map(c => ({
      ...c,
      lastEventAt: byClub.get(c.id) || null,
      active: byClub.has(c.id) && new Date(byClub.get(c.id)) >= sixtyDaysAgo
    }));
    return res.json(withActivity);
  } catch (e) {
    console.error('clubs GET /', e);
    return res.status(503).json({ error: MIGRATE_MSG });
  }
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
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user.id },
      include: { club: true },
    });
    return res.json(memberships);
  } catch (e) {
    console.error('clubs GET /me', e);
    return res.status(503).json({ error: MIGRATE_MSG });
  }
});

// My pending role requests (for UI to show "Pending" vs "Request organizer")
router.get('/me/role-requests', authRequired, async (req, res) => {
  try {
    const requests = await prisma.roleRequest.findMany({
      where: { userId: req.user.id, status: 'PENDING' },
      select: { clubId: true, id: true }
    });
    return res.json(requests);
  } catch (e) {
    if (e.code === 'P2021' || e.message?.includes('RoleRequest') || e.message?.includes('does not exist')) {
      return res.json([]);
    }
    console.error('clubs GET /me/role-requests', e);
    return res.status(503).json({ error: MIGRATE_MSG });
  }
});

// Club members list – admin or organizer/head of this club
router.get('/:clubId/members', authRequired, async (req, res) => {
  const { clubId } = req.params;
  const isAdmin = req.user.globalRole === 'ADMIN';
  if (!isAdmin) {
    const me = await prisma.membership.findFirst({ where: { userId: req.user.id, clubId } });
    if (!me || !['ORGANIZER', 'HEAD'].includes(me.clubRole)) {
      return res.status(403).json({ error: "You don't have permission to perform this action." });
    }
  }
  const members = await prisma.membership.findMany({
    where: { clubId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' }
  });
  res.json(members);
});

// Join a club as MEMBER
router.post('/:clubId/join', authRequired, async (req, res) => {
  const { clubId } = req.params;
  // Ensure club exists
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return res.status(404).json({ error: 'Club not found' });
  // Create membership if not exists; default to MEMBER
  const existing = await prisma.membership.findFirst({ where: { userId: req.user.id, clubId } });
  if (existing) return res.json(existing);
  const membership = await prisma.membership.create({
    data: { clubId, userId: req.user.id, clubRole: 'MEMBER' },
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

// Member requests organizer role (creates PENDING RoleRequest)
router.post('/:clubId/request-organizer', authRequired, async (req, res) => {
  try {
    const { clubId } = req.params;
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) return res.status(404).json({ error: 'Club not found' });
    const membership = await prisma.membership.findFirst({ where: { userId: req.user.id, clubId } });
    if (!membership) return res.status(400).json({ error: 'You must be a member to request organizer role' });
    if (membership.clubRole !== 'MEMBER') return res.status(400).json({ error: 'You already have a higher role' });
    const existing = await prisma.roleRequest.findUnique({ where: { userId_clubId: { userId: req.user.id, clubId } } });
    if (existing) {
      if (existing.status === 'PENDING') return res.status(409).json({ error: 'You already have a pending request' });
      if (existing.status === 'APPROVED') return res.status(400).json({ error: 'Your request was already approved' });
    }
    const request = await prisma.roleRequest.upsert({
      where: { userId_clubId: { userId: req.user.id, clubId } },
      update: { status: 'PENDING', requestedRole: 'ORGANIZER' },
      create: { userId: req.user.id, clubId, requestedRole: 'ORGANIZER', status: 'PENDING' }
    });
    return res.json(request);
  } catch (e) {
    if (e.code === 'P2021' || e.message?.includes('RoleRequest') || e.message?.includes('does not exist')) {
      return res.status(503).json({ error: MIGRATE_MSG });
    }
    throw e;
  }
});

// List pending role requests for this club – admin or HEAD only
router.get('/:clubId/role-requests', authRequired, async (req, res) => {
  try {
    const { clubId } = req.params;
    const isAdmin = req.user.globalRole === 'ADMIN';
    if (!isAdmin) {
      const me = await prisma.membership.findFirst({ where: { userId: req.user.id, clubId } });
      if (!me || me.clubRole !== 'HEAD') return res.status(403).json({ error: "You don't have permission to perform this action." });
    }
    const requests = await prisma.roleRequest.findMany({
      where: { clubId, status: 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    return res.json(requests);
  } catch (e) {
    if (e.code === 'P2021' || e.message?.includes('RoleRequest') || e.message?.includes('does not exist')) {
      return res.json([]);
    }
    throw e;
  }
});

// Approve or reject a role request – admin or HEAD
router.patch('/:clubId/role-requests/:requestId', authRequired, async (req, res) => {
  try {
    const { clubId, requestId } = req.params;
    const schema = z.object({ approve: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
    const isAdmin = req.user.globalRole === 'ADMIN';
    if (!isAdmin) {
      const me = await prisma.membership.findFirst({ where: { userId: req.user.id, clubId } });
      if (!me || me.clubRole !== 'HEAD') return res.status(403).json({ error: "You don't have permission to perform this action." });
    }
    const roleRequest = await prisma.roleRequest.findFirst({ where: { id: requestId, clubId }, include: { user: true } });
    if (!roleRequest) return res.status(404).json({ error: 'Request not found' });
    if (roleRequest.status !== 'PENDING') return res.status(400).json({ error: 'Request already reviewed' });
    const now = new Date();
    if (parsed.data.approve) {
      await prisma.membership.updateMany({
        where: { userId: roleRequest.userId, clubId },
        data: { clubRole: roleRequest.requestedRole }
      });
    }
    const updated = await prisma.roleRequest.update({
      where: { id: requestId },
      data: { status: parsed.data.approve ? 'APPROVED' : 'REJECTED', reviewedAt: now }
    });
    return res.json(updated);
  } catch (e) {
    if (e.code === 'P2021' || e.message?.includes('RoleRequest') || e.message?.includes('does not exist')) {
      return res.status(503).json({ error: MIGRATE_MSG });
    }
    throw e;
  }
});

// Update a member's clubRole – admin or HEAD of this club
router.patch('/:clubId/members/:membershipId/role', authRequired, async (req, res) => {
  const { clubId, membershipId } = req.params;
  const isAdmin = req.user.globalRole === 'ADMIN';
  const bodySchema = z.object({ clubRole: z.enum(['MEMBER', 'ORGANIZER', 'HEAD']) });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });

  const target = await prisma.membership.findUnique({ where: { id: membershipId } });
  if (!target || target.clubId !== clubId) return res.status(404).json({ error: 'Membership not found' });

  let canManage = isAdmin;
  if (!isAdmin) {
    const me = await prisma.membership.findFirst({ where: { userId: req.user.id, clubId } });
    if (me && me.clubRole === 'HEAD') canManage = true;
  }
  if (!canManage) return res.status(403).json({ error: "You don't have permission to perform this action." });

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { clubRole: parsed.data.clubRole }
  });
  res.json(updated);
});

export default router;
