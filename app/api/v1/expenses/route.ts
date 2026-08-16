import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  InMemoryExpenseRepository,
  RecordExpenseUseCase,
} from "@/modules/expenses/index";

const repo = new InMemoryExpenseRepository();
const recordUC = new RecordExpenseUseCase(repo);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get("merchantId") ?? "m-default";
  const expenses = await repo.listExpenses({ merchantId });
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const expense = await recordUC.execute(body);
    return NextResponse.json(expense, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
