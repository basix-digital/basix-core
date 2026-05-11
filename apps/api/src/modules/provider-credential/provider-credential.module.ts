import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { VaultModule } from "../vault/vault.module";
import { ProviderCredentialController } from "./provider-credential.controller";
import { ProviderCredentialService } from "./provider-credential.service";

@Module({
  imports: [CommonModule, PrismaModule, VaultModule],
  controllers: [ProviderCredentialController],
  providers: [ProviderCredentialService],
  exports: [ProviderCredentialService],
})
export class ProviderCredentialModule {}
