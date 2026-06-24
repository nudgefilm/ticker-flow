import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  console.log("[auth/callback] code:", code ? "present" : "missing");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[auth/callback] exchangeCodeForSession error:", error ?? "none");

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // 디버그: 에러 내용을 URL에 노출
    const msg = encodeURIComponent(error?.message ?? "unknown");
    return NextResponse.redirect(`${origin}/login?auth_error=${msg}`);
  }

  // 디버그: code 없음
  return NextResponse.redirect(`${origin}/login?auth_error=no_code`);
}
