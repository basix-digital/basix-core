import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const scopePattern = /^[a-z0-9:._-]+$/;

export class AppAuthRouteParamsDto {
  @IsString()
  @Matches(slugPattern)
  tenantSlug!: string;

  @IsString()
  @Matches(slugPattern)
  appSlug!: string;
}

export class AppAuthSignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class AppAuthLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class AppAuthTokenDto {
  @IsString()
  @MinLength(20)
  token!: string;
}

export class AppAuthRefreshDto {
  @IsString()
  @MinLength(20)
  sessionValue!: string;
}

export class AppAuthForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class AppAuthResetPasswordDto extends AppAuthTokenDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

export class AppAuthAcceptInvitationDto extends AppAuthTokenDto {
  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class ListAppUsersQueryDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  appId?: string;

  @IsOptional()
  @IsIn(["all", "pending", "active", "disabled"])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class UpdateAppUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(["pending", "active", "disabled"])
  status?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @Matches(scopePattern, { each: true })
  scopes?: string[];
}

export class ListAppInvitationsQueryDto {
  @IsUUID()
  tenantId!: string;

  @IsOptional()
  @IsUUID()
  appId?: string;

  @IsOptional()
  @IsIn(["all", "pending", "accepted", "revoked", "expired"])
  status?: string;
}

export class CreateAppInvitationDto {
  @IsUUID()
  tenantId!: string;

  @IsUUID()
  appId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @Matches(scopePattern, { each: true })
  scopes?: string[];
}
