import type { ShiftType } from "@/types";

export const DEFAULT_SHIFT_TYPES: Omit<ShiftType, "id">[] = [
  { name: "日勤",   symbol: "日", color: "#3b82f6", requiredCount: 3 },
  { name: "夜勤",   symbol: "夜", color: "#8b5cf6", requiredCount: 2, requiresNightShift: true },
  { name: "明け",   symbol: "明", color: "#a78bfa", requiredCount: 0 },
  { name: "休み",   symbol: "休", color: "#6b7280", requiredCount: 0 },
  { name: "有休",   symbol: "有", color: "#10b981", requiredCount: 0 },
  { name: "研修",   symbol: "研", color: "#f59e0b", requiredCount: 0 },
];

export const CELL_STATUS_STYLES: Record<string, string> = {
  fixed:     "bg-slate-100 cursor-not-allowed opacity-80",
  preferred: "bg-blue-50 border border-blue-200",
  flexible:  "bg-white hover:bg-gray-50 cursor-pointer",
};

export const SHIFT_SOURCE_LABEL: Record<string, string> = {
  manual: "手動",
  auto:   "自動",
  request: "希望",
};
