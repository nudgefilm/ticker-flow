import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const baseUrl = forwardedHost
    ? `https://${forwardedHost}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? origin);

  console.log("[auth/callback] 1. request.url:", request.url);
  console.log("[auth/callback] 2. x-forwarded-host:", forwardedHost);
  console.log("[auth/callback] 3. x-forwarded-proto:", forwardedProto);
  console.log("[auth/callback] 4. baseUrl:", baseUrl);
  console.log("[auth/callback] code 존재 여부:", !!code);

  if (!code) {
    const errorUrl = `${baseUrl}/login?error=auth&debug=no_code`;
    console.log("[auth/callback] 7. 최종 redirect (no code):", errorUrl);
    return NextResponse.redirect(errorUrl);
  }

  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log("[auth/callback] 쿠키 목록:", allCookies.map((c) => c.name));

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

    const result = await supabase.auth.exchangeCodeForSession(code);
    console.log("[auth/callback] 5. exchangeCodeForSession 결과:", JSON.stringify(result, null, 2));
    console.log("[auth/callback] 6. error 전체:", result.error);

    if (!result.error) {
      const successUrl = `${baseUrl}/dashboard`;
      console.log("[auth/callback] 7. 최종 redirect (성공):", successUrl);
      return NextResponse.redirect(successUrl);
    }

    const debugCode = result.error.code ?? result.error.message ?? "exchange_failed";
    const errorUrl = `${baseUrl}/login?error=auth&debug=${encodeURIComponent(debugCode)}`;
    console.log("[auth/callback] 7. 최종 redirect (실패):", errorUrl);
    return NextResponse.redirect(errorUrl);

  } catch (err: unknown) {
    console.log("[auth/callback] catch 에러 전체:", err);
    const msg = err instanceof Error ? err.message : String(err);
    const errorUrl = `${baseUrl}/login?error=auth&debug=${encodeURIComponent(msg)}`;
    console.log("[auth/callback] 7. 최종 redirect (catch):", errorUrl);
    return NextResponse.redirect(errorUrl);
  }
}
