import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = Router();

// Pending attention: counts for admin dashboard
router.get('/pending-attention', authRequired, adminOnly, async (_req, res) => {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const [pendingEventApprovals, pendingBookings, totalClubs, recentEventClubIds] = await Promise.all([
    prisma.event.count({ where: { status: 'SUBMITTED' } }),
    prisma.booking.count({ where: { approved: false, rejected: false } }),
    prisma.club.count(),
    prisma.eventClub.findMany({
      where: { event: { startDate: { gte: sixtyDaysAgo } } },
      select: { clubId: true }
    })
  ]);
  const recentSet = new Set(recentEventClubIds.map(ec => ec.clubId));
  const clubsInactive60Days = totalClubs - recentSet.size;
  res.json({
    pendingEventApprovals,
    pendingBookings,
    clubsInactive60Days: Math.max(0, clubsInactive60Days)
  });
});

router.get('/summary', authRequired, adminOnly, async (req, res) => {
  const { from, to } = req.query;
  let fromDate = undefined;
  let toDate = undefined;
  try {
    if (from) {
      const d = new Date(from);
      // normalize to start of day
      d.setHours(0, 0, 0, 0);
      fromDate = d;
    }
    if (to) {
      const d = new Date(to);
      // normalize to end of day (inclusive)
      d.setHours(23, 59, 59, 999);
      toDate = d;
    }
  } catch {}

  // For events and bookings, use overlap logic with the selected range, not strict containment.
  // This ensures items that touch the range edges are included.
  const eventWhere = (fromDate || toDate)
    ? { event: {
        AND: [
          toDate ? { startDate: { lte: toDate } } : {},
          fromDate ? { endDate: { gte: fromDate } } : {}
        ]
      } }
    : {};
  const bookingWhere = (fromDate || toDate)
    ? {
        AND: [
          toDate ? { startTime: { lte: toDate } } : {},
          fromDate ? { endTime: { gte: fromDate } } : {}
        ]
      }
    : {};
  const registrationWhere = (fromDate || toDate)
    ? { createdAt: { gte: fromDate || new Date(0), lte: toDate || new Date('2999-12-31') } }
    : {};

  const [eventsPerClubRaw, bookingsPerResourceRaw, registrations, clubs, resources] = await Promise.all([
    prisma.eventClub.groupBy({ by: ['clubId'], _count: { clubId: true }, where: eventWhere }),
    prisma.booking.groupBy({ by: ['resourceId'], _count: { resourceId: true }, where: bookingWhere }),
    prisma.registration.findMany({ select: { id: true, createdAt: true }, where: registrationWhere }),
    prisma.club.findMany({ select: { id: true, name: true } }),
    prisma.resource.findMany({ select: { id: true, name: true } })
  ]);

  const clubNameById = Object.fromEntries(clubs.map(c => [c.id, c.name]));
  const resourceNameById = Object.fromEntries(resources.map(r => [r.id, r.name]));

  const eventsPerClub = eventsPerClubRaw.map(ec => ({
    clubId: ec.clubId,
    clubName: clubNameById[ec.clubId] || ec.clubId,
    count: ec._count.clubId
  }));

  const bookingsPerResource = bookingsPerResourceRaw.map(br => ({
    resourceId: br.resourceId,
    resourceName: resourceNameById[br.resourceId] || br.resourceId,
    count: br._count.resourceId
  }));

  // Aggregate registrations by month (YYYY-MM)
  const regMap = new Map();
  for (const r of registrations) {
    const d = new Date(r.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    regMap.set(key, (regMap.get(key) || 0) + 1);
  }
  const participationByMonth = Array.from(regMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  const totals = {
    totalBookings: bookingsPerResourceRaw.reduce((acc, x) => acc + x._count.resourceId, 0),
    totalRegistrations: registrations.length,
    totalClubs: clubs.length,
    totalResources: resources.length
  };

  res.json({ eventsPerClub, bookingsPerResource, participationByMonth, totals });
});

export default router;
