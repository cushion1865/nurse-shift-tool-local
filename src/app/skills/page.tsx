"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillDialog } from "@/components/skill/SkillDialog";
import {
  fetchSkills,
  createSkill,
  updateSkill,
  deleteSkill,
} from "@/features/skills/skillRepository";
import { fetchStaffs } from "@/features/staff/staffRepository";
import type { Skill, Staff } from "@/types";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [skillList, staffList] = await Promise.all([fetchSkills(), fetchStaffs()]);
      setSkills(skillList);
      setStaffs(staffList);
    } catch {
      toast.error("読み込みに失敗しました");
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

  function openEditDialog(skill: Skill) {
    setEditTarget(skill);
    setDialogOpen(true);
  }

  async function handleSave(data: Omit<Skill, "id">) {
    try {
      if (editTarget) {
        await updateSkill(editTarget.id, data);
        toast.success(`「${data.name}」を更新しました`);
      } else {
        await createSkill(data);
        toast.success(`「${data.name}」を追加しました`);
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
      await deleteSkill(deleteTarget.id);
      toast.success(`「${deleteTarget.name}」を削除しました`);
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  // 技能を持つスタッフ一覧を返す
  function staffsWithSkill(skillId: string): Staff[] {
    return staffs.filter((s) => s.skillIds?.includes(skillId));
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">技能設定</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? "読み込み中..." : `${skills.length}件`}
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          技能を追加
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : skills.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">技能が登録されていません</p>
          <p className="text-sm mt-1">「技能を追加」ボタンから登録してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => {
            const holders = staffsWithSkill(skill.id);
            return (
              <div
                key={skill.id}
                className="bg-white rounded-lg border border-gray-200 px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  {/* 技能名・設定 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{skill.name}</p>
                      {skill.requiredPerDay > 0 && (
                        <Badge variant="secondary">
                          1日{skill.requiredPerDay}名必要
                        </Badge>
                      )}
                    </div>
                    {skill.note && (
                      <p className="text-xs text-gray-400 mt-0.5">{skill.note}</p>
                    )}

                    {/* 技能保有者一覧 */}
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">
                        <Users className="w-3 h-3 inline mr-1" />
                        保有スタッフ（{holders.length}名）
                      </p>
                      {holders.length === 0 ? (
                        <p className="text-xs text-gray-400 pl-1">なし</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {holders.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* アクション */}
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(skill)}
                      aria-label="編集"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteTarget(skill)}
                      aria-label="削除"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SkillDialog
        open={dialogOpen}
        skill={editTarget}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      {/* 削除確認 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold mb-2">技能を削除</h2>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">「{deleteTarget.name}」</span>{" "}
              を削除しますか？スタッフへの付与情報も合わせて削除されます。
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
