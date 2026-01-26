import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

// Admin: create resource
router.post('/', authRequired, adminOnly, async (req, res) => {
  const { name, type, requiresApproval = true, autoApprove = false, capacity } = req.body;
  const resource = await prisma.resource.create({ data: { name, type, requiresApproval, autoApprove, capacity } });
  res.json(resource);
});

// List resources
router.get('/', authRequired, async (_req, res) => {
  const resources = await prisma.resource.findMany({ orderBy: { name: 'asc' } });
  res.json(resources);
});

export default router;
