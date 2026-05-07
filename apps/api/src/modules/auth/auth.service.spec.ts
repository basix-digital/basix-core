import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";

jest.mock("argon2", () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe("AuthService", () => {
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
    },
    refreshSession: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prismaMock as unknown as PrismaService,
      jwtServiceMock as unknown as JwtService,
    );
  });

  it("creates refresh sessions with an indexable token id and hashed secret", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-id",
      email: "admin@basix.local",
      name: "Admin",
      passwordHash: "password-hash",
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);
    jest.mocked(argon2.hash).mockResolvedValue("session-hash");
    jwtServiceMock.signAsync.mockResolvedValue("access-token");

    const result = await service.login({
      email: "admin@basix.local",
      password: "admin123456",
    });
    const [tokenId, secret] = result.sessionValue.split(".");

    expect(tokenId).toMatch(/^[a-f0-9]{32}$/);
    expect(secret).toMatch(/^[a-f0-9]{96}$/);
    expect(argon2.hash).toHaveBeenCalledWith(secret);
    expect(prismaMock.refreshSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-id",
        tokenId,
        tokenHash: "session-hash",
        expiresAt: expect.any(Date),
      }),
    });
    expect(result).toEqual({
      accessToken: "access-token",
      sessionValue: result.sessionValue,
      user: {
        id: "user-id",
        email: "admin@basix.local",
        name: "Admin",
      },
    });
  });

  it("refreshes by token id lookup without scanning active sessions", async () => {
    const tokenId = "a".repeat(32);
    const secret = "b".repeat(96);
    const sessionValue = `${tokenId}.${secret}`;
    prismaMock.refreshSession.findUnique.mockResolvedValue({
      id: "session-id",
      userId: "user-id",
      tokenHash: "stored-session-hash",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-id",
      email: "admin@basix.local",
      name: "Admin",
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);
    jest.mocked(argon2.hash).mockResolvedValue("new-session-hash");
    prismaMock.refreshSession.updateMany.mockResolvedValue({ count: 1 });
    jwtServiceMock.signAsync.mockResolvedValue("new-access-token");

    const result = await service.refreshSession(sessionValue);

    expect(prismaMock.refreshSession.findMany).not.toHaveBeenCalled();
    expect(prismaMock.refreshSession.findUnique).toHaveBeenCalledWith({
      where: { tokenId },
    });
    expect(argon2.verify).toHaveBeenCalledWith("stored-session-hash", secret);
    expect(prismaMock.refreshSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-id",
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: {
        revokedAt: expect.any(Date),
        rotatedAt: expect.any(Date),
      },
    });
    expect(result.accessToken).toBe("new-access-token");
  });

  it("rejects refresh replay when another request already revoked the session", async () => {
    const tokenId = "a".repeat(32);
    const secret = "b".repeat(96);
    const sessionValue = `${tokenId}.${secret}`;
    prismaMock.refreshSession.findUnique.mockResolvedValue({
      id: "session-id",
      userId: "user-id",
      tokenHash: "stored-session-hash",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);
    prismaMock.refreshSession.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refreshSession(sessionValue)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(prismaMock.refreshSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: "session-id",
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: {
        revokedAt: expect.any(Date),
        rotatedAt: expect.any(Date),
      },
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.refreshSession.create).not.toHaveBeenCalled();
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it("rejects malformed refresh values before any database lookup", async () => {
    await expect(
      service.refreshSession("forged-refresh"),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prismaMock.refreshSession.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.refreshSession.findMany).not.toHaveBeenCalled();
    expect(argon2.verify).not.toHaveBeenCalled();
  });

  it("does not verify hashes for expired refresh sessions", async () => {
    const sessionValue = `${"a".repeat(32)}.${"b".repeat(96)}`;
    prismaMock.refreshSession.findUnique.mockResolvedValue({
      id: "session-id",
      userId: "user-id",
      tokenHash: "stored-session-hash",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(service.refreshSession(sessionValue)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(argon2.verify).not.toHaveBeenCalled();
  });

  it("logs out by token id lookup without scanning sessions", async () => {
    const tokenId = "c".repeat(32);
    const secret = "d".repeat(96);
    prismaMock.refreshSession.findUnique.mockResolvedValue({
      id: "session-id",
      userId: "user-id",
      tokenHash: "stored-session-hash",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    jest.mocked(argon2.verify).mockResolvedValue(true);

    await expect(service.logout(`${tokenId}.${secret}`)).resolves.toEqual({
      success: true,
    });

    expect(prismaMock.refreshSession.findMany).not.toHaveBeenCalled();
    expect(prismaMock.refreshSession.findUnique).toHaveBeenCalledWith({
      where: { tokenId },
    });
    expect(argon2.verify).toHaveBeenCalledWith("stored-session-hash", secret);
    expect(prismaMock.refreshSession.update).toHaveBeenCalledWith({
      where: { id: "session-id" },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
