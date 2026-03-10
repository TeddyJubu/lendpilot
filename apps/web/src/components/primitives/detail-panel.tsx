/**
 * @organ shared
 * @tissue primitive/detail-panel
 * @description Slide-out panel for loan/contact details.
 */

"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "ghost"
  | "link"

export interface DetailPanelProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  badge?: React.ReactNode
  tabs?: { label: string; content: React.ReactNode }[]
  actions?: { label: string; onClick: () => void; variant?: ButtonVariant }[]
  children?: React.ReactNode
  className?: string
}

export function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  badge,
  tabs,
  actions,
  children,
  className,
}: DetailPanelProps) {
  const defaultTab = tabs?.[0]?.label

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <SheetContent
        side="right"
        className={cn(
          "w-[600px] max-w-[90vw] p-0 [&_[data-slot=sheet-close]]:hidden",
          className
        )}
      >
        {/* Radix accessibility: SheetContent requires a title/description */}
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{subtitle ?? ""}</SheetDescription>
        {tabs ? (
          <Tabs defaultValue={defaultTab} className="flex h-full flex-col">
            <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold tracking-tight">
                      {title}
                    </h2>
                    {badge}
                  </div>
                  {subtitle ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {subtitle}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {actions?.map((a) => (
                    <Button
                      key={a.label}
                      size="sm"
                      variant={a.variant ?? "outline"}
                      onClick={a.onClick}
                    >
                      {a.label}
                    </Button>
                  ))}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Close"
                    data-testid="detail-panel-close"
                    onClick={onClose}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="px-4 pb-3">
                <TabsList>
                  {tabs.map((t) => (
                    <TabsTrigger key={t.label} value={t.label}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              {tabs.map((t) => (
                <TabsContent key={t.label} value={t.label}>
                  {t.content}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        ) : (
          <div className="flex h-full flex-col">
            <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold tracking-tight">
                      {title}
                    </h2>
                    {badge}
                  </div>
                  {subtitle ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {subtitle}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {actions?.map((a) => (
                    <Button
                      key={a.label}
                      size="sm"
                      variant={a.variant ?? "outline"}
                      onClick={a.onClick}
                    >
                      {a.label}
                    </Button>
                  ))}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Close"
                    data-testid="detail-panel-close"
                    onClick={onClose}
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
