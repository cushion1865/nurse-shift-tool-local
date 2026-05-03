import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/localDb";

type StaffRecord = Record<string, unknown> & { id: string };

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const staffs = readCollection<StaffRecord>("staffs");
  const idx = staffs.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  staffs[idx] = { ...body, id };
  writeCollection("staffs", staffs);
  return NextResponse.json(staffs[idx]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staffs = readCollection<StaffRecord>("staffs");
  writeCollection("staffs", staffs.filter((s) => s.id !== id));
  return NextResponse.json({ ok: true });
}
