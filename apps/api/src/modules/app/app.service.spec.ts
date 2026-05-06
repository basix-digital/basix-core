import { ForbiddenException } from "@nestjs/common";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { AppService } from "./app.service";

describe("AppService", () => {
  const prismaMock = {
    app: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const tenantAccessMock = {
    assertTenantAccess: jest.fn(),
  };

  let service: AppService;

  beforeEach(() => {
    jest.clearAllMocks();
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
});
