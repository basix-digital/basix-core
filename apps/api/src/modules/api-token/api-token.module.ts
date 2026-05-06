import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ApiTokenController } from "./api-token.controller";
import { ApiTokenService } from "./api-token.service";

@Module({
  imports: [CommonModule, PrismaModule],
  controllers: [ApiTokenController],
  providers: [ApiTokenService],
  exports: [ApiTokenService],
})
export class ApiTokenModule {}
