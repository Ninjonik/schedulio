import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen bg-background">
      <AppShell>{children}</AppShell>
    </div>
  );
}

