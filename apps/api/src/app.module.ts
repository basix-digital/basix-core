import { Module } from "@nestjs/common";
import { ApiTokenModule } from "./modules/api-token/api-token.module";
import { AppsModule } from "./modules/app/app.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CommonModule } from "./modules/common/common.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { TenantModule } from "./modules/tenant/tenant.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    TenantModule,
    AppsModule,
    ApiTokenModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
