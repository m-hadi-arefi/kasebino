import { NextRequest, NextResponse } from "next/server";
import {
  InMemoryExpenseRepository,
  RecordExpenseUseCase,
} from "../../../../src/modules/expenses/index.ts";

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
