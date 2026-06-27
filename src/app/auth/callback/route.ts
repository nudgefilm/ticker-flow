import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Vercel 프록시 환경에서 실제 도메인은 x-forwarded-host 헤더에 있음
  const forwardedHost = request.headers.get("x-forwarded-host");
  const baseUrl = forwardedHost
    ? `https://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? origin);

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

    if (!error) {
      return NextResponse.redirect(`${baseUrl}/dashboard`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth`);
}
