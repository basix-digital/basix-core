import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { CurrentAppUser as CurrentAppUserType } from "../common/context/request-context.types";
import { AppUserJwtGuard } from "./app-user-jwt.guard";
import { AppAuthService } from "./app-auth.service";
import { CurrentAppUser } from "./current-app-user.decorator";
import {
  AppAuthAcceptInvitationDto,
  AppAuthForgotPasswordDto,
  AppAuthLoginDto,
  AppAuthRefreshDto,
  AppAuthResetPasswordDto,
  AppAuthRouteParamsDto,
  AppAuthSignupDto,
  AppAuthTokenDto,
} from "./dto/app-auth.dto";

@Controller("app-auth/:tenantSlug/:appSlug")
export class AppAuthController {
  constructor(private readonly appAuthService: AppAuthService) {}

  @Post("signup")
  signup(
    @Param() params: AppAuthRouteParamsDto,
    @Body() body: AppAuthSignupDto,
  ) {
    return this.appAuthService.signup(params, body);
  }

  @Post("verify-email")
  verifyEmail(
    @Param() params: AppAuthRouteParamsDto,
    @Body() body: AppAuthTokenDto,
  ) {
    return this.appAuthService.verifyEmail(params, body);
  }

  @Post("login")
  login(@Param() params: AppAuthRouteParamsDto, @Body() body: AppAuthLoginDto) {
    return this.appAuthService.login(params, body);
  }

  @Post("refresh")
  refresh(
    @Param() params: AppAuthRouteParamsDto,
    @Body() body: AppAuthRefreshDto,
  ) {
    return this.appAuthService.refresh(params, body);
  }

  @Post("logout")
  logout(
    @Param() params: AppAuthRouteParamsDto,
    @Body() body: AppAuthRefreshDto,
  ) {
    return this.appAuthService.logout(params, body);
  }

  @Get("me")
  @UseGuards(AppUserJwtGuard)
  me(
    @Param() params: AppAuthRouteParamsDto,
    @CurrentAppUser() user: CurrentAppUserType,
  ) {
    return this.appAuthService.me(params, user);
  }

  @Post("password/forgot")
  forgotPassword(
    @Param() params: AppAuthRouteParamsDto,
    @Body() body: AppAuthForgotPasswordDto,
  ) {
    return this.appAuthService.forgotPassword(params, body);
  }

  @Post("password/reset")
  resetPassword(
    @Param() params: AppAuthRouteParamsDto,
    @Body() body: AppAuthResetPasswordDto,
  ) {
    return this.appAuthService.resetPassword(params, body);
  }

  @Post("invitations/accept")
  acceptInvitation(
    @Param() params: AppAuthRouteParamsDto,
    @Body() body: AppAuthAcceptInvitationDto,
  ) {
    return this.appAuthService.acceptInvitation(params, body);
  }
}
