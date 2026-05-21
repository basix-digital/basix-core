import { IsIn, IsOptional, IsUUID } from "class-validator";

export class ListApiTokensQueryDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  appId?: string;

  @IsOptional()
  @IsIn(["all", "active", "revoked", "expired"])
  status?: string;
}
