import { NextRequest, NextResponse } from "next/server";
import {
  CreateSupplierUseCase,
  InMemorySupplierRepository,
  ListSuppliersUseCase,
} from "../../../../src/modules/supplier/index.ts";

const repo = new InMemorySupplierRepository();
const createUC = new CreateSupplierUseCase(repo);
const listUC = new ListSuppliersUseCase(repo);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get("merchantId") ?? "m-default";
  const search = searchParams.get("search") ?? undefined;
  const result = await listUC.execute({ merchantId, search });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supplier = await createUC.execute(body);
    return NextResponse.json(supplier, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
