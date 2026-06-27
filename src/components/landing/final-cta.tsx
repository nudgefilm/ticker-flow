import StartButton from "@/components/landing/start-button";

export default function FinalCta() {
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-20 text-center md:py-28">
        <h2 className="text-balance text-2xl font-semibold leading-tight tracking-tight text-foreground md:text-4xl">
          미국 기업의 변화를
          <br />
          가장 빠르게 확인해 보세요.
        </h2>
        <p className="text-pretty text-base text-muted-foreground md:text-lg">
          공시부터 어닝콜까지, 하나의 화면에서 모니터링할 수 있습니다.
        </p>
        <StartButton />
      </div>
    </section>
  );
}
