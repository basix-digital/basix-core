import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { AppAuthService } from "./app-auth.service";
import {
  CreateAppInvitationDto,
  ListAppInvitationsQueryDto,
  ListAppUsersQueryDto,
  UpdateAppUserDto,
} from "./dto/app-auth.dto";

@Controller("admin/app-auth")
@UseGuards(JwtAdminGuard)
export class AppAuthAdminController {
  constructor(private readonly appAuthService: AppAuthService) {}

  @Get("users")
  listUsers(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListAppUsersQueryDto,
  ) {
    return this.appAuthService.listUsers(user.id, query);
  }

  @Patch("users/:id")
  updateUser(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") appUserId: string,
    @Body() body: UpdateAppUserDto,
  ) {
    return this.appAuthService.updateUser(user.id, appUserId, body);
  }

  @Get("invitations")
  listInvitations(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListAppInvitationsQueryDto,
  ) {
    return this.appAuthService.listInvitations(user.id, query);
  }

  @Post("invitations")
  createInvitation(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: CreateAppInvitationDto,
  ) {
    return this.appAuthService.createInvitation(user.id, body);
  }

  @Post("invitations/:id/resend")
  resendInvitation(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") invitationId: string,
  ) {
    return this.appAuthService.resendInvitation(user.id, invitationId);
  }

  @Post("invitations/:id/revoke")
  revokeInvitation(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") invitationId: string,
  ) {
    return this.appAuthService.revokeInvitation(user.id, invitationId);
  }
}
