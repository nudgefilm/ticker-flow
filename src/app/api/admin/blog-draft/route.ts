import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBlogDraft } from "@/lib/collect/blog-draft";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await generateBlogDraft();
  if (!result.ok) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
