import type { ShiftType } from "@/types";

function toShiftType(row: Record<string, unknown>): ShiftType {
  return {
    id: row.id as string,
    userId: null,
    name: row.name as string,
    symbol: row.symbol as string,
    color: row.color as string,
    requiredCount: (row.requiredCount as number) ?? 0,
    requiresNightShift: (row.requiresNightShift as boolean) ?? false,
    requiresAke: (row.requiresAke as boolean) ?? false,
    sortOrder: (row.sortOrder as number) ?? 0,
  };
}

export async function fetchShiftTypes(): Promise<ShiftType[]> {
  const res = await fetch("/api/shift-types");
  if (!res.ok) throw new Error("fetchShiftTypes failed");
  const data = await res.json();
  return (data as Record<string, unknown>[]).map(toShiftType);
}

export async function createShiftType(t: Omit<ShiftType, "id"> & { sortOrder?: number }): Promise<ShiftType> {
  const res = await fetch("/api/shift-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t),
  });
  if (!res.ok) throw new Error("createShiftType failed");
  return toShiftType(await res.json());
}

export async function updateShiftType(id: string, t: Omit<ShiftType, "id"> & { sortOrder?: number }): Promise<ShiftType> {
  const res = await fetch(`/api/shift-types/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t),
  });
  if (!res.ok) throw new Error("updateShiftType failed");
  return toShiftType(await res.json());
}

export async function deleteShiftType(id: string): Promise<void> {
  const res = await fetch(`/api/shift-types/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("deleteShiftType failed");
}
