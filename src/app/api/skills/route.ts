import { NextResponse } from "next/server";
import { readCollection, writeCollection, generateId } from "@/lib/localDb";

type SkillRecord = Record<string, unknown> & { id: string };

export async function GET() {
  const skills = readCollection<SkillRecord>("skills");
  return NextResponse.json(skills);
}

export async function POST(request: Request) {
  const body = await request.json();
  const skills = readCollection<SkillRecord>("skills");
  const newSkill: SkillRecord = { ...body, id: generateId() };
  skills.push(newSkill);
  writeCollection("skills", skills);
  return NextResponse.json(newSkill, { status: 201 });
}
