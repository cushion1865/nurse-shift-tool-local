"use client";

import type { Staff, ShiftType, ShiftEntry } from "@/types";

const REST_SYMBOLS = new Set(["休", "有", "明"]);
const SKILL_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: "新人", cls: "bg-red-100 text-red-700" },
  2: { label: "中堅", cls: "bg-yellow-100 text-yellow-700" },
  3: { label: "ベテ", cls: "bg-green-100 text-green-700" },
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type StaffStats = {
  staff: Staff;
  workDays: number;
  nightDays: number;
  offDays: number;
};

function computeAllStats(
  staffs: Staff[],
  days: Date[],
  entriesMap: Map<string, ShiftEntry>,
  shiftTypes: ShiftType[]
): StaffStats[] {
  const stMap = new Map(shiftTypes.map((t) => [t.id, t]));
  return staffs.map((staff) => {
    let workDays = 0, nightDays = 0, offDays = 0;
    for (const day of days) {
      const entry = entriesMap.get(`${staff.id}:${formatDate(day)}`);
      if (!entry?.shiftTypeId) { offDays++; continue; }
      const st = stMap.get(entry.shiftTypeId);
      if (!st || REST_SYMBOLS.has(st.symbol)) { offDays++; }
      else { workDays++; if (st.requiresNightShift) nightDays++; }
    }
    return { staff, workDays, nightDays, offDays };
  });
}

function avg(vals: number[]) {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

function devClass(val: number, mean: number): string {
  const diff = val - mean;
  if (Math.abs(diff) <= 1) return "text-gray-700";
  if (diff >= 4 || diff <= -4) return "text-red-600 font-bold";
  if (diff >= 2 || diff <= -2) return "text-orange-500 font-semibold";
  return "text-gray-700";
}

type Props = {
  staffs: Staff[];
  days: Date[];
  entriesMap: Map<string, ShiftEntry>;
  shiftTypes: ShiftType[];
  onClose: () => void;
};

export function FairnessPanel({ staffs, days, entriesMap, shiftTypes, onClose }: Props) {
  const stats = computeAllStats(staffs, days, entriesMap, shiftTypes)
    .sort((a, b) => b.workDays - a.workDays);

  // 月最大勤務数が設定されているスタッフは勤務数・公休数の平均から除外
  // 夜勤不可スタッフは夜勤数の平均から除外
  const workComparable  = stats.filter((s) => s.staff.maxShiftsPerMonth == null);
  const nightComparable = stats.filter((s) => s.staff.canNightShift);

  const avgWork  = avg(workComparable.map((s) => s.workDays));
  const avgNight = avg(nightComparable.map((s) => s.nightDays));
  const avgOff   = avg(workComparable.map((s) => s.offDays));

  return (
    <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden no-print">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">公平性スコア</span>
        <span className="text-xs text-gray-400">（平均からの乖離：橙=±2〜3日、赤=±4日以上）</span>
        <button
          onClick={onClose}
          className="ml-auto text-gray-400 hover:text-gray-600 text-xs underline"
        >
          閉じる
        </button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
              <th className="text-left px-4 py-2 font-medium">スタッフ</th>
              <th className="text-left px-2 py-2 font-medium">レベル</th>
              <th className="text-right px-4 py-2 font-medium">
                勤務数<span className="text-gray-400 font-normal ml-1">（平均 {avgWork.toFixed(1)}）</span>
              </th>
              <th className="text-right px-4 py-2 font-medium">
                夜勤数<span className="text-gray-400 font-normal ml-1">（平均 {avgNight.toFixed(1)}）</span>
              </th>
              <th className="text-right px-4 py-2 font-medium">
                公休数<span className="text-gray-400 font-normal ml-1">（平均 {avgOff.toFixed(1)}）</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {stats.map(({ staff, workDays, nightDays, offDays }, i) => {
              const skill = SKILL_LABELS[staff.skillLevel] ?? SKILL_LABELS[2];
              // 上限設定ありのスタッフは勤務数・公休数の乖離を比較しない
              const hasWorkLimit = staff.maxShiftsPerMonth != null;
              // 夜勤不可スタッフは夜勤数の乖離を比較しない
              const canNight = staff.canNightShift;
              return (
                <tr
                  key={staff.id}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                >
                  <td className="px-4 py-2 font-medium text-gray-800">{staff.name}</td>
                  <td className="px-2 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${skill.cls}`}>
                      {skill.label}
                    </span>
                  </td>
                  {hasWorkLimit ? (
                    <td className="text-right px-4 py-2 text-gray-400">
                      {workDays}
                      <span className="text-[10px] ml-1">（上限制限あり）</span>
                    </td>
                  ) : (
                    <td className={`text-right px-4 py-2 ${devClass(workDays, avgWork)}`}>
                      {workDays}
                      <span className="text-[10px] text-gray-400 ml-1">
                        ({(workDays - avgWork) >= 0 ? "+" : ""}{(workDays - avgWork).toFixed(1)})
                      </span>
                    </td>
                  )}
                  {!canNight ? (
                    <td className="text-right px-4 py-2 text-gray-400">
                      {nightDays}
                      <span className="text-[10px] ml-1">（夜勤不可）</span>
                    </td>
                  ) : (
                    <td className={`text-right px-4 py-2 ${devClass(nightDays, avgNight)}`}>
                      {nightDays}
                      <span className="text-[10px] text-gray-400 ml-1">
                        ({(nightDays - avgNight) >= 0 ? "+" : ""}{(nightDays - avgNight).toFixed(1)})
                      </span>
                    </td>
                  )}
                  {hasWorkLimit ? (
                    <td className="text-right px-4 py-2 text-gray-400">
                      {offDays}
                      <span className="text-[10px] ml-1">（上限制限あり）</span>
                    </td>
                  ) : (
                    <td className={`text-right px-4 py-2 ${devClass(offDays, avgOff)}`}>
                      {offDays}
                      <span className="text-[10px] text-gray-400 ml-1">
                        ({(offDays - avgOff) >= 0 ? "+" : ""}{(offDays - avgOff).toFixed(1)})
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50 text-xs text-gray-500 font-medium">
              <td className="px-4 py-2" colSpan={2}>
                平均
                <span className="font-normal ml-1">
                  （上限制限なし {workComparable.length}名 / 夜勤可 {nightComparable.length}名）
                </span>
              </td>
              <td className="text-right px-4 py-2">{avgWork.toFixed(1)}</td>
              <td className="text-right px-4 py-2">{avgNight.toFixed(1)}</td>
              <td className="text-right px-4 py-2">{avgOff.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
