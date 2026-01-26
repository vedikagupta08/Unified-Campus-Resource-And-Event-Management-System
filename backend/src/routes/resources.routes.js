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
    const resource = await prisma.resource.create({ data: { name, type, requiresApproval, autoApprove, capacity } });
    res.json(resource);
  } catch (e) {
    // Handle unique constraint (e.g., name unique)
    if (e?.code === 'P2002') {
      return res.status(409).json({ error: 'A resource with this name already exists' });
    }
    return res.status(500).json({ error: 'Failed to create resource' });
  }
});

// List resources
router.get('/', authRequired, async (_req, res) => {
  const resources = await prisma.resource.findMany({ orderBy: { name: 'asc' } });
  res.json(resources);
});

export default router;
