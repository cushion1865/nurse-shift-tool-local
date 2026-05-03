"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShiftTypeDialog } from "@/components/shift/ShiftTypeDialog";
import {
  fetchShiftTypes,
  createShiftType,
  updateShiftType,
  deleteShiftType,
} from "@/features/shift-types/shiftTypeRepository";
import type { ShiftType } from "@/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function ShiftTypesPage() {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ShiftType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setShiftTypes(await fetchShiftTypes());
    } catch {
      setError("勤務種別の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAddDialog() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEditDialog(st: ShiftType) {
    setEditTarget(st);
    setDialogOpen(true);
  }

  async function handleSave(data: Omit<ShiftType, "id"> & { sortOrder?: number }) {
    if (editTarget) {
      await updateShiftType(editTarget.id, data);
    } else {
      await createShiftType(data);
    }
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteShiftType(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">勤務種別管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? "読み込み中..." : `${shiftTypes.length}種別`}
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          種別を追加
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : shiftTypes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          勤務種別が登録されていません
        </div>
      ) : (
        <div className="space-y-2">
          {shiftTypes.map((st) => (
            <div
              key={st.id}
              className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 px-4 py-3"
            >
              {/* シンボルバッジ */}
              <span
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                style={{ backgroundColor: st.color }}
              >
                {st.symbol}
              </span>

              {/* 名称 */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{st.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  必要人数: {st.requiredCount}名
                </p>
              </div>

              {/* バッジ */}
              <div className="flex gap-2 shrink-0">
                {st.requiresNightShift && (
                  <Badge variant="secondary">夜勤</Badge>
                )}
              </div>

              {/* アクション（共有テンプレートは編集不可） */}
              <div className="flex gap-1 shrink-0">
                {st.userId !== null ? (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(st)}
                      aria-label="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(st)}
                      aria-label="削除"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400 px-2">共有</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ShiftTypeDialog
        open={dialogOpen}
        shiftType={editTarget}
        nextSortOrder={shiftTypes.length + 1}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      {/* 削除確認 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">勤務種別を削除</h2>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">「{deleteTarget.name}」</span>{" "}
              を削除しますか？関連する勤務セルのデータも影響を受けます。
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "削除中..." : "削除"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
