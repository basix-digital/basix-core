import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class ListEnvironmentVariablesQueryDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsIn(["all", "active", "revoked"])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
