import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

export class CreateProviderCredentialDto {
  @IsUUID()
  tenantId!: string;

  @IsIn(["openrouter", "resend", "brevo", "twilio"])
  provider!: string;

  @IsIn(["tenant", "channel"])
  scopeType!: string;

  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @IsString()
  key!: string;

  @IsString()
  @MinLength(1)
  secret!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
