"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Plan = "free" | "pro";

export interface UserProfile {
  email: string;
  initial: string;
  plan: Plan;
}

export function useProfile(): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Supabase 환경변수가 없는 미리보기 환경에서는 기본 Pro 프로필로 폴백한다.
    // (인증이 없으면 ProGate가 계속 null을 렌더해 화면이 비어 보이는 문제 방지)
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setProfile({ email: "preview@tickerflow.app", initial: "P", plan: "pro" });
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row, error } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", data.user.id)
        .single();
      if (error) console.error("[useProfile] profiles fetch error:", error);
      setProfile({
        email: data.user.email ?? "",
        initial: (data.user.email ?? "?")[0].toUpperCase(),
        plan: (row?.plan as Plan) ?? "free",
      });
    });
  }, []);

  return profile;
}
