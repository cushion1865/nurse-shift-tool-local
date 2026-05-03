import { NextResponse } from "next/server";
import { readCollection, writeCollection, generateId } from "@/lib/localDb";

type ShiftTypeRecord = Record<string, unknown> & { id: string };

export async function GET() {
  const types = readCollection<ShiftTypeRecord>("shift-types");
  return NextResponse.json(types);
}

export async function POST(request: Request) {
  const body = await request.json();
  const types = readCollection<ShiftTypeRecord>("shift-types");
  const newType: ShiftTypeRecord = { ...body, id: generateId() };
  types.push(newType);
  writeCollection("shift-types", types);
  return NextResponse.json(newType, { status: 201 });
}
