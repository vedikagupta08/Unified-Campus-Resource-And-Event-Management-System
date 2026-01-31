import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// Current user profile with activity summary
router.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      department: true,
      academicYear: true,
      globalRole: true,
      createdAt: true,
      memberships: { include: { club: true } },
    }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const [eventsRegisteredCount, eventsOrganizedCount, eventsApprovedCount] = await Promise.all([
    prisma.registration.count({ where: { userId: req.user.id } }),
    prisma.event.count({ where: { createdById: req.user.id } }),
    prisma.event.count({ where: { createdById: req.user.id, status: 'APPROVED' } })
  ]);
  res.json({
    ...user,
    activitySummary: {
      eventsRegistered: eventsRegisteredCount,
      eventsOrganized: eventsOrganizedCount,
      eventsApproved: eventsApprovedCount
    }
  });
});

export default router;

