import { IconCheck } from "@tabler/icons-react";

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${
        on ? "justify-end bg-[#3b82f6]" : "justify-start bg-[#1a1a1a]"
      }`}
    >
      <div className="size-4 rounded-full bg-white" />
    </div>
  );
}

function SettingRow({
  title,
  desc,
  on,
}: {
  title: string;
  desc: string;
  on: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-white">{title}</p>
        <p className="mt-0.5 text-xs text-[#666666]">{desc}</p>
      </div>
      <Toggle on={on} />
    </div>
  );
}

function Checkbox({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${
          checked ? "border-white bg-white" : "border-white/[0.3] bg-transparent"
        }`}
      >
        {checked && <IconCheck size={12} stroke={2.5} className="text-black" />}
      </div>
      <span className="text-sm text-[#cccccc]">{label}</span>
    </div>
  );
}

function Radio({ label, selected }: { label: string; selected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-[#3b82f6]" : "border-white/[0.3]"
        }`}
      >
        {selected && <div className="size-2 rounded-full bg-[#3b82f6]" />}
      </div>
      <span className="text-sm text-[#cccccc]">{label}</span>
    </div>
  );
}

export default function AlertsPreview() {
  return (
    <div className="mt-6">
      <p className="text-xs uppercase tracking-widest text-[#444444]">설정 미리보기</p>

      <div className="mt-4 flex flex-col gap-3 blur-sm select-none" aria-hidden="true">
        {/* 카드 1: 알림 채널 */}
        <div className="pointer-events-none rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
          <p className="mb-4 text-xs uppercase tracking-wide text-[#444444]">알림 채널</p>
          <div className="flex flex-col gap-4">
            <SettingRow
              title="이메일 알림"
              desc="공시 발생 시 등록된 이메일로 발송"
              on={true}
            />
            <SettingRow
              title="브라우저 푸시"
              desc="브라우저 알림 허용 필요"
              on={false}
            />
          </div>
        </div>

        {/* 카드 2: 공시 유형 */}
        <div className="pointer-events-none rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
          <p className="mb-4 text-xs uppercase tracking-wide text-[#444444]">알림 받을 공시 유형</p>
          <div className="flex flex-col gap-3">
            <Checkbox label="8-K 주요이벤트" checked={true} />
            <Checkbox label="10-K 연간보고서" checked={true} />
            <Checkbox label="10-Q 분기보고서" checked={true} />
            <Checkbox label="Form 4 인사이더 거래" checked={true} />
            <Checkbox label="기타 공시" checked={false} />
          </div>
        </div>

        {/* 카드 3: 수신 시간대 */}
        <div className="pointer-events-none rounded-[6px] border border-white/[0.08] bg-[#111111] p-5">
          <p className="mb-4 text-xs uppercase tracking-wide text-[#444444]">알림 수신 시간대</p>
          <div className="flex flex-col gap-3">
            <Radio label="즉시 알림 (공시 등록 후 15분 이내)" selected={true} />
            <Radio label="일간 요약 (매일 오전 8시 KST)" selected={false} />
          </div>
          <div className="mt-3 border-t border-white/[0.06] pt-3">
            <SettingRow
              title="야간 알림 끄기"
              desc="KST 23:00~07:00 알림 미발송"
              on={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
