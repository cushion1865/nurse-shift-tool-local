"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Staff, ShiftType } from "@/types";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const REST_SYMBOLS = new Set(["休", "有", "明"]);

type Props = {
  open: boolean;
  staff: Staff | null; // null = 新規追加
  shiftTypes: ShiftType[];
  onClose: () => void;
  onSave: (staff: Omit<Staff, "id">) => Promise<void>;
};

const SKILL_LEVELS = [
  { value: 1, label: "新人", color: "bg-red-100 text-red-700 border-red-300" },
  { value: 2, label: "中堅", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  { value: 3, label: "ベテラン", color: "bg-green-100 text-green-700 border-green-300" },
];

const DEFAULT_FORM: Omit<Staff, "id"> = {
  name: "",
  role: "",
  skillLevel: 2,
  canNightShift: true,
  isFullTime: true,
  maxShiftsPerMonth: undefined,
  maxNightShiftsPerMonth: undefined,
  workableDays: [0, 1, 2, 3, 4, 5, 6],
  shiftTypeWorkableDays: {},
  note: "",
};

export function StaffDialog({ open, staff, shiftTypes, onClose, onSave }: Props) {
  const [form, setForm] = useState<Omit<Staff, "id">>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        staff
          ? {
              name: staff.name,
              role: staff.role ?? "",
              skillLevel: staff.skillLevel ?? 2,
              canNightShift: staff.canNightShift,
              isFullTime: staff.isFullTime,
              maxShiftsPerMonth: staff.maxShiftsPerMonth,
              maxNightShiftsPerMonth: staff.maxNightShiftsPerMonth,
              workableDays: staff.workableDays ?? [0, 1, 2, 3, 4, 5, 6],
              shiftTypeWorkableDays: staff.shiftTypeWorkableDays ?? {},
              note: staff.note ?? "",
            }
          : DEFAULT_FORM
      );
    }
  }, [open, staff]);

  function toggleDay(day: number) {
    setForm((f) => {
      const days = f.workableDays ?? [];
      return {
        ...f,
        workableDays: days.includes(day)
          ? days.filter((d) => d !== day)
          : [...days, day].sort(),
      };
    });
  }

  function toggleShiftTypeDay(shiftTypeId: string, day: number) {
    setForm((f) => {
      const current = f.shiftTypeWorkableDays ?? {};
      const days = current[shiftTypeId] ?? [];
      return {
        ...f,
        shiftTypeWorkableDays: {
          ...current,
          [shiftTypeId]: days.includes(day)
            ? days.filter((d) => d !== day)
            : [...days, day].sort(),
        },
      };
    });
  }

  function enableShiftTypeOverride(shiftTypeId: string) {
    setForm((f) => ({
      ...f,
      shiftTypeWorkableDays: {
        ...(f.shiftTypeWorkableDays ?? {}),
        [shiftTypeId]: f.workableDays ?? [0, 1, 2, 3, 4, 5, 6],
      },
    }));
  }

  function disableShiftTypeOverride(shiftTypeId: string) {
    setForm((f) => {
      const next = { ...(f.shiftTypeWorkableDays ?? {}) };
      delete next[shiftTypeId];
      return { ...f, shiftTypeWorkableDays: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        role: form.role || undefined,
        note: form.note || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // 勤務種別ごと設定に表示する種別（休み系を除く）
  const workableShiftTypes = shiftTypes.filter(
    (st) => !REST_SYMBOLS.has(st.symbol)
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{staff ? "スタッフ編集" : "スタッフ追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 氏名 */}
          <div className="space-y-1">
            <Label htmlFor="name">氏名 *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="例: 山田 花子"
            />
          </div>

          {/* 役職 */}
          <div className="space-y-1">
            <Label htmlFor="role">役職</Label>
            <Input
              id="role"
              value={form.role ?? ""}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="例: 看護師長"
            />
          </div>

          {/* スキルレベル */}
          <div className="space-y-1">
            <Label>スキルレベル</Label>
            <div className="flex gap-2">
              {SKILL_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setForm({ ...form, skillLevel: level.value })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.skillLevel === level.value
                      ? level.color + " shadow-sm"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* 常勤/非常勤 & 夜勤可否 */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isFullTime"
                checked={form.isFullTime}
                onCheckedChange={(v) =>
                  setForm({ ...form, isFullTime: Boolean(v) })
                }
              />
              <Label htmlFor="isFullTime">常勤</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="canNightShift"
                checked={form.canNightShift}
                onCheckedChange={(v) =>
                  setForm({ ...form, canNightShift: Boolean(v) })
                }
              />
              <Label htmlFor="canNightShift">夜勤可</Label>
            </div>
          </div>

          {/* 新人 + 夜勤可 + 夜勤上限未設定の場合ガイダンス */}
          {form.skillLevel === 1 && form.canNightShift && !form.maxNightShiftsPerMonth && (
            <div className="flex gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <span className="shrink-0">💡</span>
              <span>新人スタッフへの夜勤集中を防ぐため、「月最大夜勤数」の設定を推奨します</span>
            </div>
          )}

          {/* 月最大勤務数 / 月最大夜勤数 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="maxShifts">月最大勤務数</Label>
              <Input
                id="maxShifts"
                type="number"
                min={0}
                value={form.maxShiftsPerMonth ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxShiftsPerMonth: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                placeholder="制限なし"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxNight">月最大夜勤数</Label>
              <Input
                id="maxNight"
                type="number"
                min={0}
                value={form.maxNightShiftsPerMonth ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    maxNightShiftsPerMonth: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                placeholder="制限なし"
              />
            </div>
          </div>

          {/* 勤務可能曜日（全体） */}
          <div className="space-y-1">
            <Label>勤務可能曜日</Label>
            <div className="flex gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`w-8 h-8 rounded text-sm font-medium border transition-colors ${
                    (form.workableDays ?? []).includes(i)
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-500 border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 勤務種別ごとの勤務可能曜日 */}
          {workableShiftTypes.length > 0 && (
            <div className="space-y-2">
              <div>
                <Label>勤務種別ごとの勤務可能曜日</Label>
                <p className="text-xs text-gray-400 mt-0.5">
                  チェックを入れた種別のみ個別に曜日制限を設定します（未設定は上記の曜日設定を使用）
                </p>
              </div>
              <div className="space-y-1.5 pl-1">
                {workableShiftTypes.map((st) => {
                  const overrideEnabled =
                    (form.shiftTypeWorkableDays ?? {})[st.id] !== undefined;
                  const activeDays = overrideEnabled
                    ? (form.shiftTypeWorkableDays ?? {})[st.id]
                    : form.workableDays ?? [0, 1, 2, 3, 4, 5, 6];

                  return (
                    <div key={st.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={overrideEnabled}
                        onCheckedChange={(checked) => {
                          checked
                            ? enableShiftTypeOverride(st.id)
                            : disableShiftTypeOverride(st.id);
                        }}
                      />
                      <span className="w-12 text-xs font-medium text-gray-700 shrink-0">
                        {st.name}
                      </span>
                      <div className="flex gap-1">
                        {DAY_LABELS.map((label, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={!overrideEnabled}
                            onClick={() =>
                              overrideEnabled && toggleShiftTypeDay(st.id, i)
                            }
                            className={`w-7 h-7 rounded text-xs font-medium border transition-colors ${
                              !overrideEnabled
                                ? "bg-gray-50 text-gray-300 border-gray-100 cursor-default"
                                : (activeDays ?? []).includes(i)
                                ? "bg-blue-500 text-white border-blue-500"
                                : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* メモ */}
          <div className="space-y-1">
            <Label htmlFor="note">メモ</Label>
            <Input
              id="note"
              value={form.note ?? ""}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="備考など"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
