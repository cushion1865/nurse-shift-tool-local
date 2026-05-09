import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/localDb";

type SkillRecord = Record<string, unknown> & { id: string };

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const skills = readCollection<SkillRecord>("skills");
  const idx = skills.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  skills[idx] = { ...body, id };
  writeCollection("skills", skills);
  return NextResponse.json(skills[idx]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const skills = readCollection<SkillRecord>("skills");
  writeCollection("skills", skills.filter((s) => s.id !== id));
  return NextResponse.json({ ok: true });
}
