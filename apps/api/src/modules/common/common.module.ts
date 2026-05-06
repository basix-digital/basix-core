import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantAccessService } from "./context/tenant-access.service";
import { TenantContextService } from "./context/tenant-context.service";
import { ApiTokenGuard } from "./guards/api-token.guard";
import { JwtAdminGuard } from "./guards/jwt-admin.guard";

const getJwtAccessExpiresIn = (configService: ConfigService) =>
  (configService.get<string>("JWT_ACCESS_EXPIRES_IN") || "15m") as NonNullable<
    JwtModuleOptions["signOptions"]
  >["expiresIn"];

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: getJwtAccessExpiresIn(configService),
        },
      }),
    }),
  ],
  providers: [
    JwtAdminGuard,
    ApiTokenGuard,
    TenantAccessService,
    TenantContextService,
  ],
  exports: [
    JwtAdminGuard,
    ApiTokenGuard,
    TenantAccessService,
    TenantContextService,
  ],
})
export class CommonModule {}
