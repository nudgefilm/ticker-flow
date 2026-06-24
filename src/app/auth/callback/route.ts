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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[auth/callback] result:", {
      user: data?.user?.email ?? null,
      session: data?.session ? "present" : "null",
      error: error ? { message: error.message, status: error.status } : null,
    });

    if (!error) {
      console.log("[auth/callback] success → redirect /dashboard");
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    const msg = encodeURIComponent(error?.message ?? "unknown");
    console.log("[auth/callback] fail → redirect /login?auth_error=", msg);
    return NextResponse.redirect(`${origin}/login?auth_error=${msg}`);
  }

  // 디버그: code 없음
  return NextResponse.redirect(`${origin}/login?auth_error=no_code`);
}
