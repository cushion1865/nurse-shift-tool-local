import { NextResponse } from "next/server";
import { readCollection, writeCollection, generateId } from "@/lib/localDb";

type ShiftTableRecord = { id: string; year: number; month: number; createdAt: string; updatedAt: string };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  const tables = readCollection<ShiftTableRecord>("shift-tables");
  let table = tables.find((t) => t.year === year && t.month === month);

  if (!table) {
    const now = new Date().toISOString();
    table = { id: generateId(), year, month, createdAt: now, updatedAt: now };
    tables.push(table);
    writeCollection("shift-tables", tables);
  }

  const allEntries = readCollection<Record<string, unknown> & { shiftTableId: string }>("shift-entries");
  const entries = allEntries.filter((e) => e.shiftTableId === table!.id);

  return NextResponse.json({ table, entries });
}
