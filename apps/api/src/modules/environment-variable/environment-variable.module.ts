import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { VaultModule } from "../vault/vault.module";
import { EnvironmentVariableController } from "./environment-variable.controller";
import { EnvironmentVariableService } from "./environment-variable.service";

@Module({
  imports: [CommonModule, PrismaModule, VaultModule],
  controllers: [EnvironmentVariableController],
  providers: [EnvironmentVariableService],
  exports: [EnvironmentVariableService],
})
export class EnvironmentVariableModule {}
