import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBlogDraft, BLOG_DRAFT_TYPES, type BlogDraftType } from "@/lib/collect/blog-draft";

const VALID_TYPES = new Set(BLOG_DRAFT_TYPES.map((t) => t.id));

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const type = req.nextUrl.searchParams.get("type") as BlogDraftType | null;
  if (!type || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "유효하지 않은 타입입니다." }, { status: 400 });
  }

  const result = await generateBlogDraft(type);
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
