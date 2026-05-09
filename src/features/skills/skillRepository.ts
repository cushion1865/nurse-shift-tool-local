import type { Skill } from "@/types";

function toSkill(row: Record<string, unknown>): Skill {
  return {
    id: row.id as string,
    name: row.name as string,
    requiredPerDay: (row.requiredPerDay as number) ?? 0,
    note: (row.note as string) ?? undefined,
  };
}

export async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch("/api/skills");
  if (!res.ok) throw new Error("fetchSkills failed");
  const data = await res.json();
  return (data as Record<string, unknown>[]).map(toSkill);
}

export async function createSkill(skill: Omit<Skill, "id">): Promise<Skill> {
  const res = await fetch("/api/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(skill),
  });
  if (!res.ok) throw new Error("createSkill failed");
  return toSkill(await res.json());
}

export async function updateSkill(id: string, skill: Omit<Skill, "id">): Promise<Skill> {
  const res = await fetch(`/api/skills/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(skill),
  });
  if (!res.ok) throw new Error("updateSkill failed");
  return toSkill(await res.json());
}

export async function deleteSkill(id: string): Promise<void> {
  const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("deleteSkill failed");
}
