import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/localDb";

type ShiftTypeRecord = Record<string, unknown> & { id: string };

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const types = readCollection<ShiftTypeRecord>("shift-types");
  const idx = types.findIndex((t) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  types[idx] = { ...body, id };
  writeCollection("shift-types", types);
  return NextResponse.json(types[idx]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const types = readCollection<ShiftTypeRecord>("shift-types");
  writeCollection("shift-types", types.filter((t) => t.id !== id));
  return NextResponse.json({ ok: true });
}
