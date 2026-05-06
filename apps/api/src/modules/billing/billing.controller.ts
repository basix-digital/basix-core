import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAdminGuard } from "../common/guards/jwt-admin.guard";
import { BillingService } from "./billing.service";

@Controller("admin/billing")
@UseGuards(JwtAdminGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("subscriptions")
  async getSubscriptions() {
    return this.billingService.listSubscriptions();
  }

  @Get("invoices")
  async getInvoices() {
    return this.billingService.listInvoices();
  }

  @Get("events")
  async getBillingEvents() {
    return this.billingService.listBillingEvents();
  }

  @Post("tenant/:tenantId/suspend")
  async suspendTenant(@Param("tenantId") tenantId: string) {
    return this.billingService.suspendTenantBilling(tenantId);
  }
}
