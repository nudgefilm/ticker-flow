import DailyChanges from "@/components/landing/daily-changes";

export const dynamic = "force-static";

export default function DailyChangesPreviewPage() {
  return (
    <main className="min-h-screen bg-background">
      <DailyChanges />
    </main>
  );
}
