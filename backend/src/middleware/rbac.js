import { prisma } from '../config/prisma.js';

export async function requireClubRole(roleSet) {
  return async (req, res, next) => {
    const { clubId } = req.body.clubId ? req.body : req.params;
    if (!clubId) return res.status(400).json({ error: 'clubId required' });
    if (req.user?.isAdmin) return next();
    const membership = await prisma.membership.findFirst({
      where: { userId: req.user.id, clubId },
    });
    if (!membership || !roleSet.includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient role for this club' });
    }
    next();
  };
}
