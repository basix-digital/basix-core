import { IsUUID } from "class-validator";

export class TenantMetricsParamsDto {
  @IsUUID()
  tenantId!: string;
}
