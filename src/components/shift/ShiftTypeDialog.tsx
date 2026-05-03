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
import type { ShiftType } from "@/types";

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#a78bfa", // purple-light
  "#6b7280", // gray
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
];

type FormData = Omit<ShiftType, "id"> & { sortOrder?: number };

type Props = {
  open: boolean;
  shiftType: ShiftType | null;
  nextSortOrder: number;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
};

const DEFAULT_FORM: FormData = {
  name: "",
  symbol: "",
  color: "#3b82f6",
  requiredCount: 0,
  requiresNightShift: false,
  requiresAke: false,
  sortOrder: 0,
  minPerMonth: 0,
  maxPerMonth: 0,
};

export function ShiftTypeDialog({
  open,
  shiftType,
  nextSortOrder,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        shiftType
          ? {
              name: shiftType.name,
              symbol: shiftType.symbol,
              color: shiftType.color,
              requiredCount: shiftType.requiredCount,
              requiresNightShift: shiftType.requiresNightShift ?? false,
              requiresAke: shiftType.requiresAke ?? false,
              sortOrder: shiftType.sortOrder,
              minPerMonth: shiftType.minPerMonth ?? 0,
              maxPerMonth: shiftType.maxPerMonth ?? 0,
            }
          : { ...DEFAULT_FORM, sortOrder: nextSortOrder }
      );
    }
  }, [open, shiftType, nextSortOrder]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const isValid = form.name.trim() && form.symbol.trim();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {shiftType ? "勤務種別を編集" : "勤務種別を追加"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* プレビュー */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <span
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: form.color }}
            >
              {form.symbol || "？"}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {form.name || "（名称未設定）"}
            </span>
          </div>

          {/* 名称・略称 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="typeName">名称 *</Label>
              <Input
                id="typeName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="例: 日勤"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="symbol">略称 *</Label>
              <Input
                id="symbol"
                value={form.symbol}
                onChange={(e) =>
                  setForm({ ...form, symbol: e.target.value.slice(0, 2) })
                }
                required
                placeholder="例: 日"
                maxLength={2}
              />
            </div>
          </div>

          {/* カラー選択 */}
          <div className="space-y-1">
            <Label>カラー</Label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    form.color === c
                      ? "border-gray-800 scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border border-gray-200"
                title="カスタムカラー"
              />
            </div>
          </div>

          {/* 必要人数 */}
          <div className="space-y-1">
            <Label htmlFor="requiredCount">1日あたり必要人数</Label>
            <Input
              id="requiredCount"
              type="number"
              min={0}
              value={form.requiredCount}
              onChange={(e) =>
                setForm({ ...form, requiredCount: Number(e.target.value) })
              }
            />
          </div>

          {/* 月間回数制限 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="minPerMonth">月間最小回数</Label>
              <Input
                id="minPerMonth"
                type="number"
                min={0}
                value={form.minPerMonth ?? 0}
                onChange={(e) =>
                  setForm({ ...form, minPerMonth: Number(e.target.value) })
                }
                placeholder="0=制限なし"
              />
              <p className="text-xs text-gray-400">0=制限なし</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxPerMonth">月間最大回数</Label>
              <Input
                id="maxPerMonth"
                type="number"
                min={0}
                value={form.maxPerMonth ?? 0}
                onChange={(e) =>
                  setForm({ ...form, maxPerMonth: Number(e.target.value) })
                }
                placeholder="0=制限なし"
              />
              <p className="text-xs text-gray-400">0=制限なし</p>
            </div>
          </div>

          {/* 夜勤フラグ */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="requiresNightShift"
                checked={form.requiresNightShift ?? false}
                onCheckedChange={(v) =>
                  setForm({ ...form, requiresNightShift: Boolean(v) })
                }
              />
              <Label htmlFor="requiresNightShift">夜勤扱い（夜勤回数・夜勤可否チェックの対象）</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="requiresAke"
                checked={form.requiresAke ?? false}
                onCheckedChange={(v) =>
                  setForm({ ...form, requiresAke: Boolean(v) })
                }
              />
              <Label htmlFor="requiresAke">翌日に明けを自動付与（2交代の長時間夜勤のみON）</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving || !isValid}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
