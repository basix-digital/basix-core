import { NextResponse } from "next/server";
import { markInvoiceAsPaid } from "@/lib/api/console";
import { backendJson } from "@/lib/api/server";

interface RouteContext {
  params: Promise<{ invoiceId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { invoiceId } = await context.params;
    return NextResponse.json(await markInvoiceAsPaid(invoiceId));
  } catch (error) {
    return backendJson(error);
  }
}
