import { IsUUID } from "class-validator";

export class ListAppsQueryDto {
  @IsUUID()
  tenantId!: string;
}
