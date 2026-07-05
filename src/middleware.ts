import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, after, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

const PROTECTED_PATHS = [
  "/dashboard",
  "/news",
  "/earnings",
  "/macro",
  "/watchlist",
  "/stocks",
  "/analysis",
  "/calls",
  "/insider",
  "/sectors",
  "/alerts",
  "/billing",
  "/mypage",
  "/admin",
];

// 방문 로깅 제외 대상 — 정적 자산은 middleware config matcher에서 이미 제외됨
const VISIT_LOG_EXCLUDED_PREFIXES = ["/api/", "/admin"];

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// 미들웨어 응답을 지연시키지 않도록 after()로 응답 전송 후 실행. 같은 날 재방문은
// page_visits의 부분 유니크 인덱스가 막아주므로, upsert 대신 insert 후 중복키(23505)를 무시한다.
async function logPageVisit(userId: string | null, ip: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const admin = createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.from("page_visits").insert({
    visited_date: todayUtcDateString(),
    user_id: userId,
    ip_hash: userId ? null : await sha256Hex(ip),
  });

  if (error && error.code !== "23505") {
    console.error("[page_visits] insert failed:", error.message);
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Polar 웹훅은 인증 없이 통과
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next()
  }

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/watchlist";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/admin")) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/watchlist";
      return NextResponse.redirect(url);
    }
  }

  // 여기까지 도달한 요청만 실제로 페이지가 렌더링됨 (리다이렉트되는 요청은 위에서 이미 return됨)
  const isVisitLogExcluded = VISIT_LOG_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isVisitLogExcluded) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    after(() => logPageVisit(user?.id ?? null, ip));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
