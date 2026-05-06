import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { TenantAccessService } from "./tenant-access.service";

describe("TenantAccessService", () => {
  const prismaMock = {
    app: {
      findFirst: jest.fn(),
    },
    apiToken: {
      findFirst: jest.fn(),
    },
    tenantUser: {
      findFirst: jest.fn(),
    },
  };

  let service: TenantAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TenantAccessService(prismaMock as unknown as PrismaService);
  });

  it("requires apps to be active before allowing token issuance", async () => {
    prismaMock.app.findFirst.mockResolvedValue(null);

    await expect(
      service.getAccessibleApp("user-id", "app-id"),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prismaMock.app.findFirst).toHaveBeenCalledWith({
      where: {
        id: "app-id",
        status: "active",
        tenant: {
          status: "active",
          users: {
            some: {
              userId: "user-id",
              role: { in: ["OWNER", "ADMIN"] },
            },
          },
        },
      },
      select: expect.any(Object),
    });
  });
});
