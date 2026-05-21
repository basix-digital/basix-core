import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { VaultModule } from "../vault/vault.module";
import { AppAuthAdminController } from "./app-auth-admin.controller";
import { AppAuthController } from "./app-auth.controller";
import { AppAuthEmailService } from "./app-auth-email.service";
import { AppAuthService } from "./app-auth.service";
import { AppUserJwtGuard } from "./app-user-jwt.guard";

@Module({
  imports: [CommonModule, PrismaModule, VaultModule],
  controllers: [AppAuthController, AppAuthAdminController],
  providers: [AppAuthService, AppAuthEmailService, AppUserJwtGuard],
  exports: [AppAuthService, AppUserJwtGuard],
})
export class AppAuthModule {}
