import { NextRequest, NextResponse } from "next/server";
import {
  InMemoryReturnRepository,
  ProcessCustomerReturnUseCase,
} from "../../../../src/modules/returns/index.ts";

const repo = new InMemoryReturnRepository();
const returnUC = new ProcessCustomerReturnUseCase(repo);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const record = await returnUC.execute(body);
    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
