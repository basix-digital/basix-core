import { ForbiddenException } from "@nestjs/common";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { AppService } from "./app.service";

describe("AppService", () => {
  const prismaMock = {
    $transaction: jest.fn(),
    app: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
  const tenantAccessMock = {
    assertTenantAccess: jest.fn(),
    getAccessibleApp: jest.fn(),
  };

  let service: AppService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback(prismaMock),
    );
    service = new AppService(
      prismaMock as unknown as PrismaService,
      tenantAccessMock as unknown as TenantAccessService,
    );
  });

  it("does not list apps when the user has no tenant membership", async () => {
    tenantAccessMock.assertTenantAccess.mockRejectedValue(
      new ForbiddenException("Tenant access denied"),
    );

    await expect(
      service.listForTenant("user-id", "tenant-id"),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tenantAccessMock.assertTenantAccess).toHaveBeenCalledWith(
      "user-id",
      "tenant-id",
    );
    expect(prismaMock.app.findMany).not.toHaveBeenCalled();
  });

  it("updates only apps accessible to the admin user", async () => {
    tenantAccessMock.getAccessibleApp.mockResolvedValue({
      id: "app-id",
      tenantId: "tenant-id",
    });
    prismaMock.app.update.mockResolvedValue({
      id: "app-id",
      tenantId: "tenant-id",
      name: "Portal",
      slug: "portal",
      baseUrl: "https://portal.example.com",
      status: "active",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    await expect(
      service.update("user-id", "app-id", {
        name: "Portal",
        slug: "portal",
        baseUrl: "https://portal.example.com",
        status: "active",
      }),
    ).resolves.toMatchObject({
      id: "app-id",
      name: "Portal",
      slug: "portal",
    });

    expect(tenantAccessMock.getAccessibleApp).toHaveBeenCalledWith(
      "user-id",
      "app-id",
    );
    expect(prismaMock.app.update).toHaveBeenCalledWith({
      where: { id: "app-id" },
      data: {
        name: "Portal",
        slug: "portal",
        baseUrl: "https://portal.example.com",
        status: "active",
      },
      select: expect.any(Object),
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        actorUserId: "user-id",
        action: "app.update",
        entity: "App",
        entityId: "app-id",
      }),
    });
  });
});
