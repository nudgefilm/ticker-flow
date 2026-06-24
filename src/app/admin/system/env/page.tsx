import { IconCircleCheck, IconAlertCircle } from "@tabler/icons-react";

const envVars = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", set: true, category: "Supabase" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: true, category: "Supabase" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", set: false, category: "Supabase" },
  { name: "NEXT_PUBLIC_SITE_URL", set: true, category: "앱" },
  { name: "ADMIN_EMAIL", set: true, category: "앱" },
  { name: "FINNHUB_API_KEY", set: false, category: "Finnhub" },
  { name: "ANTHROPIC_API_KEY", set: false, category: "Claude" },
  { name: "RESEND_API_KEY", set: false, category: "이메일" },
  { name: "POLAR_ACCESS_TOKEN", set: false, category: "결제" },
];

const categories = [...new Set(envVars.map((v) => v.category))];

export default function EnvPage() {
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
          <p className="mt-1.5 text-2xl font-semibold text-red-400">{missingCount}개</p>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category} className="rounded-xl border border-white/[0.08] bg-[#111111] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h2 className="text-sm font-medium text-white">{category}</h2>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {envVars.filter((v) => v.category === category).map((envVar) => (
                <div key={envVar.name} className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] transition-colors">
                  <div className="flex items-center gap-2.5">
                    {envVar.set ? (
                      <IconCircleCheck size={15} stroke={1.5} className="text-green-400 flex-none" />
                    ) : (
                      <IconAlertCircle size={15} stroke={1.5} className="text-red-400 flex-none" />
                    )}
                    <span className="font-mono text-xs text-white">{envVar.name}</span>
                  </div>
                  <span className={`text-xs ${envVar.set ? "text-green-400" : "text-red-400"}`}>
                    {envVar.set ? "설정됨" : "미설정"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#a6a6a6]">실제 환경변수 상태는 서버 API 연동 후 확인됩니다. 현재는 목업 표시입니다.</p>
    </div>
  );
}
