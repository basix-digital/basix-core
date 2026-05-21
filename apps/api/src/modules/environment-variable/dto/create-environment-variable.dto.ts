import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateEnvironmentVariableDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{0,127}$/)
  key!: string;

  @IsString()
  @MinLength(1)
  value!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
