/**
 * @organ shell
 * @tissue sidebar
 * @description Primary shell navigation for Today, Pipeline, Contacts, and Settings.
 * @depends-on
 *   - components/ui/sidebar.tsx
 *   - Clerk session state
 * @depended-by
 *   - shell/shell-frame.tsx
 */

"use client";

import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  CircleFadingArrowUpIcon,
  LayoutListIcon,
  Settings2Icon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react";

import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserAvatar } from "@/components/primitives/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    href: "/today",
    icon: LayoutListIcon,
    label: "Today",
    tooltip: "Today",
  },
  {
    href: "/pipeline",
    icon: WorkflowIcon,
    label: "Pipeline",
    tooltip: "Pipeline",
  },
  {
    href: "/contacts",
    icon: UsersIcon,
    label: "Contacts",
    tooltip: "Contacts",
  },
] as const;

type AppSidebarProps = {
  pathname: string;
};

export function AppSidebar({ pathname }: AppSidebarProps) {
  const { isSignedIn, user } = useUser();
  const displayName =
    user?.fullName ?? ([user?.firstName, user?.lastName].filter(Boolean).join(" ") || "LoanPilot User");
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? "Signed out";

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-4 px-3 py-4">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <CircleFadingArrowUpIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-sidebar-primary">
              LoanPilot
            </p>
            <p className="truncate text-xs text-sidebar-foreground/70">AI-native mortgage broker CRM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={item.tooltip}>
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.href === "/today" ? (
                    <SidebarMenuBadge>
                      <Badge variant="secondary">0</Badge>
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/settings")} tooltip="Settings">
              <Link href="/settings">
                <Settings2Icon />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/50 p-1">
          <ThemeToggle showLabel className="w-full justify-start text-sidebar-foreground" />
        </div>

        <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-3">
          {isSignedIn ? (
            <div className="flex items-center gap-3">
              <UserButton />
              <div className="min-w-0 text-xs">
                <p className="truncate font-medium text-sidebar-foreground">{displayName}</p>
                <p className="truncate text-sidebar-foreground/70">{displayEmail}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <UserAvatar name="LoanPilot" size="sm" />
                <div className="text-xs">
                  <p className="font-medium text-sidebar-foreground">Authenticate to continue</p>
                  <p className="text-sidebar-foreground/70">Sign in to open the shell.</p>
                </div>
              </div>
              <Button asChild size="sm" className="w-full">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
