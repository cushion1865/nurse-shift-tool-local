import type { RuleSettings } from "@/types";

export async function fetchRuleSettings(): Promise<RuleSettings | null> {
  const res = await fetch("/api/rules");
  if (!res.ok) return null;
  return await res.json() as RuleSettings;
}

export async function saveRuleSettings(settings: Omit<RuleSettings, "id">): Promise<RuleSettings> {
  const res = await fetch("/api/rules", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("saveRuleSettings failed");
  return await res.json() as RuleSettings;
}
