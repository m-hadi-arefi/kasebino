import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  InMemoryReturnRepository,
  ProcessCustomerReturnUseCase,
} from "@/modules/returns/index";

const repo = new InMemoryReturnRepository();
const returnUC = new ProcessCustomerReturnUseCase(repo);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record = await returnUC.execute(body);
    return NextResponse.json(record, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
