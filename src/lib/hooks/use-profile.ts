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
