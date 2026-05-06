import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@basix.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123456";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Basix Admin";

  if (
    process.env.NODE_ENV === "production" &&
    !process.env.SEED_ADMIN_PASSWORD
  ) {
    throw new Error("SEED_ADMIN_PASSWORD is required in production");
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: "basix-core" },
    update: {},
    create: {
      name: "Basix Core",
      slug: "basix-core",
      status: "active",
      plan: "internal",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      status: "active",
      passwordHash: await argon2.hash(adminPassword),
    },
    create: {
      name: adminName,
      email: adminEmail,
      status: "active",
      passwordHash: await argon2.hash(adminPassword),
    },
  });

  await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: admin.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      tenantId: tenant.id,
      userId: admin.id,
      role: "OWNER",
    },
  });

  await prisma.app.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "admin-panel",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Admin Panel",
      slug: "admin-panel",
      status: "active",
    },
  });

  console.log(`Seed completed. Admin email: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
