import { NextResponse } from "next/server";
import {
  createEnvironmentVariable,
  listEnvironmentVariables,
  listTenants,
} from "@/lib/api/console";
import { backendJson, withBackendSessionRefresh } from "@/lib/api/server";
import { createEnvironmentVariableSchema } from "@/lib/api/validators";

export async function GET(request: Request) {
  try {
    return await withBackendSessionRefresh(async () => {
      const url = new URL(request.url);
      const tenantId = url.searchParams.get("tenantId") ?? "";
      const tenants = await listTenants();
      const variables = tenantId
        ? await listEnvironmentVariables({
            tenantId,
            status: url.searchParams.get("status") || undefined,
            search: url.searchParams.get("search") || undefined,
          })
        : [];

      return NextResponse.json({
        data: variables,
        tenants,
      });
    });
  } catch (error) {
    return backendJson(error);
  }
}

export async function POST(request: Request) {
  try {
    return await withBackendSessionRefresh(async () => {
      const body = createEnvironmentVariableSchema.parse(await request.json());
      const variable = await createEnvironmentVariable({
        tenantId: body.tenantId,
        key: body.key,
        value: body.value,
        description: body.description || undefined,
      });

      return NextResponse.json(variable, { status: 201 });
    });
  } catch (error) {
    return backendJson(error);
  }
}
