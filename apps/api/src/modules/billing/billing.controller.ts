import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
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

  @Post("tenant/:tenantId/reactivate")
  async reactivateTenant(@Param("tenantId") tenantId: string) {
    return this.billingService.reactivateTenantBilling(tenantId);
  }

  @Post("tenant/:tenantId/plan")
  async changeTenantPlan(
    @Param("tenantId") tenantId: string,
    @Body("plan") plan: string,
  ) {
    return this.billingService.changeTenantPlan(tenantId, plan);
  }

  @Post("invoice/:invoiceId/pay")
  async markInvoiceAsPaid(@Param("invoiceId") invoiceId: string) {
    return this.billingService.markInvoiceAsPaid(invoiceId);
  }

  @Post("subscriptions/process-overdue")
  async processOverdueSubscriptions() {
    return this.billingService.processOverdueSubscriptions();
  }
}
