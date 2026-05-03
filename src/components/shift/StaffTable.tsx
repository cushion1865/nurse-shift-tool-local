"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import type { Staff } from "@/types";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  staffs: Staff[];
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
};

export function StaffTable({ staffs, onEdit, onDelete }: Props) {
  if (staffs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        スタッフが登録されていません
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>氏名</TableHead>
          <TableHead>役職</TableHead>
          <TableHead>区分</TableHead>
          <TableHead>夜勤</TableHead>
          <TableHead>月最大勤務</TableHead>
          <TableHead>月最大夜勤</TableHead>
          <TableHead>勤務可能曜日</TableHead>
          <TableHead className="w-24"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staffs.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.name}</TableCell>
            <TableCell>{s.role ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={s.isFullTime ? "default" : "secondary"}>
                {s.isFullTime ? "常勤" : "非常勤"}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={s.canNightShift ? "default" : "outline"}>
                {s.canNightShift ? "可" : "不可"}
              </Badge>
            </TableCell>
            <TableCell>
              {s.maxShiftsPerMonth != null ? `${s.maxShiftsPerMonth}日` : "—"}
            </TableCell>
            <TableCell>
              {s.maxNightShiftsPerMonth != null
                ? `${s.maxNightShiftsPerMonth}回`
                : "—"}
            </TableCell>
            <TableCell>
              <div className="flex gap-0.5">
                {DAY_LABELS.map((label, i) => (
                  <span
                    key={i}
                    className={`w-6 h-6 flex items-center justify-center rounded text-xs ${
                      (s.workableDays ?? [0, 1, 2, 3, 4, 5, 6]).includes(i)
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-300"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(s)}
                  aria-label="編集"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(s)}
                  aria-label="削除"
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
