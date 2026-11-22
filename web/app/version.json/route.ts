import { NextResponse } from "next/server";
import deployment from "@/lib/deployment.json";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.HALTE_COMMIT ?? "local").slice(0, 7), contract: deployment.contract });
}
