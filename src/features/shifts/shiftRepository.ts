import type { ShiftEntry, ShiftTable } from "@/types";

type EntryPayload = {
  id?: string;
  shiftTableId: string;
  staffId: string;
  date: string;
  shiftTypeId: string | null;
  status: ShiftEntry["status"];
  source: ShiftEntry["source"];
  isLocked: boolean;
};

function toEntry(row: Record<string, unknown>): ShiftEntry {
  return {
    id: row.id as string,
    staffId: row.staffId as string,
    date: row.date as string,
    shiftTypeId: row.shiftTypeId as string | null,
    status: row.status as ShiftEntry["status"],
    source: row.source as ShiftEntry["source"],
    isLocked: row.isLocked as boolean,
  };
}

export async function getOrCreateShiftTable(year: number, month: number): Promise<ShiftTable> {
  const res = await fetch(`/api/shifts?year=${year}&month=${month}`);
  if (!res.ok) throw new Error("getOrCreateShiftTable failed");
  const { table } = await res.json();
  return table as ShiftTable;
}

export async function fetchShiftEntries(shiftTableId: string): Promise<ShiftEntry[]> {
  const res = await fetch(`/api/shifts/entries?shiftTableId=${shiftTableId}`);
  if (!res.ok) throw new Error("fetchShiftEntries failed");
  const data = await res.json();
  return (data as Record<string, unknown>[]).map(toEntry);
}

export async function upsertShiftEntry(params: {
  shiftTableId: string;
  staffId: string;
  date: string;
  shiftTypeId: string | null;
  status: ShiftEntry["status"];
  source: ShiftEntry["source"];
  isLocked: boolean;
}): Promise<ShiftEntry> {
  const res = await fetch("/api/shifts/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries: [params] }),
  });
  if (!res.ok) throw new Error("upsertShiftEntry failed");
  const saved = await res.json() as Record<string, unknown>[];
  return toEntry(saved[0]);
}

export async function clearShiftEntry(id: string): Promise<void> {
  const res = await fetch("/api/shifts/entries", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("clearShiftEntry failed");
}

export async function fetchPrevMonthEntries(year: number, month: number): Promise<ShiftEntry[]> {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const res = await fetch(`/api/shifts?year=${prevYear}&month=${prevMonth}`);
  if (!res.ok) return [];
  const { entries } = await res.json();
  return (entries as Record<string, unknown>[]).map(toEntry);
}

export async function bulkUpsertEntries(
  shiftTableId: string,
  entries: Omit<ShiftEntry, "id">[]
): Promise<ShiftEntry[]> {
  if (entries.length === 0) return [];
  const payload: EntryPayload[] = entries.map((e) => ({ ...e, shiftTableId }));
  const res = await fetch("/api/shifts/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entries: payload }),
  });
  if (!res.ok) throw new Error("bulkUpsertEntries failed");
  const saved = await res.json() as Record<string, unknown>[];
  return saved.map(toEntry);
}
