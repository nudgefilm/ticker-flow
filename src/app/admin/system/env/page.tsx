import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

export const dynamic = "force-dynamic";

type EnvEntry = {
  name: string;
  category: string;
  set: boolean;
};

export default function EnvPage() {
  const envVars: EnvEntry[] = [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      category: "Supabase",
      set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    {
      name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      category: "Supabase",
      set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      category: "Supabase",
      set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    {
      name: "FINNHUB_API_KEY",
      category: "외부 API",
      set: !!process.env.FINNHUB_API_KEY,
    },
    {
      name: "FRED_API_KEY",
      category: "외부 API",
      set: !!process.env.FRED_API_KEY,
    },
    {
      name: "ANTHROPIC_API_KEY",
      category: "외부 API",
      set: !!process.env.ANTHROPIC_API_KEY,
    },
    {
      name: "ADMIN_EMAIL",
      category: "앱",
      set: !!process.env.ADMIN_EMAIL,
    },
    {
      name: "CRON_SECRET",
      category: "앱",
      set: !!process.env.CRON_SECRET,
    },
  ];

  const categories = [...new Set(envVars.map((v) => v.category))];
  const setCount = envVars.filter((v) => v.set).length;
  const missingCount = envVars.filter((v) => !v.set).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">환경변수 상태</h1>
        <p className="mt-1 text-sm text-[#a6a6a6]">서비스 운영에 필요한 환경변수 설정 현황</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <p className="text-xs text-[#a6a6a6]">설정됨</p>
          <p className="mt-1.5 text-2xl font-semibold text-green-400">{setCount}개</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#111111] p-5">
          <p className="text-xs text-[#a6a6a6]">미설정</p>
          <p
            className={`mt-1.5 text-2xl font-semibold ${
              missingCount > 0 ? "text-red-400" : "text-[#a6a6a6]"
            }`}
          >
            {missingCount}개
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const items = envVars.filter((v) => v.category === category);
          return (
            <div
              key={category}
              className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <h2 className="text-sm font-medium text-white">{category}</h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {items.map((envVar) => (
                  <div
                    key={envVar.name}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {envVar.set ? (
                        <IconCircleCheck
                          size={15}
                          stroke={1.5}
                          className="text-green-400 flex-none"
                        />
                      ) : (
                        <IconAlertCircle
                          size={15}
                          stroke={1.5}
                          className="text-red-400 flex-none"
                        />
                      )}
                      <span className="font-mono text-xs text-white">{envVar.name}</span>
                    </div>
                    <span
                      className={`text-xs ${envVar.set ? "text-green-400" : "text-red-400"}`}
                    >
                      {envVar.set ? "설정됨" : "미설정"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#a6a6a6]">값은 서버에서만 확인하며 화면에 노출되지 않습니다.</p>
    </div>
  );
}
