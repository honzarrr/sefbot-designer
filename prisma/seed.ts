import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sefbot.cz' },
    update: {},
    create: {
      email: 'admin@sefbot.cz',
      firstName: 'Admin',
      lastName: 'Sefbot',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Created admin user:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
