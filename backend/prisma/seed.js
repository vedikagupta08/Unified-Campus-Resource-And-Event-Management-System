import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const isDemo = process.env.SEED_DEMO === 'true' || process.env.NODE_ENV !== 'production';

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campus.local' },
    update: {},
    create: {
      email: 'admin@campus.local',
      name: 'Admin',
      passwordHash,
      globalRole: 'ADMIN'
    }
  });

  const techClub = await prisma.club.upsert({
    where: { name: 'Tech Club' },
    update: {},
    create: { name: 'Tech Club', description: 'Technology enthusiasts' }
  });

  console.log({ admin, techClub });

  if (isDemo) {
    const designClub = await prisma.club.upsert({
      where: { name: 'Design Club' },
      update: {},
      create: { name: 'Design Club', description: 'Design and creativity' }
    });
    const studentPass = await bcrypt.hash('student123', 10);
    const student = await prisma.user.upsert({
      where: { email: 'student@campus.local' },
      update: {},
      create: {
        email: 'student@campus.local',
        name: 'Demo Student',
        passwordHash: studentPass,
        globalRole: 'STUDENT',
        department: 'Computer Science',
        academicYear: '3rd Year'
      }
    });
    await prisma.membership.upsert({
      where: { userId_clubId: { userId: student.id, clubId: techClub.id } },
      update: {},
      create: { userId: student.id, clubId: techClub.id, clubRole: 'ORGANIZER' }
    });
    const event1 = await prisma.event.create({
      data: {
        title: 'Campus Hackathon 2026',
        description: 'Annual hackathon for students.',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        createdById: student.id,
        category: 'Hackathon',
        clubs: { create: [{ clubId: techClub.id }] }
      }
    });
    const room = await prisma.resource.upsert({
      where: { name: 'Main Auditorium' },
      update: {},
      create: {
        name: 'Main Auditorium',
        type: 'HALL',
        requiresApproval: true,
        autoApprove: false,
        capacity: 200,
        active: true
      }
    });
    await prisma.booking.create({
      data: {
        resourceId: room.id,
        eventId: event1.id,
        startTime: event1.startDate,
        endTime: event1.endDate,
        approved: true
      }
    });
    console.log('Demo data: student, clubs, event, resource, booking created.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
