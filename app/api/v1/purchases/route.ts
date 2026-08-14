import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get("merchantId") ?? "m-default";
  return NextResponse.json({ merchantId, items: [], total: 0 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(
      {
        id: crypto.randomUUID(),
        status: "confirmed",
        ...body,
      },
      { status: 201 },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
