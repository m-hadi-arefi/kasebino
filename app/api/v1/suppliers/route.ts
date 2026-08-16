import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  CreateSupplierUseCase,
  InMemorySupplierRepository,
  ListSuppliersUseCase,
} from "@/modules/supplier/index";

const repo = new InMemorySupplierRepository();
const createUC = new CreateSupplierUseCase(repo);
const listUC = new ListSuppliersUseCase(repo);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get("merchantId") ?? "m-default";
  const search = searchParams.get("search") ?? undefined;
  const result = await listUC.execute({
    merchantId,
    ...(search ? { search } : {}),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supplier = await createUC.execute(body);
    return NextResponse.json(supplier, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
