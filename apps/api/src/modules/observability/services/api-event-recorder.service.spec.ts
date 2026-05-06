import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiEventRecorderService } from "./api-event-recorder.service";

describe("ApiEventRecorderService", () => {
  const prismaMock = {
    apiEvent: {
      create: jest.fn(),
    },
  };
  const configMock = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  let service: ApiEventRecorderService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.apiEvent.create.mockResolvedValue({});
    configMock.get.mockReturnValue("observability-secret");
    configMock.getOrThrow.mockReturnValue("jwt-secret");
    service = new ApiEventRecorderService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
    );
  });

  it("persists API events without storing raw IP addresses", () => {
    service.recordAsync({
      tenantId: "tenant-id",
      appId: "app-id",
      tokenId: "token-id",
      requestId: "request-id",
      method: "GET",
      path: "/v1/orders",
      statusCode: 200,
      durationMs: 42,
      ip: "203.0.113.10",
      userAgent: "jest",
    });

    expect(prismaMock.apiEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-id",
        appId: "app-id",
        tokenId: "token-id",
        requestId: "request-id",
        method: "GET",
        path: "/v1/orders",
        statusCode: 200,
        durationMs: 42,
        userAgent: "jest",
      }),
    });
    const data = prismaMock.apiEvent.create.mock.calls[0][0].data;
    expect(data.ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.ipHash).not.toBe("203.0.113.10");
  });
});
