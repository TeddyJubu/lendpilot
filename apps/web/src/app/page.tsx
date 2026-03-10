export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">LoanPilot</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Web app scaffold (Foundation / Phase 0.1). Next.js App Router + strict TypeScript + Tailwind v4 tokens.
        </p>

        <div className="mt-6 flex flex-col gap-2 text-sm">
          <div className="rounded-md border border-border bg-muted px-3 py-2">
            Next: shell + routes (Today / Pipeline / Contacts) will land in Phase 0.3.
          </div>
          <div className="rounded-md border border-border bg-muted px-3 py-2">
            Tokens: <code className="font-mono">src/styles/globals.css</code>
          </div>
        </div>
      </div>
    </main>
  );
}
