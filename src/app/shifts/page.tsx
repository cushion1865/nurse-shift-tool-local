"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck, Wand2, RefreshCw, Download, Printer, BarChart2, Copy, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { ShiftGrid, type CellChangeParams } from "@/components/shift/ShiftGrid";
import { ViolationPanel } from "@/components/shift/ViolationPanel";
import { ReAdjustPanel } from "@/components/shift/ReAdjustPanel";
import { FairnessPanel } from "@/components/shift/FairnessPanel";
import { UnavailabilityPanel } from "@/components/shift/UnavailabilityPanel";
import {
  getOrCreateShiftTable,
  fetchShiftEntries,
  fetchPrevMonthEntries,
  upsertShiftEntry,
  clearShiftEntry,
} from "@/features/shifts/shiftRepository";
import { fetchStaffs } from "@/features/staff/staffRepository";
import { fetchShiftTypes } from "@/features/shift-types/shiftTypeRepository";
import { fetchRuleSettings } from "@/features/rules/ruleRepository";
import { checkShifts, buildViolationCells } from "@/features/shifts/shiftChecker";
import { autoFill } from "@/features/shifts/shiftAutoFill";
import { bulkUpsertEntries } from "@/features/shifts/shiftRepository";
import type { Staff, ShiftType, ShiftEntry, ShiftTable, ShiftViolation, RuleSettings } from "@/types";

// 月内の日付一覧
function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function cellKey(staffId: string, date: string) {
  return `${staffId}:${date}`;
}

function getToday() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function ShiftsPage() {
  const today = getToday();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);

  const [shiftTable, setShiftTable] = useState<ShiftTable | null>(null);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [entries, setEntries] = useState<ShiftEntry[]>([]);
  const [rules, setRules] = useState<RuleSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // チェック結果
  const [violations, setViolations] = useState<ShiftViolation[] | null>(null);

  // 自動補完
  const [filling, setFilling] = useState(false);

  // 前月エントリ（月またぎ連勤チェック用）
  const [prevMonthEntries, setPrevMonthEntries] = useState<ShiftEntry[]>([]);

  // 公平性パネル
  const [showFairness, setShowFairness] = useState(false);

  // 不在入力パネル
  const [showUnavailability, setShowUnavailability] = useState(false);
  const [savingUnavailability, setSavingUnavailability] = useState(false);

  // 再調整
  const [showReAdjust, setShowReAdjust] = useState(false);
  const [readjusting, setReadjusting] = useState(false);
  const [changedCells, setChangedCells] = useState<Set<string> | undefined>();
  const violationCells = useMemo(
    () => (violations ? buildViolationCells(violations) : undefined),
    [violations]
  );
  const violationDates = useMemo(() => {
    if (!violations) return undefined;
    const dates = new Set<string>();
    for (const v of violations) {
      if (v.type === "skill_mix" && v.date) dates.add(v.date);
    }
    return dates.size > 0 ? dates : undefined;
  }, [violations]);

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  // Map<cellKey, ShiftEntry> で高速ルックアップ
  const entriesMap = useMemo(() => {
    const map = new Map<string, ShiftEntry>();
    for (const e of entries) {
      map.set(cellKey(e.staffId, e.date), e);
    }
    return map;
  }, [entries]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [table, staffList, typeList, ruleData] = await Promise.all([
        getOrCreateShiftTable(year, month),
        fetchStaffs(),
        fetchShiftTypes(),
        fetchRuleSettings(),
      ]);
      const [entryList, prevEntries] = await Promise.all([
        fetchShiftEntries(table.id),
        fetchPrevMonthEntries(year, month),
      ]);
      setShiftTable(table);
      setStaffs(staffList);
      setShiftTypes(typeList);
      setEntries(entryList);
      setRules(ruleData);
      setPrevMonthEntries(prevEntries);
      setViolations(null); // 月が変わったらチェック結果リセット
    } catch {
      setError("データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  async function handleCellChange(params: CellChangeParams) {
    if (!shiftTable) return;

    const key = cellKey(params.staffId, params.date);
    const existing = entriesMap.get(key);

    // fixedかつロック済みのセルは変更不可（ロック解除操作は例外）
    if (existing?.isLocked && existing?.status === "fixed" && params.isLocked !== false) return;

    if (params.clear && existing) {
      setEntries((prev) => prev.filter((e) => e.id !== existing.id));
      try {
        await clearShiftEntry(existing.id);
      } catch {
        setEntries((prev) => [...prev, existing]);
      }
      return;
    }

    // isLocked: 明示指定 → status="fixed"なら自動true → 既存値 → false
    const newIsLocked =
      params.isLocked !== undefined
        ? params.isLocked
        : params.status === "fixed"
        ? true
        : params.status === "preferred" || params.status === "flexible"
        ? false
        : (existing?.isLocked ?? false);

    const newSource = params.source ?? "manual";

    // 楽観的更新
    const optimistic: ShiftEntry = {
      id: existing?.id ?? `temp-${key}`,
      staffId: params.staffId,
      date: params.date,
      shiftTypeId: params.shiftTypeId,
      status: params.status,
      source: newSource,
      isLocked: newIsLocked,
    };
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.id !== existing?.id && !(e.staffId === params.staffId && e.date === params.date));
      return [...filtered, optimistic];
    });

    try {
      const saved = await upsertShiftEntry({
        shiftTableId: shiftTable.id,
        staffId: params.staffId,
        date: params.date,
        shiftTypeId: params.shiftTypeId,
        status: params.status,
        source: newSource,
        isLocked: newIsLocked,
      });
      // 本IDで置き換え
      setEntries((prev) =>
        prev.map((e) =>
          e.staffId === params.staffId && e.date === params.date ? saved : e
        )
      );
    } catch {
      // rollback
      setEntries((prev) => {
        const filtered = prev.filter(
          (e) => !(e.staffId === params.staffId && e.date === params.date)
        );
        return existing ? [...filtered, existing] : filtered;
      });
    }
  }

  async function handleAutoFill() {
    if (!shiftTable) return;
    setFilling(true);
    try {
      const { newEntries, unsatisfied, filledCount } = autoFill({
        days,
        staffs,
        shiftTypes,
        entries,
        rules,
      });

      if (filledCount > 0) {
        const saved = await bulkUpsertEntries(shiftTable.id, newEntries);
        setEntries((prev) => {
          const map = new Map(prev.map((e) => [`${e.staffId}:${e.date}`, e]));
          for (const e of saved) {
            map.set(`${e.staffId}:${e.date}`, e);
          }
          return [...map.values()];
        });
        if (unsatisfied.length > 0) {
          toast.warning(`${filledCount}件のシフトを自動補完しました（${unsatisfied.length}件は補完できず）`);
        } else {
          toast.success(`${filledCount}件のシフトを自動補完しました`);
        }
      } else {
        toast.info("補完対象のセルがありませんでした");
      }

      setViolations(null);
    } catch {
      toast.error("自動補完中にエラーが発生しました");
    } finally {
      setFilling(false);
    }
  }

  async function handleReAdjust(params: {
    staffIds: string[];
    startDay: number;
    endDay: number;
  }) {
    if (!shiftTable) return;
    setReadjusting(true);
    setChangedCells(undefined);

    try {
      const { staffIds, startDay, endDay } = params;
      const pad = (n: number) => String(n).padStart(2, "0");
      const startDate = `${year}-${pad(month)}-${pad(startDay)}`;
      const endDate = `${year}-${pad(month)}-${pad(endDay)}`;

      // 1. 変更前のスナップショット
      const prevMap = new Map(entries.map((e) => [`${e.staffId}:${e.date}`, e]));

      // 2. 範囲内 flexible エントリをクリア
      const toDelete = entries.filter((e) => {
        if (e.status === "fixed" || e.status === "preferred") return false;
        if (e.date < startDate || e.date > endDate) return false;
        if (staffIds.length > 0 && !staffIds.includes(e.staffId)) return false;
        return true;
      });

      await Promise.all(toDelete.map((e) => clearShiftEntry(e.id)));

      // 3. ローカルの entries からクリア分を除く
      const deletedIds = new Set(toDelete.map((e) => e.id));
      const remainingEntries = entries.filter((e) => !deletedIds.has(e.id));

      // 4. 対象日・スタッフを絞って autoFill
      const scopeDays = days.filter((d) => {
        const ds = formatDate(d);
        return ds >= startDate && ds <= endDate;
      });
      const scopeStaffs =
        staffIds.length > 0
          ? staffs.filter((s) => staffIds.includes(s.id))
          : staffs;

      const { newEntries, filledCount } = autoFill({
        days: scopeDays,
        staffs: scopeStaffs,
        shiftTypes,
        entries: remainingEntries,
        rules,
      });

      // 5. 一括保存
      let saved: ShiftEntry[] = [];
      if (filledCount > 0) {
        saved = await bulkUpsertEntries(shiftTable.id, newEntries);
      }

      // 6. ローカルステート更新
      setEntries(() => {
        const map = new Map(remainingEntries.map((e) => [`${e.staffId}:${e.date}`, e]));
        for (const e of saved) {
          map.set(`${e.staffId}:${e.date}`, e);
        }
        return [...map.values()];
      });

      // 7. 変更セルを検出（追加・変更・削除）
      const changed = new Set<string>();
      for (const e of saved) {
        const key = `${e.staffId}:${e.date}`;
        const prev = prevMap.get(key);
        if (!prev || prev.shiftTypeId !== e.shiftTypeId) changed.add(key);
      }
      for (const e of toDelete) {
        const key = `${e.staffId}:${e.date}`;
        if (!saved.find((s) => `${s.staffId}:${s.date}` === key)) {
          changed.add(key); // クリアされたまま
        }
      }
      setChangedCells(changed);

      setViolations(null);
      setShowReAdjust(false);
    } catch {
      toast.error("再調整中にエラーが発生しました");
    } finally {
      setReadjusting(false);
    }
  }

  function handleExcelExport() {
    const REST_SYMBOLS = new Set(["休", "有", "明"]);
    const stMap = new Map(shiftTypes.map((t) => [t.id, t]));

    const header = [
      "スタッフ",
      ...days.map((d) => `${d.getMonth() + 1}/${d.getDate()}`),
      "勤務数",
      "夜勤数",
      "公休数",
    ];

    const rows = staffs.map((staff) => {
      const cells = days.map((day) => {
        const entry = entriesMap.get(`${staff.id}:${formatDate(day)}`);
        if (!entry?.shiftTypeId) return "";
        const st = stMap.get(entry.shiftTypeId);
        return st?.symbol ?? "";
      });

      let workDays = 0, nightDays = 0, offDays = 0;
      for (const day of days) {
        const entry = entriesMap.get(`${staff.id}:${formatDate(day)}`);
        if (!entry?.shiftTypeId) { offDays++; continue; }
        const st = stMap.get(entry.shiftTypeId);
        if (!st || REST_SYMBOLS.has(st.symbol)) { offDays++; }
        else { workDays++; if (st.requiresNightShift) nightDays++; }
      }

      return [staff.name, ...cells, workDays, nightDays, offDays];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    // 列幅設定
    ws["!cols"] = [
      { wch: 12 },
      ...days.map(() => ({ wch: 4 })),
      { wch: 6 }, { wch: 6 }, { wch: 6 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${year}年${month}月`);
    XLSX.writeFile(wb, `勤務表_${year}年${month}月.xlsx`);
  }

  function handlePrint() {
    window.print();
  }

  async function handlePrevMonthCopy() {
    if (!shiftTable) return;
    if (!window.confirm("前月の固定・優先エントリを今月にコピーします。既存のデータは上書きされません。よろしいですか？")) return;

    const prevEntries = prevMonthEntries.filter(
      (e) => (e.status === "fixed" || e.status === "preferred") && e.shiftTypeId
    );
    if (prevEntries.length === 0) {
      toast.info("前月にコピー対象のエントリがありません。");
      return;
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const daysInCurrentMonth = days.length;

    const toUpsert: Omit<ShiftEntry, "id">[] = [];
    for (const e of prevEntries) {
      const day = parseInt(e.date.split("-")[2]);
      if (day > daysInCurrentMonth) continue; // 前月31日など今月に存在しない日はスキップ
      const newDate = `${year}-${pad(month)}-${pad(day)}`;
      // 今月に既に固定・優先エントリがある場合はスキップ
      const existing = entriesMap.get(`${e.staffId}:${newDate}`);
      if (existing?.status === "fixed" || existing?.status === "preferred") continue;
      toUpsert.push({
        staffId: e.staffId,
        date: newDate,
        shiftTypeId: e.shiftTypeId,
        status: e.status,
        source: "manual",
        isLocked: e.isLocked,
      });
    }

    if (toUpsert.length === 0) {
      toast.info("今月のエントリと重複するため、コピーするものがありませんでした。");
      return;
    }

    const saved = await bulkUpsertEntries(shiftTable.id, toUpsert);
    setEntries((prev) => {
      const map = new Map(prev.map((e) => [`${e.staffId}:${e.date}`, e]));
      for (const e of saved) map.set(`${e.staffId}:${e.date}`, e);
      return [...map.values()];
    });
    toast.success(`${saved.length}件のエントリをコピーしました。`);
  }

  async function handleUnavailabilitySave(staffId: string, dates: string[]) {
    if (!shiftTable) return;
    setSavingUnavailability(true);
    try {
      const toUpsert: Omit<ShiftEntry, "id">[] = dates.map((date) => ({
        staffId,
        date,
        shiftTypeId: null,
        status: "fixed" as const,
        source: "manual" as const,
        isLocked: true,
      }));
      const saved = await bulkUpsertEntries(shiftTable.id, toUpsert);
      setEntries((prev) => {
        const map = new Map(prev.map((e) => [`${e.staffId}:${e.date}`, e]));
        for (const e of saved) map.set(`${e.staffId}:${e.date}`, e);
        return [...map.values()];
      });
      toast.success(`${dates.length}日を勤務不可に登録しました`);
    } catch {
      toast.error("勤務不可の登録中にエラーが発生しました");
    } finally {
      setSavingUnavailability(false);
    }
  }

  function handleCheck() {
    const result = checkShifts({
      days,
      staffs,
      shiftTypes,
      entries,
      rules,
      prevMonthEntries,
    });
    setViolations(result);
  }

  const MONTH_NAMES = [
    "", "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月",
  ];

  return (
    <main className="p-4 max-w-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">勤務表</h1>
          {!loading && (
            <p className="text-xs text-gray-400 mt-0.5">
              スタッフ {staffs.length}名 / {days.length}日間
            </p>
          )}
        </div>
        {/* 月ナビゲーション */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="w-28 text-center font-semibold text-gray-700">
            {year}年 {MONTH_NAMES[month]}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setYear(today.year);
              setMonth(today.month);
            }}
          >
            今月
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleAutoFill}
            disabled={loading || filling}
          >
            {filling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {filling ? "補完中..." : "自動補完"}
          </Button>
          <Button
            variant={showReAdjust ? "secondary" : "outline"}
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setShowReAdjust((v) => !v)}
            disabled={loading || readjusting}
          >
            {readjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {readjusting ? "調整中..." : "再調整"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={handleCheck}
            disabled={loading}
          >
            <ShieldCheck className="w-4 h-4" />
            チェック
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 no-print"
            onClick={handlePrevMonthCopy}
            disabled={loading}
          >
            <Copy className="w-4 h-4" />
            前月コピー
          </Button>
          <Button
            variant={showUnavailability ? "secondary" : "outline"}
            size="sm"
            className="text-xs gap-1.5 no-print"
            onClick={() => setShowUnavailability((v) => !v)}
            disabled={loading}
          >
            <Ban className="w-4 h-4" />
            不在入力
          </Button>
          <Button
            variant={showFairness ? "secondary" : "outline"}
            size="sm"
            className="text-xs gap-1.5 no-print"
            onClick={() => setShowFairness((v) => !v)}
            disabled={loading}
          >
            <BarChart2 className="w-4 h-4" />
            公平性
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 no-print"
            onClick={handleExcelExport}
            disabled={loading}
          >
            <Download className="w-4 h-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 no-print"
            onClick={handlePrint}
            disabled={loading}
          >
            <Printer className="w-4 h-4" />
            印刷/PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm max-w-6xl mx-auto">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中...</div>
      ) : staffs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p>スタッフが登録されていません</p>
          <p className="text-sm mt-1">
            <a href="/staff" className="text-blue-500 underline">
              スタッフ管理
            </a>
            からスタッフを追加してください
          </p>
        </div>
      ) : (
        <>
          <ShiftGrid
            days={days}
            staffs={staffs}
            shiftTypes={shiftTypes}
            entriesMap={entriesMap}
            onCellChange={handleCellChange}
            violationCells={violationCells}
            changedCells={changedCells}
            violationDates={violationDates}
          />

          {/* 再調整パネル */}
          {showReAdjust && (
            <ReAdjustPanel
              staffs={staffs}
              daysInMonth={days.length}
              running={readjusting}
              onRun={handleReAdjust}
              onClose={() => setShowReAdjust(false)}
            />
          )}

          {/* 不在入力パネル */}
          {showUnavailability && (
            <UnavailabilityPanel
              staffs={staffs}
              days={days}
              saving={savingUnavailability}
              onSave={handleUnavailabilitySave}
              onClose={() => setShowUnavailability(false)}
            />
          )}

          {/* 公平性スコアパネル */}
          {showFairness && (
            <FairnessPanel
              staffs={staffs}
              days={days}
              entriesMap={entriesMap}
              shiftTypes={shiftTypes}
              onClose={() => setShowFairness(false)}
            />
          )}

          {/* 違反パネル */}
          {violations !== null && (
            <ViolationPanel
              violations={violations}
              onClose={() => setViolations(null)}
            />
          )}

        </>
      )}

      {/* 凡例 */}
      {!loading && staffs.length > 0 && (
        <div className="mt-4 flex gap-4 text-xs text-gray-500 flex-wrap max-w-6xl mx-auto">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-amber-50 rounded border-l-2 border-l-amber-400 border border-gray-200 inline-block" />
            固定ロック（変更不可）
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-orange-50 rounded border-l-2 border-l-orange-300 border border-gray-200 inline-block" />
            固定（ロックなし）
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-blue-50/40 rounded border-l-2 border-l-blue-300 border border-gray-200 inline-block" />
            優先（希望休など）
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-white rounded border border-gray-200 inline-block" />
            フレキ（自動補完対象）
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 bg-gray-100 rounded border-l-2 border-l-gray-400 border border-gray-200 inline-flex items-center justify-center text-gray-400 text-xs font-bold">×</span>
            勤務不可
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-purple-400 rounded-full inline-block" />
            自動補完済み
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded border border-gray-200 ring-2 ring-teal-400 ring-inset inline-block" />
            再調整で変更
          </span>
        </div>
      )}
    </main>
  );
}
