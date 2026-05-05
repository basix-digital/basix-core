import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'basix-core' },
    update: {},
    create: {
      name: 'Basix Core',
      slug: 'basix-core',
      status: 'active',
      plan: 'internal',
    },
  });

  await prisma.app.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'admin-panel',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin Panel',
      slug: 'admin-panel',
      status: 'active',
    },
  });

  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
