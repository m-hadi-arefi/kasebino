import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  CloseCashRegisterUseCase,
  InMemoryTreasuryRepository,
} from "@/modules/treasury/index";

const repo = new InMemoryTreasuryRepository();
const closeUC = new CloseCashRegisterUseCase(repo);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get("merchantId") ?? "m-default";
  const registers = await repo.listCashRegisters(merchantId);
  return NextResponse.json({ registers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "close") {
      const closing = await closeUC.execute(body);
      return NextResponse.json(closing);
    }
    const register = await repo.createCashRegister(body);
    return NextResponse.json(register, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
