import { NextResponse } from "next/server";
import { readSingle, writeSingle } from "@/lib/localDb";

const DEFAULT_RULES = {
  maxConsecutiveDays: 5,
  minDaysOff: 8,
  nightShiftInterval: 1,
};

export async function GET() {
  const rules = readSingle("rule-settings", DEFAULT_RULES);
  return NextResponse.json(rules);
}

export async function PUT(request: Request) {
  const body = await request.json();
  writeSingle("rule-settings", body);
  return NextResponse.json(body);
}
