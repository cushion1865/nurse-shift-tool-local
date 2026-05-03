import type {
  Staff,
  ShiftType,
  ShiftEntry,
  RuleSettings,
  ShiftViolation,
} from "@/types";

const REST_SYMBOLS = new Set(["休", "有", "明"]);

function isRestType(st: ShiftType | undefined): boolean {
  return !st || REST_SYMBOLS.has(st.symbol);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  return formatDate(date);
}

// dateStr の前の連続勤務数を数える
function consecutiveBefore(
  staffId: string,
  dateStr: string,
  map: Map<string, ShiftEntry>,
  stMap: Map<string, ShiftType>
): number {
  let count = 0;
  const d = new Date(dateStr);
  for (let i = 0; i < 31; i++) {
    d.setDate(d.getDate() - 1);
    const ds = formatDate(d);
    const e = map.get(`${staffId}:${ds}`);
    const st = e?.shiftTypeId ? stMap.get(e.shiftTypeId) : undefined;
    if (!e || isRestType(st)) break;
    count++;
  }
  return count;
}

// dateStr の後の連続勤務数を数える
function consecutiveAfter(
  staffId: string,
  dateStr: string,
  map: Map<string, ShiftEntry>,
  stMap: Map<string, ShiftType>
): number {
  let count = 0;
  const d = new Date(dateStr);
  for (let i = 0; i < 31; i++) {
    d.setDate(d.getDate() + 1);
    const ds = formatDate(d);
    const e = map.get(`${staffId}:${ds}`);
    const st = e?.shiftTypeId ? stMap.get(e.shiftTypeId) : undefined;
    if (!e || isRestType(st)) break;
    count++;
  }
  return count;
}

export type AutoFillResult = {
  newEntries: Omit<ShiftEntry, "id">[];
  unsatisfied: ShiftViolation[];
  filledCount: number;
};

/**
 * 簡易自動補完（グリーディー法）
 *
 * 対象: status="flexible" かつ shiftTypeId=null のセル
 * 固定(fixed)・優先(preferred)セルは一切変更しない
 * 夜勤割当後は翌日に「明け」を自動付与
 */
export function autoFill(params: {
  days: Date[];
  staffs: Staff[];
  shiftTypes: ShiftType[];
  entries: ShiftEntry[];
  rules: RuleSettings | null;
}): AutoFillResult {
  const { days, staffs, shiftTypes, entries, rules } = params;

  const stMap = new Map(shiftTypes.map((t) => [t.id, t]));

  // 変更可能なセル状態（途中の割当も反映していく）
  const liveMap = new Map<string, ShiftEntry>(
    entries.map((e) => [`${e.staffId}:${e.date}`, e])
  );

  const newEntries: Omit<ShiftEntry, "id">[] = [];
  const unsatisfied: ShiftViolation[] = [];

  const akeType = shiftTypes.find((t) => t.symbol === "明");
  const dayStrs = days.map(formatDate);
  const daySet = new Set(dayStrs);

  // 月の総勤務数（rest以外）
  function totalShifts(staffId: string): number {
    let n = 0;
    for (const [k, e] of liveMap) {
      if (!k.startsWith(`${staffId}:`)) continue;
      const st = e.shiftTypeId ? stMap.get(e.shiftTypeId) : undefined;
      if (e.shiftTypeId && !isRestType(st)) n++;
    }
    return n;
  }

  // 月の夜勤数
  function nightShifts(staffId: string): number {
    let n = 0;
    for (const [k, e] of liveMap) {
      if (!k.startsWith(`${staffId}:`)) continue;
      const st = e.shiftTypeId ? stMap.get(e.shiftTypeId) : undefined;
      if (st?.requiresNightShift) n++;
    }
    return n;
  }

  // 月のある勤務種別の割当数
  function shiftTypeCount(staffId: string, shiftTypeId: string): number {
    let n = 0;
    for (const [k, e] of liveMap) {
      if (!k.startsWith(`${staffId}:`)) continue;
      if (e.shiftTypeId === shiftTypeId) n++;
    }
    return n;
  }

  function isEligible(
    staff: Staff,
    dateStr: string,
    shiftType: ShiftType
  ): boolean {
    const key = `${staff.id}:${dateStr}`;
    const existing = liveMap.get(key);

    // 固定・優先・すでに勤務割当済みは対象外
    if (existing?.status === "fixed") return false;
    if (existing?.status === "preferred") return false;
    if (existing?.shiftTypeId) return false;

    // 夜勤不可チェック
    if (shiftType.requiresNightShift && !staff.canNightShift) return false;

    // 勤務可能曜日チェック（全体）
    const wd = new Date(dateStr).getDay();
    if (staff.workableDays && !staff.workableDays.includes(wd)) return false;

    // 勤務種別ごとの勤務可能曜日チェック
    if (
      staff.shiftTypeWorkableDays &&
      shiftType.id in staff.shiftTypeWorkableDays
    ) {
      const allowedDays = staff.shiftTypeWorkableDays[shiftType.id];
      if (!allowedDays.includes(wd)) return false;
    }

    // 月最大勤務数
    if (
      staff.maxShiftsPerMonth != null &&
      totalShifts(staff.id) >= staff.maxShiftsPerMonth
    )
      return false;

    // 月最大夜勤数
    if (
      shiftType.requiresNightShift &&
      staff.maxNightShiftsPerMonth != null &&
      nightShifts(staff.id) >= staff.maxNightShiftsPerMonth
    )
      return false;

    // 勤務種別ごとの月間最大回数
    if (shiftType.maxPerMonth && shiftType.maxPerMonth > 0) {
      if (shiftTypeCount(staff.id, shiftType.id) >= shiftType.maxPerMonth) return false;
    }

    // 同勤務種別の最小間隔チェック
    if (shiftType.minIntervalDays && shiftType.minIntervalDays > 0) {
      for (let i = 1; i <= shiftType.minIntervalDays; i++) {
        const prevDay = addDays(dateStr, -i);
        const prevEntry = liveMap.get(`${staff.id}:${prevDay}`);
        if (prevEntry?.shiftTypeId === shiftType.id) return false;
      }
    }

    // 連勤チェック（割当てると上限超えになる場合は除外）
    if (rules && !isRestType(shiftType)) {
      const before = consecutiveBefore(staff.id, dateStr, liveMap, stMap);
      const after = consecutiveAfter(staff.id, dateStr, liveMap, stMap);
      if (before + 1 + after > rules.maxConsecutiveDays) return false;
    }

    // 最小休日数チェック（これ以上割り当てると休日が足りなくなる場合は除外）
    if (rules && rules.minDaysOff > 0 && !isRestType(shiftType)) {
      const currentWork = totalShifts(staff.id);
      if (currentWork + 1 > dayStrs.length - rules.minDaysOff) return false;
    }

    // 夜勤間隔チェック（夜→明→{N}休→次夜勤OK のため nightShiftInterval + 1 日前まで遡る）
    if (shiftType.requiresNightShift && rules && rules.nightShiftInterval > 0) {
      for (let i = 1; i <= rules.nightShiftInterval + 1; i++) {
        const prevDay = addDays(dateStr, -i);
        const prevEntry = liveMap.get(`${staff.id}:${prevDay}`);
        const prevSt = prevEntry?.shiftTypeId ? stMap.get(prevEntry.shiftTypeId) : undefined;
        if (prevSt?.requiresNightShift) return false;
      }
    }

    return true;
  }

  function assign(staffId: string, dateStr: string, shiftTypeId: string) {
    const key = `${staffId}:${dateStr}`;
    const entry: Omit<ShiftEntry, "id"> = {
      staffId,
      date: dateStr,
      shiftTypeId,
      status: "flexible",
      source: "auto",
      isLocked: false,
    };
    liveMap.set(key, { ...entry, id: `temp-${key}` });
    newEntries.push(entry);
  }

  // ─── 既存固定夜勤の翌日に「明け」を事前付与 ─────────────────
  for (const entry of entries) {
    if (!entry.shiftTypeId || entry.status !== "fixed") continue;
    const st = stMap.get(entry.shiftTypeId);
    if (!st?.requiresAke || !akeType) continue;
    const nextDay = addDays(entry.date, 1);
    if (!daySet.has(nextDay)) continue;
    const nextKey = `${entry.staffId}:${nextDay}`;
    const nextExisting = liveMap.get(nextKey);
    if (!nextExisting || (nextExisting.status !== "fixed" && nextExisting.status !== "preferred")) {
      assign(entry.staffId, nextDay, akeType.id);
    }
  }

  // ─── メインループ（日付 × 勤務種別） ───────────────────────
  for (const dateStr of dayStrs) {
    // 優先度の高い（必要人数が多い）勤務種別から処理
    const sortedTypes = [...shiftTypes]
      .filter((t) => t.requiredCount > 0)
      .sort((a, b) => b.requiredCount - a.requiredCount);

    for (const shiftType of sortedTypes) {
      // 現在の充足数を数える
      let current = 0;
      for (const e of liveMap.values()) {
        if (e.date === dateStr && e.shiftTypeId === shiftType.id) current++;
      }

      let needed = shiftType.requiredCount - current;

      while (needed > 0) {
        // 候補を総勤務数の少ない順に並べる（均等配分）
        // 夜勤はさらにスキルレベル高い順を優先（同勤務数の場合）
        const candidates = staffs
          .filter((s) => isEligible(s, dateStr, shiftType))
          .sort((a, b) => {
            const workDiff = totalShifts(a.id) - totalShifts(b.id);
            if (workDiff !== 0) return workDiff;
            if (shiftType.requiresNightShift) {
              return (b.skillLevel ?? 2) - (a.skillLevel ?? 2);
            }
            return 0;
          });

        if (candidates.length === 0) {
          unsatisfied.push({
            type: "unsatisfied",
            date: dateStr,
            message: `${dateStr.slice(5)} 「${shiftType.name}」: 割当可能なスタッフが不足`,
          });
          break;
        }

        const chosen = candidates[0];
        assign(chosen.id, dateStr, shiftType.id);

        // 明け付与フラグ付きの夜勤 → 翌日に「明け」を自動付与（2交代の長時間夜勤のみ）
        if (shiftType.requiresAke && akeType) {
          const nextDay = addDays(dateStr, 1);
          if (daySet.has(nextDay)) {
            const nextKey = `${chosen.id}:${nextDay}`;
            const nextExisting = liveMap.get(nextKey);
            if (
              !nextExisting ||
              (!nextExisting.shiftTypeId &&
                nextExisting.status === "flexible")
            ) {
              assign(chosen.id, nextDay, akeType.id);
            }
          }
        }

        needed--;
      }
    }
  }

  return {
    newEntries,
    unsatisfied,
    filledCount: newEntries.length,
  };
}
