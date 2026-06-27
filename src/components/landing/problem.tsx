import {
  IconFileText,
  IconMicrophone,
  IconWorld,
  IconClockX,
} from "@tabler/icons-react";

const PROBLEMS = [
  { icon: IconFileText, text: "영어 공시를 직접 읽어야 합니다." },
  { icon: IconMicrophone, text: "1시간 넘는 어닝콜을 들어야 합니다." },
  { icon: IconWorld, text: "뉴스·공시·실적이 여러 사이트에 흩어져 있습니다." },
  { icon: IconClockX, text: "결국 중요한 변화를 놓치게 됩니다.", highlight: true },
];

export default function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
          이런 경험, 한 번쯤 있으셨나요?
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {PROBLEMS.map(({ icon: Icon, text, highlight }) => (
          <div
            key={text}
            className={`flex flex-col gap-4 rounded-lg border p-5 ${
              highlight
                ? "border-destructive/40 bg-destructive/5"
                : "border-border bg-card"
            }`}
          >
            <Icon
              size={24}
              stroke={1.6}
              className={highlight ? "text-destructive" : "text-muted-foreground"}
            />
            <p className="text-sm leading-relaxed text-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
