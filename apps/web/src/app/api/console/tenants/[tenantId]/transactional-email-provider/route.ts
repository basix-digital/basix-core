import { NextResponse } from "next/server";
import { changeTenantTransactionalEmailProvider } from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { updateTenantEmailProviderSchema } from "@/lib/api/validators";

export async function POST(
  request: Request,
  context: { params: Promise<{ tenantId: string }> },
) {
  try {
    return await withBackendSessionRefresh(async () => {
      const { tenantId } = await context.params;
      const body = updateTenantEmailProviderSchema.parse(await request.json());
      const tenant = await changeTenantTransactionalEmailProvider(tenantId, {
        transactionalEmailProvider: body.transactionalEmailProvider,
      });

      return NextResponse.json(tenant);
    });
  } catch (error) {
    return backendJson(error);
  }
}
