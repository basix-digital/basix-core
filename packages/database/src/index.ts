import { PrismaClient } from "@prisma/client";

export { PrismaClient } from "@prisma/client";
export type { Prisma } from "@prisma/client";

export const createPrismaClient = () => {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};
