import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAdminUser } from "../common/context/request-context.types";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { CreateProviderCredentialDto } from "./dto/create-provider-credential.dto";
import { ListProviderCredentialsQueryDto } from "./dto/list-provider-credentials-query.dto";
import { RotateProviderCredentialDto } from "./dto/rotate-provider-credential.dto";
import { ProviderCredentialService } from "./provider-credential.service";

@Controller("admin/provider-credentials")
@UseGuards(JwtAdminGuard)
export class ProviderCredentialController {
  constructor(
    private readonly providerCredentials: ProviderCredentialService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: CreateProviderCredentialDto,
  ) {
    return this.providerCredentials.create(user.id, body);
  }

  @Get()
  list(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListProviderCredentialsQueryDto,
  ) {
    return this.providerCredentials.list(user.id, query);
  }

  @Post(":id/rotate")
  rotate(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") id: string,
    @Body() body: RotateProviderCredentialDto,
  ) {
    return this.providerCredentials.rotate(user.id, id, body);
  }

  @Post(":id/revoke")
  revoke(@CurrentUser() user: JwtAdminUser, @Param("id") id: string) {
    return this.providerCredentials.revoke(user.id, id);
  }
}
