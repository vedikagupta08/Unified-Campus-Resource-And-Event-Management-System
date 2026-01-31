import { prisma } from '../config/prisma.js';

export async function requireClubRole(roleSet) {
  return async (req, res, next) => {
    // Allow ADMIN to bypass club role checks
    if (req.user?.globalRole === 'ADMIN') return next();

    // Extract clubId from body, params, or query
    const clubId = req.body.clubId || req.params.clubId || req.query.clubId;
    if (!clubId) return res.status(400).json({ error: 'clubId required' });

    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.id, clubId },
    });
    if (!membership || !roleSet.includes(membership.clubRole)) {
      return res.status(403).json({ error: "You don't have permission to perform this action." });
    }
    next();
  };
}
