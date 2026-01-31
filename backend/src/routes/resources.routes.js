import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Admin: create resource
router.post('/', authRequired, adminOnly, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    type: z.enum(['ROOM','HALL','LAB','EQUIPMENT']),
    requiresApproval: z.boolean().optional().default(true),
    autoApprove: z.boolean().optional().default(false),
    capacity: z.number().int().positive().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  const { name, type, requiresApproval, autoApprove, capacity } = parsed.data;
  try {
    const resource = await prisma.resource.create({
      data: { name, type, requiresApproval, autoApprove, capacity, active: true }
    });
    res.json(resource);
  } catch (e) {
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'A resource with this name already exists' });
    }
    return res.status(500).json({ error: 'Failed to create resource' });
  }
});

// List resources – admin sees all (including inactive); others see only active (for booking)
router.get('/', authRequired, async (req, res) => {
  const isAdmin = req.user.globalRole === 'ADMIN';
  const where = isAdmin ? {} : { active: true };
  const resources = await prisma.resource.findMany({ where, orderBy: { name: 'asc' } });
  if (!isAdmin) return res.json(resources);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const usageCounts = await prisma.booking.groupBy({
    by: ['resourceId'],
    where: { startTime: { gte: thirtyDaysAgo } },
    _count: { resourceId: true }
  });
  const usageByResource = Object.fromEntries(usageCounts.map(u => [u.resourceId, u._count.resourceId]));
  const withUsage = resources.map(r => ({
    ...r,
    usageLast30Days: usageByResource[r.id] ?? 0
  }));
  res.json(withUsage);
});

// Admin: set resource active/inactive (soft delete)
router.patch('/:id', authRequired, adminOnly, async (req, res) => {
  const { id } = req.params;
  const schema = z.object({ active: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return res.status(404).json({ error: 'Resource not found' });
  const updated = await prisma.resource.update({
    where: { id },
    data: { active: parsed.data.active }
  });
  res.json(updated);
});

export default router;
