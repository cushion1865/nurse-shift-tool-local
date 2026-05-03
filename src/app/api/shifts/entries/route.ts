import { NextResponse } from "next/server";
import { readCollection, writeCollection, generateId } from "@/lib/localDb";

type EntryRecord = {
  id: string;
  shiftTableId: string;
  staffId: string;
  date: string;
  shiftTypeId: string | null;
  status: string;
  source: string;
  isLocked: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shiftTableId = searchParams.get("shiftTableId");
  const entryId = searchParams.get("id");
  const allEntries = readCollection<EntryRecord>("shift-entries");

  if (entryId) {
    const entry = allEntries.find((e) => e.id === entryId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entry);
  }

  const entries = shiftTableId
    ? allEntries.filter((e) => e.shiftTableId === shiftTableId)
    : allEntries;
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const body = await request.json();
  // body: { entries: EntryRecord[] } (upsert)
  const incoming: Omit<EntryRecord, "id">[] = body.entries ?? [body];
  const allEntries = readCollection<EntryRecord>("shift-entries");

  const savedEntries: EntryRecord[] = [];

  for (const entry of incoming) {
    const idx = allEntries.findIndex(
      (e) => e.shiftTableId === entry.shiftTableId && e.staffId === entry.staffId && e.date === entry.date
    );
    if (idx >= 0) {
      allEntries[idx] = { ...allEntries[idx], ...entry };
      savedEntries.push(allEntries[idx]);
    } else {
      const newEntry = { ...entry, id: generateId() };
      allEntries.push(newEntry);
      savedEntries.push(newEntry);
    }
  }

  writeCollection("shift-entries", allEntries);
  return NextResponse.json(savedEntries);
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const allEntries = readCollection<EntryRecord>("shift-entries");

  // Support delete by id or by (shiftTableId, staffId, date)
  if (body.id) {
    writeCollection(
      "shift-entries",
      allEntries.filter((e) => e.id !== body.id)
    );
  } else {
    writeCollection(
      "shift-entries",
      allEntries.filter(
        (e) => !(e.shiftTableId === body.shiftTableId && e.staffId === body.staffId && e.date === body.date)
      )
    );
  }
  return NextResponse.json({ ok: true });
}
