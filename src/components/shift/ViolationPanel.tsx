"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Users, Calendar, Moon, Ban, Coffee, Clock, GraduationCap } from "lucide-react";
import type { ShiftViolation } from "@/types";

const TYPE_META: Record<
  ShiftViolation["type"],
  { label: string; icon: React.ReactNode; color: string }
> = {
  shortage: {
    label: "必要人数不足",
    icon: <Users className="w-3.5 h-3.5" />,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  over_consecutive: {
    label: "連勤超過",
    icon: <Calendar className="w-3.5 h-3.5" />,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  over_night: {
    label: "夜勤回数超過",
    icon: <Moon className="w-3.5 h-3.5" />,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  unavailable: {
    label: "勤務不可違反",
    icon: <Ban className="w-3.5 h-3.5" />,
    color: "text-pink-600 bg-pink-50 border-pink-200",
  },
  unsatisfied: {
    label: "補完不能",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    color: "text-gray-600 bg-gray-50 border-gray-200",
  },
  under_days_off: {
    label: "休日数不足",
    icon: <Coffee className="w-3.5 h-3.5" />,
    color: "text-teal-600 bg-teal-50 border-teal-200",
  },
  night_interval: {
    label: "夜勤間隔不足",
    icon: <Clock className="w-3.5 h-3.5" />,
    color: "text-indigo-600 bg-indigo-50 border-indigo-200",
  },
  skill_mix: {
    label: "スキル不足",
    icon: <GraduationCap className="w-3.5 h-3.5" />,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
};

type Props = {
  violations: ShiftViolation[];
  onClose: () => void;
};

export function ViolationPanel({ violations, onClose }: Props) {
  const [openTypes, setOpenTypes] = useState<Set<string>>(
    () => new Set(["shortage", "over_consecutive", "over_night", "unavailable"])
  );

  function toggleType(type: string) {
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  // タイプ別にグルーピング
  const grouped = violations.reduce<Partial<Record<ShiftViolation["type"], ShiftViolation[]>>>(
    (acc, v) => {
      (acc[v.type] ??= []).push(v);
      return acc;
    },
    {}
  );

  const types = Object.keys(grouped) as ShiftViolation["type"][];

  if (violations.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
        <span className="text-lg">✓</span>
        チェック完了 — 違反なし
        <button onClick={onClose} className="ml-auto text-green-500 hover:text-green-700 text-xs underline">
          閉じる
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 border border-red-200 rounded-xl overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-sm font-semibold text-red-700">
          {violations.length}件の違反が見つかりました
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-red-400 hover:text-red-600 text-xs underline"
        >
          閉じる
        </button>
      </div>

      {/* 違反リスト */}
      <div className="bg-white divide-y divide-gray-100">
        {types.map((type) => {
          const items = grouped[type]!;
          const meta = TYPE_META[type];
          const isOpen = openTypes.has(type);

          return (
            <div key={type}>
              {/* タイプヘッダー */}
              <button
                onClick={() => toggleType(type)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}
                >
                  {meta.icon}
                  {meta.label}
                  <span className="ml-1 font-bold">{items.length}</span>
                </span>
                <span className="ml-auto text-gray-400">
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {/* メッセージ一覧 */}
              {isOpen && (
                <div className="px-4 pb-2 space-y-1">
                  {type === "shortage" && (() => {
                    const totalShortage = items.reduce((sum, v) => {
                      const m = v.message.match(/(\d+)名必要 → (\d+)名/);
                      return sum + (m ? Number(m[1]) - Number(m[2]) : 0);
                    }, 0);
                    return totalShortage > 0 ? (
                      <p className="text-xs font-medium text-red-600 mb-1.5">
                        合計 {totalShortage} 名分の不足があります
                      </p>
                    ) : null;
                  })()}
                  <ul className="space-y-1">
                    {items.map((v, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-600 flex items-start gap-1.5 py-0.5"
                      >
                        <span className="text-gray-300 mt-0.5">•</span>
                        {v.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
