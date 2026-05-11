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
import { AiPlatformService } from "./ai-platform.service";
import {
  CreateContactDto,
  ListContactsQueryDto,
  PaginatedTenantQueryDto,
  TenantScopedQueryDto,
  UpdateContactDto,
} from "./dto/ai-platform.dto";

@Controller("crm")
@UseGuards(JwtAdminGuard)
export class CrmController {
  constructor(private readonly aiPlatform: AiPlatformService) {}

  @Get("contacts")
  listContacts(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: ListContactsQueryDto,
  ) {
    return this.aiPlatform.listContacts(user.id, query);
  }

  @Post("contacts")
  createContact(
    @CurrentUser() user: JwtAdminUser,
    @Body() body: CreateContactDto,
  ) {
    return this.aiPlatform.createContact(user.id, body);
  }

  @Patch("contacts/:id")
  updateContact(
    @CurrentUser() user: JwtAdminUser,
    @Param("id") id: string,
    @Body() body: UpdateContactDto,
  ) {
    return this.aiPlatform.updateContact(user.id, id, body);
  }

  @Get("pipelines")
  listPipelines(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: TenantScopedQueryDto,
  ) {
    return this.aiPlatform.listPipelines(user.id, query);
  }

  @Get("activities")
  listActivities(
    @CurrentUser() user: JwtAdminUser,
    @Query() query: PaginatedTenantQueryDto,
  ) {
    return this.aiPlatform.listActivities(user.id, query);
  }
}
