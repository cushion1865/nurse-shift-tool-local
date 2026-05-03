"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Staff } from "@/types";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  staffs: Staff[];
  days: Date[];
  saving: boolean;
  onSave: (staffId: string, dates: string[]) => void;
  onClose: () => void;
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function UnavailabilityPanel({ staffs, days, saving, onSave, onClose }: Props) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffs[0]?.id ?? "");
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  function toggleDate(date: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function handleSave() {
    if (!selectedStaffId || selectedDates.size === 0) return;
    onSave(selectedStaffId, [...selectedDates]);
    setSelectedDates(new Set());
  }

  return (
    <div className="mt-4 border border-red-200 rounded-xl bg-red-50/40 p-4 no-print">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-red-800 flex items-center gap-1.5">
          <Ban className="w-4 h-4" />
          勤務不可・一括入力
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          閉じる
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        選択した日付を<span className="font-medium text-red-700">勤務不可（fixed + locked + null）</span>として一括登録します。自動補完では上書きされません。
      </p>

      {/* スタッフ選択 */}
      <div className="mb-4">
        <Label className="text-xs text-gray-600 mb-1 block">スタッフ</Label>
        <select
          value={selectedStaffId}
          onChange={(e) => {
            setSelectedStaffId(e.target.value);
            setSelectedDates(new Set());
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
        >
          {staffs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* 日付チェックボックス */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs text-gray-600">不在日（{selectedDates.size}日選択中）</Label>
          <div className="flex gap-2 text-xs">
            <button
              className="text-red-500 hover:underline"
              onClick={() => setSelectedDates(new Set(days.map(formatDate)))}
            >
              全選択
            </button>
            <button
              className="text-gray-400 hover:underline"
              onClick={() => setSelectedDates(new Set())}
            >
              クリア
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {days.map((d) => {
            const ds = formatDate(d);
            const dow = d.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const checked = selectedDates.has(ds);
            return (
              <label
                key={ds}
                className={`flex flex-col items-center cursor-pointer select-none px-1.5 py-1 rounded border text-xs transition-colors ${
                  checked
                    ? "bg-red-500 border-red-500 text-white"
                    : isWeekend
                    ? "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-[10px] leading-none mb-0.5">{DAY_LABELS[dow]}</span>
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleDate(ds)}
                  className="sr-only"
                />
                <span className="font-medium">{d.getDate()}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 実行ボタン */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleSave}
          disabled={saving || !selectedStaffId || selectedDates.size === 0}
          className="gap-1.5"
        >
          <Ban className="w-3.5 h-3.5" />
          {saving ? "登録中..." : `${selectedDates.size}日を勤務不可に登録`}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
