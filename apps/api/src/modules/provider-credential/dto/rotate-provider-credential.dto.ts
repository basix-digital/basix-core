import { IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class RotateProviderCredentialDto {
  @IsString()
  @MinLength(1)
  secret!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
