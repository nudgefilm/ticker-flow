import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const baseUrl = forwardedHost
    ? `https://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? origin);

  if (!code) {
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    const debugStr = errorParam
      ? encodeURIComponent(`${errorParam}${errorDesc ? `:${errorDesc}` : ""}`)
      : "no_code";
    return NextResponse.redirect(`${baseUrl}/login?error=auth&debug=${debugStr}`);
  }

  try {
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

    const debugCode = error.code ?? error.message ?? "exchange_failed";
    return NextResponse.redirect(`${baseUrl}/login?error=auth&debug=${encodeURIComponent(debugCode)}`);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(`${baseUrl}/login?error=auth&debug=${encodeURIComponent(msg)}`);
  }
}
