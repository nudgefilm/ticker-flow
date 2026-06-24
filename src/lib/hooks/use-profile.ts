"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Plan = "free" | "pro";

export interface UserProfile {
  email: string;
  initial: string;
  plan: Plan;
}

let cache: UserProfile | null = null;

export function useProfile(): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(cache);

  useEffect(() => {
    if (cache) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: row } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", data.user.id)
        .single();
      const result: UserProfile = {
        email: data.user.email ?? "",
        initial: (data.user.email ?? "?")[0].toUpperCase(),
        plan: (row?.plan as Plan) ?? "free",
      };
      cache = result;
      setProfile(result);
    });
  }, []);

  return profile;
}
