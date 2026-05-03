// セルのステータス
// fixed     = 絶対変更不可（有休・研修・確定済み等）
// preferred = なるべく維持（希望休・仮置き）
// flexible  = 自動補完・再調整で変更可
export type ShiftCellStatus = "fixed" | "preferred" | "flexible";

// 勤務の入力元
export type ShiftSource = "manual" | "auto" | "request";

export interface Staff {
  id: string;
  name: string;
  role?: string;
  skillLevel: number;   // 1=新人, 2=中堅, 3=ベテラン
  canNightShift: boolean;
  isFullTime: boolean; // 常勤/非常勤
  maxShiftsPerMonth?: number;
  maxNightShiftsPerMonth?: number;
  workableDays?: number[]; // 0=日, 1=月, ..., 6=土
  shiftTypeWorkableDays?: Record<string, number[]>; // shiftTypeId → 勤務可能曜日（未設定時は workableDays を使用）
  note?: string;
}

export interface ShiftType {
  id: string;
  userId?: string | null; // null = 共有テンプレート（DBから読むときのみ存在）
  name: string;           // 例: "日勤"
  symbol: string;         // 例: "日"
  color: string;          // Tailwindクラス or hex
  requiredCount: number;
  requiresNightShift?: boolean; // 夜勤としてカウント・制約に影響
  requiresAke?: boolean;        // 翌日に「明け」を自動付与する（2交代の長時間夜勤のみ）
  sortOrder?: number;
  minPerMonth?: number;   // スタッフ1人あたり月間最小回数（0=制限なし）
  maxPerMonth?: number;   // スタッフ1人あたり月間最大回数（0=制限なし）
}

export interface ShiftEntry {
  id: string;
  staffId: string;
  date: string;       // "YYYY-MM-DD"
  shiftTypeId: string | null;
  status: ShiftCellStatus;
  source: ShiftSource;
  isLocked: boolean;
}

export interface ShiftTable {
  id: string;
  year: number;
  month: number;      // 1〜12
  createdAt: string;
  updatedAt: string;
}

export interface RuleSettings {
  id: string;
  maxConsecutiveDays: number;   // 最大連勤日数
  minDaysOff: number;           // 月最小休日数
  nightShiftInterval: number;   // 夜勤後の休み日数（夜勤→明けの日数）
}

// バリデーションエラー
export interface ShiftViolation {
  type:
    | "shortage"         // 必要人数不足
    | "over_consecutive" // 連勤超過
    | "over_night"       // 夜勤回数超過
    | "unavailable"      // 勤務不可条件違反
    | "unsatisfied"      // 補完不能
    | "under_days_off"   // 最小休日数未満
    | "night_interval"   // 夜勤間隔不足
    | "skill_mix"        // 夜勤スキルミックス不足
    | "over_shift_type"  // 勤務種別月間上限超過
    | "under_shift_type"; // 勤務種別月間下限未満
  date?: string;
  staffId?: string;
  message: string;
}
