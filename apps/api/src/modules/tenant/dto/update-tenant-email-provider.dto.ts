import { IsIn } from "class-validator";

export class UpdateTenantEmailProviderDto {
  @IsIn(["resend", "brevo"])
  transactionalEmailProvider!: string;
}
