import type { Staff } from "@/types";

function toStaff(row: Record<string, unknown>): Staff {
  return {
    id: row.id as string,
    name: row.name as string,
    role: (row.role as string) ?? undefined,
    skillLevel: (row.skillLevel as number) ?? 2,
    canNightShift: row.canNightShift as boolean,
    isFullTime: row.isFullTime as boolean,
    maxShiftsPerMonth: (row.maxShiftsPerMonth as number) ?? undefined,
    maxNightShiftsPerMonth: (row.maxNightShiftsPerMonth as number) ?? undefined,
    workableDays: (row.workableDays as number[]) ?? [0, 1, 2, 3, 4, 5, 6],
    shiftTypeWorkableDays: (row.shiftTypeWorkableDays as Record<string, number[]>) ?? undefined,
    skillIds: (row.skillIds as string[]) ?? [],
    note: (row.note as string) ?? undefined,
  };
}

export async function fetchStaffs(): Promise<Staff[]> {
  const res = await fetch("/api/staffs");
  if (!res.ok) throw new Error("fetchStaffs failed");
  const data = await res.json();
  return (data as Record<string, unknown>[]).map(toStaff);
}

export async function createStaff(staff: Omit<Staff, "id">): Promise<Staff> {
  const res = await fetch("/api/staffs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(staff),
  });
  if (!res.ok) throw new Error("createStaff failed");
  return toStaff(await res.json());
}

export async function updateStaff(id: string, staff: Omit<Staff, "id">): Promise<Staff> {
  const res = await fetch(`/api/staffs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(staff),
  });
  if (!res.ok) throw new Error("updateStaff failed");
  return toStaff(await res.json());
}

export async function deleteStaff(id: string): Promise<void> {
  const res = await fetch(`/api/staffs/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("deleteStaff failed");
}
