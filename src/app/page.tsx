import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BackgroundBeams } from "@/components/ui/background-beams";

const primaryLinkClass =
  "group/button inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-all outline-none hover:bg-primary/80";

const secondaryLinkClass =
  "group/button inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-secondary px-2.5 text-sm font-medium whitespace-nowrap text-secondary-foreground transition-all outline-none hover:bg-secondary/80";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <BackgroundBeams className="opacity-35" />
      <main className="relative z-10 w-full max-w-3xl rounded-2xl border border-white/20 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-xl md:p-12">
        <p className="mb-3 text-xs uppercase tracking-[0.25em] text-zinc-300">
          Schedulio
        </p>
        <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
          Your college calendar, classes, and tasks in one sleek weekly flow.
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-300">
          Register, add classes with odd/even week patterns, mark holiday skips,
          and track class tasks with markdown notes and subtasks.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className={primaryLinkClass}>
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className={secondaryLinkClass}>
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
