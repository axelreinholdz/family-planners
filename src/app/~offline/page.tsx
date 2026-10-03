export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--background)] px-6 text-center">
      <p className="text-5xl" aria-hidden>
        📅
      </p>
      <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
        Offline
      </h1>
      <p className="max-w-sm text-[var(--ink-muted)]">
        Family Planners behöver laddas en gång med nät. Öppna appen online, sedan
        fungerar den utan uppkoppling.
      </p>
    </main>
  );
}
