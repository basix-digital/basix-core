import { IsOptional, IsString, IsUUID } from "class-validator";

export class ListProviderCredentialsQueryDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
