"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Staff } from "@/types";

type Props = {
  staffs: Staff[];
  daysInMonth: number; // 28〜31
  running: boolean;
  onRun: (params: {
    staffIds: string[]; // 空=全員
    startDay: number;
    endDay: number;
  }) => void;
  onClose: () => void;
};

export function ReAdjustPanel({
  staffs,
  daysInMonth,
  running,
  onRun,
  onClose,
}: Props) {
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(daysInMonth);
  const [allStaff, setAllStaff] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleStaff(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleRun() {
    const clampedStart = Math.max(1, Math.min(startDay, daysInMonth));
    const clampedEnd = Math.max(clampedStart, Math.min(endDay, daysInMonth));
    onRun({
      staffIds: allStaff ? [] : [...selectedIds],
      startDay: clampedStart,
      endDay: clampedEnd,
    });
  }

  const canRun = allStaff || selectedIds.size > 0;

  return (
    <div className="mt-4 border border-blue-200 rounded-xl bg-blue-50/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
          <RefreshCw className="w-4 h-4" />
          部分再調整
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          閉じる
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        選択した範囲の <span className="font-medium text-blue-700">flexible</span>{" "}
        セルをリセットして再補完します。fixed / preferred セルは変更されません。
      </p>

      {/* 日付範囲 */}
      <div className="mb-4">
        <Label className="text-xs text-gray-600 mb-1 block">日付範囲</Label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={daysInMonth}
            value={startDay}
            onChange={(e) => {
              const v = Number(e.target.value);
              setStartDay(v);
              if (v > endDay) setEndDay(v);
            }}
            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-gray-400 text-sm">日 〜</span>
          <input
            type="number"
            min={startDay}
            max={daysInMonth}
            value={endDay}
            onChange={(e) => setEndDay(Number(e.target.value))}
            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <span className="text-gray-400 text-sm">日</span>
          <span className="text-xs text-gray-400 ml-1">
            ({endDay - startDay + 1}日間)
          </span>
        </div>
      </div>

      {/* スタッフ選択 */}
      <div className="mb-4">
        <Label className="text-xs text-gray-600 mb-2 block">対象スタッフ</Label>
        <div className="flex items-center gap-2 mb-2">
          <Checkbox
            id="allStaff"
            checked={allStaff}
            onCheckedChange={(v) => {
              setAllStaff(Boolean(v));
              if (v) setSelectedIds(new Set());
            }}
          />
          <Label htmlFor="allStaff" className="text-sm cursor-pointer">
            全員
          </Label>
        </div>
        {!allStaff && (
          <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pl-1">
            {staffs.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <Checkbox
                  id={`staff-${s.id}`}
                  checked={selectedIds.has(s.id)}
                  onCheckedChange={() => toggleStaff(s.id)}
                />
                <Label
                  htmlFor={`staff-${s.id}`}
                  className="text-xs cursor-pointer truncate"
                >
                  {s.name}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 実行ボタン */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleRun}
          disabled={running || !canRun}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
          {running ? "再調整中..." : "再調整を実行"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} disabled={running}>
          キャンセル
        </Button>
      </div>
    </div>
  );
}
