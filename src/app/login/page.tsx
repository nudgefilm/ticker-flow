"use client";

import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/logo";
import Link from "next/link";
import { IconBrandGoogle } from "@tabler/icons-react";

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        {/* 카드 */}
        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="mb-1 text-center text-xl font-semibold text-foreground">
            시작하기
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            구글 계정으로 바로 로그인하세요
          </p>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <IconBrandGoogle size={18} stroke={1.5} />
            구글로 계속하기
          </button>
        </div>

        {/* 하단 링크 */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          로그인 시{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
            이용약관
          </Link>
          {" "}및{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            개인정보처리방침
          </Link>
          에 동의한 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}
