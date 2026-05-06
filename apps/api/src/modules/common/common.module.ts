import { Module } from "@nestjs/common";
import { JwtModule, JwtModuleOptions } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { TenantAccessService } from "./context/tenant-access.service";
import { TenantContextService } from "./context/tenant-context.service";
import { ApiTokenGuard } from "./guards/api-token.guard";
import { JwtAdminGuard } from "./guards/jwt-admin.guard";

const jwtAccessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ||
  "15m") as NonNullable<JwtModuleOptions["signOptions"]>["expiresIn"];

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: jwtAccessExpiresIn,
      },
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
