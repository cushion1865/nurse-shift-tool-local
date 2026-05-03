import { NextResponse } from "next/server";
import { readCollection, writeCollection, generateId } from "@/lib/localDb";

type StaffRecord = Record<string, unknown> & { id: string };

export async function GET() {
  const staffs = readCollection<StaffRecord>("staffs");
  return NextResponse.json(staffs);
}

export async function POST(request: Request) {
  const body = await request.json();
  const staffs = readCollection<StaffRecord>("staffs");
  const newStaff: StaffRecord = { ...body, id: generateId() };
  staffs.push(newStaff);
  writeCollection("staffs", staffs);
  return NextResponse.json(newStaff, { status: 201 });
}
