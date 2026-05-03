"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { fetchRuleSettings, saveRuleSettings } from "@/features/rules/ruleRepository";
import { fetchShiftTypes, updateShiftType } from "@/features/shift-types/shiftTypeRepository";
import { fetchStaffs, updateStaff } from "@/features/staff/staffRepository";
import type { RuleSettings, ShiftType, Staff } from "@/types";

// ────────────────────────────────────────────────────
// 数値入力セル（blur で保存）
// ────────────────────────────────────────────────────
function NumCell({
  value,
  onSave,
  placeholder = "—",
}: {
  value: number | undefined;
  onSave: (v: number | undefined) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const [saved, setSaved] = useState(false);

  function commit() {
    const n = draft === "" ? undefined : Number(draft);
    onSave(n);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!editing) {
    return (
      <button
        onClick={() => {
          setDraft(value != null ? String(value) : "");
          setEditing(true);
        }}
        className="flex items-center gap-1 text-sm text-gray-700 hover:text-blue-600 underline-offset-2 hover:underline"
      >
        {value != null ? value : <span className="text-gray-400">{placeholder}</span>}
        {saved && <Check className="w-3 h-3 text-green-500" />}
      </button>
    );
  }

  return (
    <input
      type="number"
      min={0}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className="w-16 border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
    />
  );
}

// ────────────────────────────────────────────────────
// ページ本体
// ────────────────────────────────────────────────────
export default function RulesPage() {
  const [rules, setRules] = useState<RuleSettings | null>(null);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, types, staffList] = await Promise.all([
        fetchRuleSettings(),
        fetchShiftTypes(),
        fetchStaffs(),
      ]);
      setRules(
        r ?? {
          id: "",
          maxConsecutiveDays: 5,
          minDaysOff: 8,
          nightShiftInterval: 1,
        }
      );
      setShiftTypes(types);
      setStaffs(staffList);
    } catch {
      toast.error("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveGlobal() {
    if (!rules) return;
    setSaving(true);
    try {
      const saved = await saveRuleSettings({
        maxConsecutiveDays: rules.maxConsecutiveDays,
        minDaysOff: rules.minDaysOff,
        nightShiftInterval: rules.nightShiftInterval,
      });
      setRules(saved);
      toast.success("ルール設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // 勤務種別の必要人数をインライン更新
  async function handleShiftTypeCount(st: ShiftType, count: number) {
    try {
      await updateShiftType(st.id, {
        name: st.name,
        symbol: st.symbol,
        color: st.color,
        requiredCount: count,
        requiresNightShift: st.requiresNightShift,
        requiresAke: st.requiresAke,
        sortOrder: st.sortOrder,
      });
      setShiftTypes((prev) =>
        prev.map((t) => (t.id === st.id ? { ...t, requiredCount: count } : t))
      );
    } catch {
      toast.error("保存に失敗しました");
    }
  }

  // スタッフの月最大勤務数・夜勤数をインライン更新
  async function handleStaffLimit(
    staff: Staff,
    field: "maxShiftsPerMonth" | "maxNightShiftsPerMonth",
    value: number | undefined
  ) {
    try {
      const updated = { ...staff, [field]: value };
      await updateStaff(staff.id, {
        name: updated.name,
        role: updated.role,
        skillLevel: updated.skillLevel ?? 2,
        canNightShift: updated.canNightShift,
        isFullTime: updated.isFullTime,
        maxShiftsPerMonth: updated.maxShiftsPerMonth,
        maxNightShiftsPerMonth: updated.maxNightShiftsPerMonth,
        workableDays: updated.workableDays,
        note: updated.note,
      });
      setStaffs((prev) =>
        prev.map((s) => (s.id === staff.id ? updated : s))
      );
    } catch {
      toast.error("保存に失敗しました");
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-3xl mx-auto">
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">ルール設定</h1>

      {/* ─── Section 1: 全体ルール ─── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">全体ルール</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="maxCon" className="w-40 text-sm text-gray-600">
              最大連勤日数
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="maxCon"
                type="number"
                min={1}
                max={31}
                value={rules?.maxConsecutiveDays ?? 5}
                onChange={(e) =>
                  setRules((r) =>
                    r ? { ...r, maxConsecutiveDays: Number(e.target.value) } : r
                  )
                }
                className="w-20"
              />
              <span className="text-sm text-gray-500">日</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label htmlFor="minOff" className="w-40 text-sm text-gray-600">
              月最小休日数
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="minOff"
                type="number"
                min={0}
                max={31}
                value={rules?.minDaysOff ?? 8}
                onChange={(e) =>
                  setRules((r) =>
                    r ? { ...r, minDaysOff: Number(e.target.value) } : r
                  )
                }
                className="w-20"
              />
              <span className="text-sm text-gray-500">日</span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <Label htmlFor="nightInt" className="w-40 text-sm text-gray-600 pt-2">
              夜勤後インターバル
            </Label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Input
                  id="nightInt"
                  type="number"
                  min={0}
                  max={7}
                  value={rules?.nightShiftInterval ?? 1}
                  onChange={(e) =>
                    setRules((r) =>
                      r ? { ...r, nightShiftInterval: Number(e.target.value) } : r
                    )
                  }
                  className="w-20"
                />
                <span className="text-sm text-gray-500">日</span>
              </div>
              <p className="text-xs text-gray-400">
                例: 夜 → 明{rules && rules.nightShiftInterval > 0
                  ? ` → ${Array(rules.nightShiftInterval).fill("休").join(" → ")}`
                  : ""} → 次勤務OK
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={handleSaveGlobal} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </section>

      {/* ─── Section 2: 勤務種別ルール ─── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-800">勤務種別ルール</h2>
          <span className="text-xs text-gray-400">クリックして編集 → Enter / フォーカスアウトで保存</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          1日あたりの必要人数を設定します。チェック機能で不足を検出します。
        </p>

        {shiftTypes.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">勤務種別が未登録です</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left py-2 w-12">記号</th>
                <th className="text-left py-2">名称</th>
                <th className="text-left py-2">夜勤</th>
                <th className="text-left py-2 w-28">1日必要人数</th>
              </tr>
            </thead>
            <tbody>
              {shiftTypes.map((st) => (
                <tr key={st.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: st.color }}
                    >
                      {st.symbol}
                    </span>
                  </td>
                  <td className="py-2 font-medium text-gray-700">{st.name}</td>
                  <td className="py-2">
                    {st.requiresNightShift ? (
                      <Badge variant="secondary" className="text-xs">夜勤</Badge>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-2">
                    <NumCell
                      value={st.requiredCount}
                      onSave={(v) => handleShiftTypeCount(st, v ?? 0)}
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ─── Section 3: スタッフ別ルール ─── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-800">スタッフ別ルール</h2>
          <span className="text-xs text-gray-400">クリックして編集 → Enter / フォーカスアウトで保存</span>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          月ごとの上限を個別設定します。空欄は制限なしとして扱います。
        </p>

        {staffs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">スタッフが未登録です</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left py-2">氏名</th>
                <th className="text-left py-2">区分</th>
                <th className="text-left py-2">夜勤</th>
                <th className="text-left py-2 w-28">月最大勤務数</th>
                <th className="text-left py-2 w-28">月最大夜勤数</th>
              </tr>
            </thead>
            <tbody>
              {staffs.map((staff) => (
                <tr key={staff.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 font-medium text-gray-700">{staff.name}</td>
                  <td className="py-2">
                    <Badge variant={staff.isFullTime ? "default" : "secondary"} className="text-xs">
                      {staff.isFullTime ? "常勤" : "非常勤"}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <Badge
                      variant={staff.canNightShift ? "default" : "outline"}
                      className="text-xs"
                    >
                      {staff.canNightShift ? "可" : "不可"}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <NumCell
                      value={staff.maxShiftsPerMonth}
                      onSave={(v) => handleStaffLimit(staff, "maxShiftsPerMonth", v)}
                      placeholder="制限なし"
                    />
                  </td>
                  <td className="py-2">
                    {staff.canNightShift ? (
                      <NumCell
                        value={staff.maxNightShiftsPerMonth}
                        onSave={(v) => handleStaffLimit(staff, "maxNightShiftsPerMonth", v)}
                        placeholder="制限なし"
                      />
                    ) : (
                      <span className="text-gray-300 text-xs">夜勤不可</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
