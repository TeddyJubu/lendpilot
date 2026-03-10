/**
 * @organ shared
 * @tissue primitive/confirm-dialog
 * @description Confirmation dialog for critical actions.
 */

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "default",
}: ConfirmDialogProps) {
  const didConfirmRef = React.useRef(false)

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          if (didConfirmRef.current) {
            didConfirmRef.current = false
            return
          }
          onCancel()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              didConfirmRef.current = true
              onConfirm()
            }}
            className={cn(
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            )}
            data-testid="confirm-action"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
