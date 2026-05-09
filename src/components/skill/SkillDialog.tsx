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
import type { Skill } from "@/types";

type FormData = Omit<Skill, "id">;

type Props = {
  open: boolean;
  skill: Skill | null;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
};

const DEFAULT_FORM: FormData = {
  name: "",
  requiredPerDay: 0,
  note: "",
};

export function SkillDialog({ open, skill, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        skill
          ? { name: skill.name, requiredPerDay: skill.requiredPerDay, note: skill.note ?? "" }
          : DEFAULT_FORM
      );
    }
  }, [open, skill]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, note: form.note || undefined });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{skill ? "技能を編集" : "技能を追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="skillName">技能名 *</Label>
            <Input
              id="skillName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="例: 救急対応、採血、ICU経験"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="requiredPerDay">1日あたり必要人数</Label>
            <Input
              id="requiredPerDay"
              type="number"
              min={0}
              value={form.requiredPerDay}
              onChange={(e) =>
                setForm({ ...form, requiredPerDay: Number(e.target.value) })
              }
            />
            <p className="text-xs text-gray-400">0=制限なし（人数チェックなし）</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="skillNote">メモ</Label>
            <Input
              id="skillNote"
              value={form.note ?? ""}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="備考など"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
