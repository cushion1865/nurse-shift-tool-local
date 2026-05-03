"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Staff, ShiftType, ShiftEntry } from "@/types";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const REST_SYMBOLS = new Set(["休", "有", "明"]);

function cellKey(staffId: string, date: string) {
  return `${staffId}:${date}`;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeStats(
  staffId: string,
  days: Date[],
  entriesMap: Map<string, ShiftEntry>,
  stMap: Map<string, ShiftType>
) {
  let workDays = 0;
  let nightDays = 0;
  let offDays = 0;
  for (const day of days) {
    const entry = entriesMap.get(`${staffId}:${formatDate(day)}`);
    if (!entry?.shiftTypeId) {
      offDays++;
      continue;
    }
    const st = stMap.get(entry.shiftTypeId);
    if (!st || REST_SYMBOLS.has(st.symbol)) {
      offDays++;
    } else {
      workDays++;
      if (st.requiresNightShift) nightDays++;
    }
  }
  return { workDays, nightDays, offDays };
}

type Popup = { staffId: string; date: string; x: number; y: number; containerWidth: number };

export type CellChangeParams = {
  staffId: string;
  date: string;
  shiftTypeId: string | null;
  status: ShiftEntry["status"];
  isLocked?: boolean;
  source?: ShiftEntry["source"];
  clear?: boolean;
};

type Props = {
  days: Date[];
  staffs: Staff[];
  shiftTypes: ShiftType[];
  entriesMap: Map<string, ShiftEntry>;
  onCellChange: (params: CellChangeParams) => void;
  violationCells?: Set<string>;
  changedCells?: Set<string>;
  violationDates?: Set<string>;
};

export function ShiftGrid({
  days,
  staffs,
  shiftTypes,
  entriesMap,
  onCellChange,
  violationCells,
  changedCells,
  violationDates,
}: Props) {
  const [popup, setPopup] = useState<Popup | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stMap = new Map(shiftTypes.map((t) => [t.id, t]));

  // ポップアップ外クリックで閉じる
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    }
    if (popup) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [popup]);

  function openPopup(staffId: string, date: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    setPopup({
      staffId,
      date,
      x: rect.left - (containerRect?.left ?? 0),
      y: rect.bottom - (containerRect?.top ?? 0) + 4,
      containerWidth: containerRef.current?.clientWidth ?? 600,
    });
  }

  const currentEntry = popup
    ? entriesMap.get(cellKey(popup.staffId, popup.date))
    : null;

  // fixedかつisLockedのセルは一切変更不可
  const isLocked = currentEntry?.isLocked && currentEntry?.status === "fixed";

  // 希望休: 「休み」シンボルの勤務種別 + status=preferred + source=request
  const kyuumiType = shiftTypes.find((t) => t.symbol === "休" || t.name === "休み");

  function handleSelectType(shiftTypeId: string) {
    if (!popup || isLocked) return;
    onCellChange({
      staffId: popup.staffId,
      date: popup.date,
      shiftTypeId,
      status: currentEntry?.status ?? "flexible",
      isLocked: currentEntry?.isLocked ?? false,
    });
    setPopup(null);
  }

  function handleStatusChange(status: ShiftEntry["status"]) {
    if (!popup || isLocked) return;
    const newLocked = status === "fixed";
    onCellChange({
      staffId: popup.staffId,
      date: popup.date,
      shiftTypeId: currentEntry?.shiftTypeId ?? null,
      status,
      isLocked: newLocked,
    });
  }

  // 希望休クイックアクション
  function handleKyuumei() {
    if (!popup || isLocked || !kyuumiType) return;
    onCellChange({
      staffId: popup.staffId,
      date: popup.date,
      shiftTypeId: kyuumiType.id,
      status: "preferred",
      isLocked: false,
      source: "request",
    });
    setPopup(null);
  }

  // 確定固定クイックアクション
  function handleConfirm() {
    if (!popup || isLocked) return;
    onCellChange({
      staffId: popup.staffId,
      date: popup.date,
      shiftTypeId: currentEntry?.shiftTypeId ?? null,
      status: "fixed",
      isLocked: true,
    });
    setPopup(null);
  }

  // 勤務不可（fixed + null + locked）
  function handleUnavailable() {
    if (!popup || isLocked) return;
    onCellChange({
      staffId: popup.staffId,
      date: popup.date,
      shiftTypeId: null,
      status: "fixed",
      isLocked: true,
    });
    setPopup(null);
  }

  // ロック解除
  function handleUnlock() {
    if (!popup) return;
    onCellChange({
      staffId: popup.staffId,
      date: popup.date,
      shiftTypeId: currentEntry?.shiftTypeId ?? null,
      status: "preferred",
      isLocked: false,
    });
  }

  function handleClear() {
    if (!popup || isLocked) return;
    onCellChange({
      staffId: popup.staffId,
      date: popup.date,
      shiftTypeId: null,
      status: "flexible",
      isLocked: false,
      clear: true,
    });
    setPopup(null);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* グリッドテーブル */}
      <div className="overflow-auto border border-gray-200 rounded-lg bg-white print-area">
        <table className="border-collapse text-sm" style={{ minWidth: "max-content" }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left text-xs font-medium text-gray-500 border-r border-gray-200 whitespace-nowrap min-w-[100px]">
                スタッフ
              </th>
              {days.map((day) => {
                const wd = day.getDay();
                const dateStr = formatDate(day);
                const hasSkillViolation = violationDates?.has(dateStr) ?? false;
                return (
                  <th
                    key={day.toISOString()}
                    title={hasSkillViolation ? "スキルミックス違反あり" : undefined}
                    className={`px-0 py-1 text-center border-r border-gray-100 w-9 ${
                      hasSkillViolation
                        ? "bg-amber-50 text-amber-700"
                        : wd === 0
                        ? "bg-red-50 text-red-600"
                        : wd === 6
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600"
                    }`}
                  >
                    <div className="text-xs font-medium leading-tight">{day.getDate()}</div>
                    <div className="text-[10px] leading-tight">{WEEKDAY_LABELS[wd]}</div>
                    {hasSkillViolation && (
                      <div className="w-1 h-1 bg-amber-500 rounded-full mx-auto mt-0.5" />
                    )}
                  </th>
                );
              })}
              {/* 集計列ヘッダー */}
              <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 bg-gray-100 border-l border-gray-300 whitespace-nowrap min-w-[56px]">
                集計
              </th>
            </tr>
          </thead>
          <tbody>
            {staffs.map((staff, si) => {
              const { workDays, nightDays, offDays } = computeStats(
                staff.id,
                days,
                entriesMap,
                stMap
              );
              return (
                <tr key={staff.id} className={si % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td
                    className={`sticky left-0 z-10 border-r border-gray-200 px-3 py-1 whitespace-nowrap font-medium text-gray-800 text-xs ${
                      si % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    {staff.name}
                  </td>
                  {days.map((day) => {
                    const dateStr = formatDate(day);
                    const wd = day.getDay();
                    const key = cellKey(staff.id, dateStr);
                    const entry = entriesMap.get(key);
                    const shiftType = entry?.shiftTypeId
                      ? shiftTypes.find((t) => t.id === entry.shiftTypeId)
                      : null;
                    const isFixed = entry?.status === "fixed";
                    const isPreferred = entry?.status === "preferred";
                    const isAutoFilled = entry?.source === "auto";
                    const isCellLocked = entry?.isLocked && isFixed;
                    const isUnavailable = isCellLocked && !shiftType;
                    const isActive = popup?.staffId === staff.id && popup?.date === dateStr;
                    const hasViolation = violationCells?.has(key) ?? false;
                    const isChanged = changedCells?.has(key) ?? false;

                    return (
                      <td
                        key={dateStr}
                        onClick={(e) => openPopup(staff.id, dateStr, e)}
                        className={[
                          "relative border-r border-b border-gray-100 w-9 h-9 text-center cursor-pointer select-none transition-colors",
                          isActive
                            ? "ring-2 ring-blue-400 ring-inset z-10"
                            : hasViolation
                            ? "ring-2 ring-red-400 ring-inset"
                            : isChanged
                            ? "ring-2 ring-teal-400 ring-inset"
                            : "",
                          isUnavailable
                            ? "bg-gray-100 border-l-2 border-l-gray-400"
                            : isCellLocked
                            ? "bg-amber-50 border-l-2 border-l-amber-400"
                            : isFixed
                            ? "bg-orange-50 border-l-2 border-l-orange-300"
                            : isPreferred
                            ? "bg-blue-50/40 border-l-2 border-l-blue-300"
                            : wd === 0
                            ? "bg-red-50/40 hover:bg-red-50"
                            : wd === 6
                            ? "bg-blue-50/40 hover:bg-blue-50"
                            : "hover:bg-gray-100",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {isUnavailable ? (
                          <span className="text-gray-400 text-sm font-bold">×</span>
                        ) : shiftType ? (
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-white text-xs font-bold"
                            style={{ backgroundColor: shiftType.color }}
                          >
                            {shiftType.symbol}
                          </span>
                        ) : null}

                        {/* 固定ロックアイコン（勤務不可以外） */}
                        {isCellLocked && !isUnavailable && (
                          <Lock className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-amber-500" />
                        )}

                        {/* 自動補完マーク */}
                        {isAutoFilled && !isCellLocked && (
                          <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-purple-400 rounded-full" />
                        )}
                      </td>
                    );
                  })}

                  {/* 集計セル */}
                  <td className="border-l border-gray-300 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600 whitespace-nowrap align-middle">
                    <div className="flex flex-col gap-0">
                      <span><span className="text-gray-400">勤</span> <span className="font-semibold text-gray-700">{workDays}</span></span>
                      <span><span className="text-gray-400">夜</span> <span className="font-semibold text-indigo-600">{nightDays}</span></span>
                      <span><span className="text-gray-400">休</span> <span className="font-semibold text-gray-500">{offDays}</span></span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* セル編集ポップアップ */}
      {popup && (
        <div
          ref={popupRef}
          className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-64 no-print"
          style={{
            left: Math.min(
              popup.x,
              popup.containerWidth - 272
            ),
            top: popup.y,
          }}
        >
          {/* 固定ロックバナー */}
          {isLocked ? (
            <div className="flex items-center justify-between mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" /> 固定済み（変更不可）
              </span>
              <button
                onClick={handleUnlock}
                className="text-xs text-amber-600 underline hover:text-amber-800"
              >
                解除
              </button>
            </div>
          ) : (
            /* クイックアクション */
            <div className="flex gap-1.5 mb-3">
              {kyuumiType && (
                <button
                  onClick={handleKyuumei}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: kyuumiType.color }}
                  >
                    {kyuumiType.symbol}
                  </span>
                  希望休
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                <Lock className="w-3 h-3" />
                確定固定
              </button>
              <button
                onClick={handleUnavailable}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 transition-colors"
              >
                <Ban className="w-3 h-3" />
                勤務不可
              </button>
            </div>
          )}

          {/* 勤務種別選択 */}
          <p className="text-xs text-gray-500 mb-2 font-medium">勤務種別</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {shiftTypes.map((st) => {
              const isSelected = currentEntry?.shiftTypeId === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => handleSelectType(st.id)}
                  disabled={isLocked}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? "border-transparent text-white shadow-sm"
                      : "border-gray-200 text-gray-700 hover:border-gray-400"
                  }`}
                  style={isSelected ? { backgroundColor: st.color } : undefined}
                >
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: st.color }}
                  >
                    {st.symbol}
                  </span>
                  {st.name}
                </button>
              );
            })}
          </div>

          {/* ステータス選択 */}
          {!isLocked && (
            <>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">ステータス</p>
              <div className="flex gap-1 mb-3">
                {(
                  [
                    { value: "flexible", label: "フレキ" },
                    { value: "preferred", label: "優先" },
                    { value: "fixed", label: "固定" },
                  ] as { value: ShiftEntry["status"]; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`flex-1 py-1 rounded-md text-xs font-medium border transition-colors ${
                      (currentEntry?.status ?? "flexible") === opt.value
                        ? opt.value === "fixed"
                          ? "bg-amber-500 text-white border-amber-500"
                          : opt.value === "preferred"
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-gray-500 text-white border-gray-500"
                        : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {opt.label}
                    {opt.value === "fixed" && (
                      <Lock className="inline w-2.5 h-2.5 ml-0.5 -mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* クリア */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7"
            onClick={handleClear}
            disabled={isLocked}
          >
            クリア
          </Button>
        </div>
      )}
    </div>
  );
}
