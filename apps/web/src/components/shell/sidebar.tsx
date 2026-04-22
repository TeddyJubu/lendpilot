"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Columns3, Users, Settings } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/today", label: "Today", icon: Calendar },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/contacts", label: "Contacts", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar-background">
      <div className="flex h-14 items-center px-4 font-semibold text-lg">
        LoanPilot
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <UserButton />
          <span className="text-sm text-sidebar-foreground truncate">Account</span>
        </div>
      </div>
    </aside>
  );
}
