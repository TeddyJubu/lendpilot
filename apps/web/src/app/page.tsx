import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRightIcon, CommandIcon, SparklesIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { KeyboardShortcut } from "@/components/primitives/keyboard-shortcut";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/today");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 lg:p-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <SparklesIcon className="size-3.5" />
            Phase 0.3 shell and auth foundation
          </div>

          <div className="mt-6 space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance">
              LoanPilot keeps the broker in control and lets the AI handle the drag.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              Today, Pipeline, and Contacts now have a protected shell foundation with Clerk auth,
              Convex user bootstrap, command surfaces, and keyboard-first navigation.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/sign-in">
                Sign in
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
              <CommandIcon className="size-4" />
              Command-first shell
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
              Convex-backed current user bootstrap
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
              Clerk App Router auth
            </span>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Keyboard-first defaults</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-muted-foreground">Open command bar</span>
              <KeyboardShortcut keys={["Cmd", "K"]} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-muted-foreground">Toggle copilot</span>
              <KeyboardShortcut keys={["Cmd", "/"]} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-muted-foreground">Collapse sidebar</span>
              <KeyboardShortcut keys={["Cmd", "B"]} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <span className="text-muted-foreground">Jump views</span>
              <KeyboardShortcut keys={["1", "2", "3"]} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
