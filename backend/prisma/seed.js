import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campus.local' },
    update: {},
    create: { email: 'admin@campus.local', name: 'Admin', passwordHash, isAdmin: true }
  });
  const club = await prisma.club.upsert({
    where: { name: 'Tech Club' },
    update: {},
    create: { name: 'Tech Club', description: 'Technology enthusiasts' }
  });
  console.log({ admin, club });
}

main().finally(async () => await prisma.$disconnect());
