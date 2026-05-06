import { NextResponse } from "next/server";
import { createTenant, getTenantRows } from "@/lib/api/console";
import { backendJson } from "@/lib/api/server";
import {
  createTenantSchema,
  tenantListQuerySchema,
} from "@/lib/api/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = tenantListQuerySchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    const rows = await getTenantRows();
    const filtered = rows.filter((tenant) => {
      const matchesSearch =
        !query.search ||
        tenant.name.toLowerCase().includes(query.search.toLowerCase()) ||
        tenant.slug.toLowerCase().includes(query.search.toLowerCase());
      const matchesStatus =
        query.status === "all" || tenant.status === query.status;
      const matchesPlan =
        query.plan === "all" ||
        (tenant.plan ?? "starter").toLowerCase() === query.plan.toLowerCase();

      return matchesSearch && matchesStatus && matchesPlan;
    });
    const offset = (query.page - 1) * query.perPage;

    return NextResponse.json({
      data: filtered.slice(offset, offset + query.perPage),
      pagination: {
        page: query.page,
        perPage: query.perPage,
        total: filtered.length,
        pageCount: Math.max(1, Math.ceil(filtered.length / query.perPage)),
      },
    });
  } catch (error) {
    return backendJson(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = createTenantSchema.parse(await request.json());
    const payload = {
      name: body.name,
      slug: body.slug || undefined,
      plan: body.plan,
    };
    const tenant = await createTenant(payload);
    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    return backendJson(error);
  }
}
