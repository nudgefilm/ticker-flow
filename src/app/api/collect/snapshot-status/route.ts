import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// collect_runs는 생성된 Supabase 타입에 없는 테이블이라 any 캐스트 사용 (CLAUDE.md 16번 규칙)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adminAny(): any {
  return createAdminClient() as any;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await adminAny()
    .from("collect_runs")
    .select("id, status, finished_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, run: data });
}
