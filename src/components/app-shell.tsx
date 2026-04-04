"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconCalendarWeek, IconLayoutGrid, IconLogout } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  {
    label: "Calendar",
    href: "/calendar",
    icon: <IconCalendarWeek className="h-4 w-4 text-neutral-500" />,
  },
  {
    label: "Classes",
    href: "/classes",
    icon: <IconLayoutGrid className="h-4 w-4 text-neutral-500" />,
  },
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
      <aside className="border-b border-border bg-background md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/calendar" className="text-lg font-semibold tracking-tight">
            Schedulio
          </Link>
          <Button variant="ghost" size="sm" onClick={logout} className="md:hidden">
            <IconLogout className="mr-1 h-4 w-4" />
            Log out
          </Button>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-3 pb-3 md:flex-col md:px-2 md:pb-2">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted text-foreground",
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden px-2 py-3 md:block">
          <Button variant="ghost" onClick={logout} className="w-full justify-start">
            <IconLogout className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
};

