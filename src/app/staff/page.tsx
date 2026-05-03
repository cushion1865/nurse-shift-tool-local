"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StaffTable } from "@/components/shift/StaffTable";
import { StaffDialog } from "@/components/shift/StaffDialog";
import {
  fetchStaffs,
  createStaff,
  updateStaff,
  deleteStaff,
} from "@/features/staff/staffRepository";
import { fetchShiftTypes } from "@/features/shift-types/shiftTypeRepository";
import type { Staff, ShiftType } from "@/types";
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

export default function StaffPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [loading, setLoading] = useState(true);

  // ダイアログ状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Staff | null>(null);

  // 削除確認
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffList, typeList] = await Promise.all([fetchStaffs(), fetchShiftTypes()]);
      setStaffs(staffList);
      setShiftTypes(typeList);
    } catch {
      toast.error("スタッフの読み込みに失敗しました");
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

  function openEditDialog(staff: Staff) {
    setEditTarget(staff);
    setDialogOpen(true);
  }

  async function handleSave(data: Omit<Staff, "id">) {
    try {
      if (editTarget) {
        await updateStaff(editTarget.id, data);
        toast.success(`${data.name} を更新しました`);
      } else {
        await createStaff(data);
        toast.success(`${data.name} を追加しました`);
      }
      await load();
    } catch {
      toast.error("保存に失敗しました");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const name = deleteTarget.name;
      await deleteStaff(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      toast.success(`${name} を削除しました`);
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">スタッフ管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? "読み込み中..." : `${staffs.length}名`}
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <UserPlus className="w-4 h-4 mr-2" />
          スタッフ追加
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : staffs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">スタッフが登録されていません</p>
          <p className="text-sm mt-1">「スタッフ追加」ボタンから登録してください</p>
        </div>
      ) : (
        <StaffTable
          staffs={staffs}
          onEdit={openEditDialog}
          onDelete={setDeleteTarget}
        />
      )}

      {/* 追加・編集ダイアログ */}
      <StaffDialog
        open={dialogOpen}
        staff={editTarget}
        shiftTypes={shiftTypes}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">スタッフ削除</h2>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">{deleteTarget.name}</span>{" "}
              を削除しますか？この操作は取り消せません。
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
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                {deleting ? "削除中..." : "削除"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
