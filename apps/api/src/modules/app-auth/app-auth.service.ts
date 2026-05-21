import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Prisma } from "@basix-core/database";
import * as argon2 from "argon2";
import crypto from "node:crypto";
import {
  AppUserJwtPayload,
  CurrentAppUser,
} from "../common/context/request-context.types";
import { TenantAccessService } from "../common/context/tenant-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { AppAuthEmailService } from "./app-auth-email.service";
import {
  AppAuthAcceptInvitationDto,
  AppAuthForgotPasswordDto,
  AppAuthLoginDto,
  AppAuthRefreshDto,
  AppAuthResetPasswordDto,
  AppAuthRouteParamsDto,
  AppAuthSignupDto,
  AppAuthTokenDto,
  CreateAppInvitationDto,
  ListAppInvitationsQueryDto,
  ListAppUsersQueryDto,
  UpdateAppUserDto,
} from "./dto/app-auth.dto";

const APP_AUTH_TOKEN_ID_BYTES = 16;
const APP_AUTH_TOKEN_SECRET_BYTES = 48;
const TOKEN_VALUE_PATTERN = /^[a-f0-9]{32}\.[a-f0-9]{96}$/;
const DEFAULT_APP_USER_SCOPES = ["user"];

const appUserSelect = {
  id: true,
  tenantId: true,
  appId: true,
  email: true,
  name: true,
  status: true,
  emailVerifiedAt: true,
  scopes: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const appAuthTokenSelect = {
  id: true,
  tenantId: true,
  appId: true,
  type: true,
  email: true,
  name: true,
  scopes: true,
  expiresAt: true,
  consumedAt: true,
  revokedAt: true,
  createdByUserId: true,
  createdAt: true,
} as const;

type AppContext = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  baseUrl: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
};

@Injectable()
export class AppAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tenantAccess: TenantAccessService,
    private readonly email: AppAuthEmailService,
  ) {}

  async signup(params: AppAuthRouteParamsDto, data: AppAuthSignupDto) {
    const app = await this.resolveActiveApp(params);
    await this.assertPublicEmailConfigured(app.tenantId);
    const email = this.normalizeEmail(data.email);
    const passwordHash = await argon2.hash(data.password);
    const existing = await this.findAppUser(app, email);

    if (existing?.status === "active" || existing?.status === "disabled") {
      return this.publicEmailResponse();
    }

    if (existing) {
      await this.prisma.appUser.update({
        where: { id: existing.id },
        data: {
          name: this.normalizeOptional(data.name),
          passwordHash,
          scopes: existing.scopes.length
            ? existing.scopes
            : DEFAULT_APP_USER_SCOPES,
          status: "pending",
        },
      });
    } else {
      await this.prisma.appUser.create({
        data: {
          tenantId: app.tenantId,
          appId: app.id,
          email,
          name: this.normalizeOptional(data.name),
          passwordHash,
          scopes: DEFAULT_APP_USER_SCOPES,
          status: "pending",
        },
      });
    }

    const token = await this.createOneTimeToken({
      app,
      type: "email_verification",
      email,
      name: data.name,
      scopes: DEFAULT_APP_USER_SCOPES,
      ttlMs: this.emailTokenTtlMs(),
    });
    await this.sendPublicEmail({
      app,
      email,
      name: data.name,
      subject: "Verify your email",
      path: "/auth/verify",
      token,
      action: "verify your email",
    });

    return this.publicEmailResponse();
  }

  async verifyEmail(params: AppAuthRouteParamsDto, data: AppAuthTokenDto) {
    const app = await this.resolveActiveApp(params);
    const token = await this.consumeOneTimeToken(
      app,
      "email_verification",
      data.token,
    );
    const appUser = await this.prisma.appUser.update({
      where: {
        tenantId_appId_email: {
          tenantId: app.tenantId,
          appId: app.id,
          email: token.email,
        },
      },
      data: {
        status: "active",
        emailVerifiedAt: new Date(),
      },
      select: appUserSelect,
    });

    return this.createSession(appUser);
  }

  async login(params: AppAuthRouteParamsDto, data: AppAuthLoginDto) {
    const app = await this.resolveActiveApp(params);
    const appUser = await this.findAppUser(
      app,
      this.normalizeEmail(data.email),
    );
    if (!appUser || appUser.status !== "active") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await argon2
      .verify(appUser.passwordHash, data.password)
      .catch(() => false);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.createSession(appUser);
  }

  async refresh(params: AppAuthRouteParamsDto, data: AppAuthRefreshDto) {
    const app = await this.resolveActiveApp(params);
    const parsedSession = this.parseTokenValue(data.sessionValue);
    if (!parsedSession) {
      throw new UnauthorizedException("Invalid session");
    }

    const session = await this.prisma.appUserRefreshSession.findUnique({
      where: { tokenId: parsedSession.tokenId },
      include: {
        appUser: {
          select: {
            ...appUserSelect,
            passwordHash: true,
            tenant: { select: { status: true } },
            app: { select: { status: true } },
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.appUser.tenantId !== app.tenantId ||
      session.appUser.appId !== app.id ||
      session.appUser.status !== "active" ||
      session.appUser.tenant.status !== "active" ||
      session.appUser.app.status !== "active"
    ) {
      throw new UnauthorizedException("Invalid session");
    }

    const valid = await argon2
      .verify(session.tokenHash, parsedSession.secret)
      .catch(() => false);
    if (!valid) {
      throw new UnauthorizedException("Invalid session");
    }

    const rotatedAt = new Date();
    const revokedSession = await this.prisma.appUserRefreshSession.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: rotatedAt },
      },
      data: { revokedAt: rotatedAt, rotatedAt },
    });
    if (revokedSession.count !== 1) {
      throw new UnauthorizedException("Invalid session");
    }

    return this.createSession(session.appUser);
  }

  async logout(_params: AppAuthRouteParamsDto, data: AppAuthRefreshDto) {
    const parsedSession = this.parseTokenValue(data.sessionValue);
    if (!parsedSession) {
      return { success: true };
    }

    const session = await this.prisma.appUserRefreshSession.findUnique({
      where: { tokenId: parsedSession.tokenId },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return { success: true };
    }

    const valid = await argon2
      .verify(session.tokenHash, parsedSession.secret)
      .catch(() => false);
    if (!valid) {
      return { success: true };
    }

    await this.prisma.appUserRefreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  async me(params: AppAuthRouteParamsDto, user: CurrentAppUser) {
    const app = await this.resolveActiveApp(params);
    if (user.tenantId !== app.tenantId || user.appId !== app.id) {
      throw new UnauthorizedException("Invalid bearer token");
    }

    return { user };
  }

  async forgotPassword(
    params: AppAuthRouteParamsDto,
    data: AppAuthForgotPasswordDto,
  ) {
    const app = await this.resolveActiveApp(params);
    await this.assertPublicEmailConfigured(app.tenantId);
    const email = this.normalizeEmail(data.email);
    const appUser = await this.findAppUser(app, email);

    if (appUser?.status === "active") {
      const token = await this.createOneTimeToken({
        app,
        type: "password_reset",
        email,
        name: appUser.name,
        scopes: appUser.scopes,
        ttlMs: this.emailTokenTtlMs(),
      });
      await this.sendPublicEmail({
        app,
        email,
        name: appUser.name,
        subject: "Reset your password",
        path: "/auth/reset-password",
        token,
        action: "reset your password",
      });
    }

    return this.publicEmailResponse();
  }

  async resetPassword(
    params: AppAuthRouteParamsDto,
    data: AppAuthResetPasswordDto,
  ) {
    const app = await this.resolveActiveApp(params);
    const token = await this.consumeOneTimeToken(
      app,
      "password_reset",
      data.token,
    );
    const passwordHash = await argon2.hash(data.password);

    const appUser = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updated = await tx.appUser.update({
          where: {
            tenantId_appId_email: {
              tenantId: app.tenantId,
              appId: app.id,
              email: token.email,
            },
          },
          data: {
            passwordHash,
            status: "active",
            emailVerifiedAt: new Date(),
          },
          select: appUserSelect,
        });

        await tx.appUserRefreshSession.updateMany({
          where: { appUserId: updated.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });

        return updated;
      },
    );

    return this.createSession(appUser);
  }

  async acceptInvitation(
    params: AppAuthRouteParamsDto,
    data: AppAuthAcceptInvitationDto,
  ) {
    const app = await this.resolveActiveApp(params);
    const token = await this.consumeOneTimeToken(app, "invite", data.token);
    const passwordHash = await argon2.hash(data.password);

    const appUser = await this.prisma.appUser.upsert({
      where: {
        tenantId_appId_email: {
          tenantId: app.tenantId,
          appId: app.id,
          email: token.email,
        },
      },
      create: {
        tenantId: app.tenantId,
        appId: app.id,
        email: token.email,
        name: this.normalizeOptional(data.name) ?? token.name,
        passwordHash,
        status: "active",
        emailVerifiedAt: new Date(),
        scopes: token.scopes,
      },
      update: {
        name: this.normalizeOptional(data.name) ?? token.name,
        passwordHash,
        status: "active",
        emailVerifiedAt: new Date(),
        scopes: token.scopes,
      },
      select: appUserSelect,
    });

    await this.prisma.appUserRefreshSession.updateMany({
      where: { appUserId: appUser.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return this.createSession(appUser);
  }

  async listUsers(userId: string, query: ListAppUsersQueryDto) {
    await this.tenantAccess.assertTenantAccess(userId, query.tenantId);

    return this.prisma.appUser.findMany({
      where: {
        tenantId: query.tenantId,
        ...(query.appId ? { appId: query.appId } : {}),
        ...(query.status && query.status !== "all"
          ? { status: query.status }
          : {}),
        ...(query.search
          ? {
              OR: [
                { email: { contains: query.search, mode: "insensitive" } },
                { name: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: appUserSelect,
    });
  }

  async updateUser(userId: string, appUserId: string, data: UpdateAppUserDto) {
    const appUser = await this.prisma.appUser.findUnique({
      where: { id: appUserId },
      select: { id: true, tenantId: true, status: true },
    });
    if (!appUser) {
      throw new NotFoundException("App user not found");
    }

    await this.tenantAccess.assertTenantAccess(userId, appUser.tenantId);
    const scopes = data.scopes ? this.normalizeScopes(data.scopes) : undefined;
    const updated = await this.prisma.appUser.update({
      where: { id: appUser.id },
      data: {
        ...(data.name !== undefined
          ? { name: this.normalizeOptional(data.name) }
          : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.status === "active" ? { emailVerifiedAt: new Date() } : {}),
        ...(scopes ? { scopes } : {}),
      },
      select: appUserSelect,
    });

    if (data.status === "disabled") {
      await this.prisma.appUserRefreshSession.updateMany({
        where: { appUserId: appUser.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return updated;
  }

  async listInvitations(userId: string, query: ListAppInvitationsQueryDto) {
    await this.tenantAccess.assertTenantAccess(userId, query.tenantId);
    const now = new Date();

    return this.prisma.appAuthToken.findMany({
      where: {
        tenantId: query.tenantId,
        type: "invite",
        ...(query.appId ? { appId: query.appId } : {}),
        ...this.invitationStatusWhere(query.status ?? "pending", now),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: appAuthTokenSelect,
    });
  }

  async createInvitation(userId: string, data: CreateAppInvitationDto) {
    const app = await this.getAdminApp(userId, data.tenantId, data.appId);
    const email = this.normalizeEmail(data.email);
    const existing = await this.findAppUser(app, email);
    if (existing?.status === "active") {
      throw new ConflictException("App user already exists");
    }

    const scopes = this.normalizeScopes(data.scopes ?? DEFAULT_APP_USER_SCOPES);
    const token = await this.createOneTimeToken({
      app,
      type: "invite",
      email,
      name: data.name,
      scopes,
      ttlMs: this.inviteTtlMs(),
      createdByUserId: userId,
    });

    await this.sendInvitationEmail(app, email, data.name, token);
    return this.prisma.appAuthToken.findUniqueOrThrow({
      where: { tokenId: token.tokenId },
      select: appAuthTokenSelect,
    });
  }

  async resendInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.appAuthToken.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.type !== "invite") {
      throw new NotFoundException("Invitation not found");
    }

    const app = await this.getAdminApp(
      userId,
      invitation.tenantId,
      invitation.appId,
    );
    if (invitation.consumedAt || invitation.revokedAt) {
      throw new BadRequestException("Invitation cannot be resent");
    }

    const rawToken = await this.generateRawToken();
    const tokenHash = await argon2.hash(rawToken.secret);
    const expiresAt = new Date(Date.now() + this.inviteTtlMs());
    const updated = await this.prisma.appAuthToken.update({
      where: { id: invitation.id },
      data: {
        tokenId: rawToken.tokenId,
        tokenHash,
        expiresAt,
      },
      select: appAuthTokenSelect,
    });

    await this.sendInvitationEmail(app, invitation.email, invitation.name, {
      token: rawToken.value,
    });

    return updated;
  }

  async revokeInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.appAuthToken.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.type !== "invite") {
      throw new NotFoundException("Invitation not found");
    }

    await this.tenantAccess.assertTenantAccess(userId, invitation.tenantId);
    if (invitation.revokedAt) {
      return this.prisma.appAuthToken.findUniqueOrThrow({
        where: { id: invitation.id },
        select: appAuthTokenSelect,
      });
    }

    return this.prisma.appAuthToken.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
      select: appAuthTokenSelect,
    });
  }

  private async resolveActiveApp(params: AppAuthRouteParamsDto) {
    const app = await this.prisma.app.findFirst({
      where: {
        slug: params.appSlug,
        status: "active",
        tenant: {
          slug: params.tenantSlug,
          status: "active",
        },
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        baseUrl: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundException("App not found");
    }

    return app;
  }

  private async getAdminApp(userId: string, tenantId: string, appId: string) {
    const accessibleApp = await this.tenantAccess.getAccessibleApp(
      userId,
      appId,
    );
    if (accessibleApp.tenantId !== tenantId) {
      throw new NotFoundException("App not found");
    }

    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        baseUrl: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
    if (!app?.baseUrl) {
      throw new BadRequestException(
        "App baseUrl is required for App Auth emails",
      );
    }

    return app;
  }

  private async findAppUser(app: AppContext, email: string) {
    return this.prisma.appUser.findUnique({
      where: {
        tenantId_appId_email: {
          tenantId: app.tenantId,
          appId: app.id,
          email,
        },
      },
      select: {
        ...appUserSelect,
        passwordHash: true,
      },
    });
  }

  private async createSession(appUser: {
    id: string;
    email: string;
    name: string | null;
    tenantId: string;
    appId: string;
    scopes: string[];
  }) {
    const payload: AppUserJwtPayload = {
      typ: "app_user",
      sub: appUser.id,
      email: appUser.email,
      tenantId: appUser.tenantId,
      appId: appUser.appId,
      scopes: appUser.scopes,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const rawToken = await this.generateRawToken();
    const tokenHash = await argon2.hash(rawToken.secret);

    await this.prisma.$transaction([
      this.prisma.appUser.update({
        where: { id: appUser.id },
        data: { lastLoginAt: new Date() },
      }),
      this.prisma.appUserRefreshSession.create({
        data: {
          appUserId: appUser.id,
          tokenId: rawToken.tokenId,
          tokenHash,
          expiresAt: new Date(Date.now() + this.refreshTtlMs()),
        },
      }),
    ]);

    return {
      accessToken,
      sessionValue: rawToken.value,
      user: {
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
        tenantId: appUser.tenantId,
        appId: appUser.appId,
        scopes: appUser.scopes,
      },
    };
  }

  private async createOneTimeToken(input: {
    app: AppContext;
    type: "email_verification" | "password_reset" | "invite";
    email: string;
    name?: string | null;
    scopes: string[];
    ttlMs: number;
    createdByUserId?: string;
  }) {
    const rawToken = await this.generateRawToken();
    const tokenHash = await argon2.hash(rawToken.secret);

    await this.prisma.appAuthToken.create({
      data: {
        tenantId: input.app.tenantId,
        appId: input.app.id,
        type: input.type,
        tokenId: rawToken.tokenId,
        tokenHash,
        email: input.email,
        name: this.normalizeOptional(input.name ?? undefined),
        scopes: this.normalizeScopes(input.scopes),
        expiresAt: new Date(Date.now() + input.ttlMs),
        createdByUserId: input.createdByUserId,
      },
    });

    return {
      token: rawToken.value,
      tokenId: rawToken.tokenId,
    };
  }

  private async consumeOneTimeToken(
    app: AppContext,
    type: "email_verification" | "password_reset" | "invite",
    tokenValue: string,
  ) {
    const parsed = this.parseTokenValue(tokenValue);
    if (!parsed) {
      throw new UnauthorizedException("Invalid token");
    }

    const token = await this.prisma.appAuthToken.findUnique({
      where: { tokenId: parsed.tokenId },
    });
    if (
      !token ||
      token.tenantId !== app.tenantId ||
      token.appId !== app.id ||
      token.type !== type ||
      token.revokedAt ||
      token.consumedAt ||
      token.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Invalid token");
    }

    const valid = await argon2
      .verify(token.tokenHash, parsed.secret)
      .catch(() => false);
    if (!valid) {
      throw new UnauthorizedException("Invalid token");
    }

    const consumed = await this.prisma.appAuthToken.updateMany({
      where: {
        id: token.id,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException("Invalid token");
    }

    return token;
  }

  private async sendInvitationEmail(
    app: AppContext,
    email: string,
    name: string | null | undefined,
    token: { token: string },
  ) {
    await this.email.send({
      tenantId: app.tenantId,
      toEmail: email,
      toName: name,
      subject: `You're invited to ${app.name}`,
      ...this.buildEmailContent(
        app,
        "/auth/invite",
        token.token,
        "accept your invitation",
      ),
    });
  }

  private async sendPublicEmail(input: {
    app: AppContext;
    email: string;
    name?: string | null;
    subject: string;
    path: string;
    token: { token: string };
    action: string;
  }) {
    try {
      await this.email.send({
        tenantId: input.app.tenantId,
        toEmail: input.email,
        toName: input.name,
        subject: input.subject,
        ...this.buildEmailContent(
          input.app,
          input.path,
          input.token.token,
          input.action,
        ),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Unable to send authentication email",
      );
    }
  }

  private async assertPublicEmailConfigured(tenantId: string) {
    try {
      await this.email.assertConfigured(tenantId);
    } catch {
      throw new ServiceUnavailableException(
        "Unable to send authentication email",
      );
    }
  }

  private buildEmailContent(
    app: AppContext,
    path: string,
    token: string,
    action: string,
  ) {
    const link = this.buildAppLink(app, path, token);
    const text = `Use this link to ${action}: ${link}`;
    const html = `<p>Use this link to ${action}:</p><p><a href="${link}">${link}</a></p>`;
    return { text, html };
  }

  private buildAppLink(app: AppContext, path: string, token: string) {
    if (!app.baseUrl) {
      throw new BadRequestException(
        "App baseUrl is required for App Auth emails",
      );
    }

    const url = new URL(path, app.baseUrl);
    url.searchParams.set("token", token);
    return url.toString();
  }

  private invitationStatusWhere(
    status: string,
    now: Date,
  ): Prisma.AppAuthTokenWhereInput {
    if (status === "all") return {};
    if (status === "accepted") return { consumedAt: { not: null } };
    if (status === "revoked") return { revokedAt: { not: null } };
    if (status === "expired") {
      return { consumedAt: null, revokedAt: null, expiresAt: { lte: now } };
    }

    return { consumedAt: null, revokedAt: null, expiresAt: { gt: now } };
  }

  private publicEmailResponse() {
    return {
      success: true,
      message:
        "If the account can receive authentication email, a link was sent.",
    };
  }

  private async generateRawToken() {
    return this.buildRawToken(
      APP_AUTH_TOKEN_ID_BYTES,
      APP_AUTH_TOKEN_SECRET_BYTES,
    );
  }

  private buildRawToken(tokenIdBytes: number, secretBytes: number) {
    const tokenId = crypto.randomBytes(tokenIdBytes).toString("hex");
    const secret = crypto.randomBytes(secretBytes).toString("hex");
    return {
      tokenId,
      secret,
      value: `${tokenId}.${secret}`,
    };
  }

  private parseTokenValue(tokenValue: string) {
    if (!TOKEN_VALUE_PATTERN.test(tokenValue)) {
      return null;
    }

    const [tokenId, secret] = tokenValue.split(".");
    return { tokenId, secret };
  }

  private refreshTtlMs() {
    return (
      this.configService.getOrThrow<number>("APP_AUTH_REFRESH_TTL_DAYS") *
      24 *
      60 *
      60 *
      1000
    );
  }

  private emailTokenTtlMs() {
    return (
      this.configService.getOrThrow<number>("APP_AUTH_EMAIL_TOKEN_TTL_HOURS") *
      60 *
      60 *
      1000
    );
  }

  private inviteTtlMs() {
    return (
      this.configService.getOrThrow<number>("APP_AUTH_INVITE_TTL_DAYS") *
      24 *
      60 *
      60 *
      1000
    );
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizeOptional(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private normalizeScopes(scopes: string[]) {
    return Array.from(
      new Set(scopes.map((scope) => scope.trim()).filter(Boolean)),
    );
  }
}
