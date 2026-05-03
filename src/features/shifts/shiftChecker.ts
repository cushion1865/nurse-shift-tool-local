import type {
  Staff,
  ShiftType,
  ShiftEntry,
  RuleSettings,
  ShiftViolation,
} from "@/types";

// 休み扱いのシンボル（連勤カウント対象外）
const REST_SYMBOLS = new Set(["休", "有", "明"]);

function isRestType(shiftType: ShiftType | undefined): boolean {
  if (!shiftType) return true; // シフトなし = 休み扱い
  return REST_SYMBOLS.has(shiftType.symbol);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortDate(s: string): string {
  // "2026-03-14" → "3/14"
  const [, m, d] = s.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function checkShifts(params: {
  days: Date[];
  staffs: Staff[];
  shiftTypes: ShiftType[];
  entries: ShiftEntry[];
  rules: RuleSettings | null;
  prevMonthEntries?: ShiftEntry[]; // 月またぎ連勤チェック用
}): ShiftViolation[] {
  const { days, staffs, shiftTypes, entries, rules, prevMonthEntries } = params;
  const violations: ShiftViolation[] = [];

  // ルックアップ用 Map
  const shiftTypeMap = new Map(shiftTypes.map((t) => [t.id, t]));
  const entryMap = new Map(entries.map((e) => [`${e.staffId}:${e.date}`, e]));

  // ─── 9-1: 必要人数不足 ───────────────────────────────────
  for (const day of days) {
    const dateStr = formatDate(day);
    for (const st of shiftTypes) {
      if (st.requiredCount <= 0) continue;
      const count = entries.filter(
        (e) => e.date === dateStr && e.shiftTypeId === st.id
      ).length;
      if (count < st.requiredCount) {
        violations.push({
          type: "shortage",
          date: dateStr,
          message: `${shortDate(dateStr)} ${st.name}: ${st.requiredCount}名必要 → ${count}名`,
        });
      }
    }
  }

  // ─── 9-2: 連勤超過（月またぎ対応） ──────────────────────────
  if (rules) {
    const maxCon = rules.maxConsecutiveDays;

    // 前月末の連続勤務数を先計算
    const trailingDays = new Map<string, number>();
    if (prevMonthEntries && prevMonthEntries.length > 0) {
      for (const staff of staffs) {
        const staffPrev = prevMonthEntries
          .filter((e) => e.staffId === staff.id && e.shiftTypeId)
          .sort((a, b) => b.date.localeCompare(a.date));
        let count = 0;
        let lastDate: string | null = null;
        for (const e of staffPrev) {
          const st = e.shiftTypeId ? shiftTypeMap.get(e.shiftTypeId) : undefined;
          if (!e.shiftTypeId || isRestType(st)) break;
          if (lastDate !== null) {
            const diff =
              (new Date(lastDate).getTime() - new Date(e.date).getTime()) / 86400000;
            if (diff !== 1) break;
          }
          count++;
          lastDate = e.date;
        }
        if (count > 0) trailingDays.set(staff.id, count);
      }
    }

    for (const staff of staffs) {
      let consecutive = trailingDays.get(staff.id) ?? 0;
      let streakStart = consecutive > 0 ? "前月末" : "";

      for (const day of days) {
        const dateStr = formatDate(day);
        const entry = entryMap.get(`${staff.id}:${dateStr}`);
        const shiftType = entry?.shiftTypeId
          ? shiftTypeMap.get(entry.shiftTypeId)
          : undefined;
        const isWorking = !isRestType(shiftType);

        if (isWorking) {
          consecutive++;
          if (consecutive === 1 && !streakStart) streakStart = dateStr;
          // 超過した最初の日にだけ1件登録
          if (consecutive === maxCon + 1) {
            const startLabel = streakStart === "前月末" ? "前月末" : shortDate(streakStart);
            violations.push({
              type: "over_consecutive",
              staffId: staff.id,
              date: dateStr,
              message: `${staff.name}: ${maxCon}日超連勤（${startLabel}〜${shortDate(dateStr)}）`,
            });
          }
        } else {
          consecutive = 0;
          streakStart = "";
        }
      }
    }
  }

  // ─── 9-3: 夜勤回数超過 ───────────────────────────────────
  for (const staff of staffs) {
    if (staff.maxNightShiftsPerMonth == null) continue;
    const nightCount = entries.filter((e) => {
      if (e.staffId !== staff.id) return false;
      const st = e.shiftTypeId ? shiftTypeMap.get(e.shiftTypeId) : undefined;
      return st?.requiresNightShift === true;
    }).length;
    if (nightCount > staff.maxNightShiftsPerMonth) {
      violations.push({
        type: "over_night",
        staffId: staff.id,
        message: `${staff.name}: 夜勤 ${nightCount}回（上限 ${staff.maxNightShiftsPerMonth}回）`,
      });
    }
  }

  // ─── 最小休日数チェック ──────────────────────────────────
  if (rules && rules.minDaysOff > 0) {
    for (const staff of staffs) {
      let workDays = 0;
      for (const day of days) {
        const dateStr = formatDate(day);
        const entry = entryMap.get(`${staff.id}:${dateStr}`);
        const st = entry?.shiftTypeId ? shiftTypeMap.get(entry.shiftTypeId) : undefined;
        if (entry?.shiftTypeId && !isRestType(st)) workDays++;
      }
      const offDays = days.length - workDays;
      if (offDays < rules.minDaysOff) {
        violations.push({
          type: "under_days_off",
          staffId: staff.id,
          message: `${staff.name}: 休日 ${offDays}日（最低 ${rules.minDaysOff}日必要）`,
        });
      }
    }
  }

  // ─── 夜勤間隔チェック ─────────────────────────────────────
  if (rules && rules.nightShiftInterval > 0) {
    const dayStrs = days.map(formatDate);
    for (const staff of staffs) {
      let lastNightIdx = -1;
      for (let i = 0; i < dayStrs.length; i++) {
        const dateStr = dayStrs[i];
        const entry = entryMap.get(`${staff.id}:${dateStr}`);
        const st = entry?.shiftTypeId ? shiftTypeMap.get(entry.shiftTypeId) : undefined;
        if (st?.requiresNightShift) {
          // 夜→明→{nightShiftInterval}休→次夜勤OK のため、必要な間隔は nightShiftInterval + 2 日
          if (lastNightIdx >= 0 && i - lastNightIdx < rules.nightShiftInterval + 2) {
            violations.push({
              type: "night_interval",
              staffId: staff.id,
              date: dateStr,
              message: `${staff.name}: 夜勤間隔不足（${shortDate(dayStrs[lastNightIdx])}→${shortDate(dateStr)}, ${i - lastNightIdx - 1}日空き / 明け含め最低${rules.nightShiftInterval + 1}日必要）`,
            });
          }
          lastNightIdx = i;
        }
      }
    }
  }

  // ─── 9-4: 勤務不可条件違反 ───────────────────────────────
  for (const staff of staffs) {
    for (const day of days) {
      const dateStr = formatDate(day);
      const entry = entryMap.get(`${staff.id}:${dateStr}`);
      if (!entry?.shiftTypeId) continue;
      const shiftType = shiftTypeMap.get(entry.shiftTypeId);
      if (!shiftType || isRestType(shiftType)) continue;

      // 夜勤不可なのに夜勤系シフト
      if (shiftType.requiresNightShift && !staff.canNightShift) {
        violations.push({
          type: "unavailable",
          staffId: staff.id,
          date: dateStr,
          message: `${staff.name} ${shortDate(dateStr)}: 夜勤不可なのに「${shiftType.name}」が割当済み`,
        });
      }

      // 勤務不可曜日（全体）
      const wd = day.getDay();
      if (staff.workableDays && !staff.workableDays.includes(wd)) {
        violations.push({
          type: "unavailable",
          staffId: staff.id,
          date: dateStr,
          message: `${staff.name} ${shortDate(dateStr)}: 勤務不可曜日にシフトが割当済み`,
        });
      }

      // 勤務種別ごとの勤務可能曜日
      if (
        staff.shiftTypeWorkableDays &&
        entry.shiftTypeId &&
        entry.shiftTypeId in staff.shiftTypeWorkableDays
      ) {
        const allowedDays = staff.shiftTypeWorkableDays[entry.shiftTypeId];
        if (!allowedDays.includes(wd)) {
          violations.push({
            type: "unavailable",
            staffId: staff.id,
            date: dateStr,
            message: `${staff.name} ${shortDate(dateStr)}: 「${shiftType.name}」は不可曜日に割当済み`,
          });
        }
      }
    }
  }

  // ─── 勤務種別の月間最小・最大回数チェック ─────────────────────
  for (const st of shiftTypes) {
    const hasMin = st.minPerMonth != null && st.minPerMonth > 0;
    const hasMax = st.maxPerMonth != null && st.maxPerMonth > 0;
    if (!hasMin && !hasMax) continue;

    for (const staff of staffs) {
      const count = entries.filter(
        (e) => e.staffId === staff.id && e.shiftTypeId === st.id
      ).length;

      if (hasMax && count > st.maxPerMonth!) {
        violations.push({
          type: "over_shift_type",
          staffId: staff.id,
          message: `${staff.name}: 「${st.name}」が月${count}回（上限${st.maxPerMonth}回）`,
        });
      }
      if (hasMin && count < st.minPerMonth!) {
        violations.push({
          type: "under_shift_type",
          staffId: staff.id,
          message: `${staff.name}: 「${st.name}」が月${count}回（最低${st.minPerMonth}回必要）`,
        });
      }
    }
  }

  // ─── 勤務種別の最小間隔チェック ──────────────────────────────
  {
    const dayStrs = days.map(formatDate);
    for (const st of shiftTypes) {
      if (!st.minIntervalDays || st.minIntervalDays <= 0) continue;
      for (const staff of staffs) {
        let lastIdx = -1;
        for (let i = 0; i < dayStrs.length; i++) {
          const entry = entryMap.get(`${staff.id}:${dayStrs[i]}`);
          if (entry?.shiftTypeId === st.id) {
            if (lastIdx >= 0 && i - lastIdx <= st.minIntervalDays) {
              violations.push({
                type: "shift_type_interval",
                staffId: staff.id,
                date: dayStrs[i],
                message: `${staff.name}: 「${st.name}」の間隔不足（${shortDate(dayStrs[lastIdx])}→${shortDate(dayStrs[i])}, ${i - lastIdx - 1}日空き / 最低${st.minIntervalDays}日必要）`,
              });
            }
            lastIdx = i;
          }
        }
      }
    }
  }

  // ─── スキルミックスチェック ───────────────────────────────
  // 夜勤に中堅（Lv.2）以上のスタッフが1名以上いるか確認
  const staffMap = new Map(staffs.map((s) => [s.id, s]));
  for (const day of days) {
    const dateStr = formatDate(day);
    const nightEntries = entries.filter((e) => {
      if (e.date !== dateStr) return false;
      const st = e.shiftTypeId ? shiftTypeMap.get(e.shiftTypeId) : undefined;
      return st?.requiresNightShift === true;
    });
    if (nightEntries.length === 0) continue;
    const hasSkilled = nightEntries.some((e) => {
      const staff = staffMap.get(e.staffId);
      return (staff?.skillLevel ?? 2) >= 2;
    });
    if (!hasSkilled) {
      violations.push({
        type: "skill_mix",
        date: dateStr,
        message: `${shortDate(dateStr)} 夜勤: 中堅・ベテランスタッフが配置されていません`,
      });
    }
  }

  return violations;
}

// セルキー単位の違反 Set を生成（グリッドのハイライト用）
export function buildViolationCells(
  violations: ShiftViolation[]
): Set<string> {
  const set = new Set<string>();
  for (const v of violations) {
    if (v.staffId && v.date) {
      set.add(`${v.staffId}:${v.date}`);
    }
  }
  return set;
}
