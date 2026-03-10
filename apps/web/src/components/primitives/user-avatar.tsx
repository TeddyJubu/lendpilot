/**
 * @organ shared
 * @tissue primitive/user-avatar
 * @description Consistent avatar display with initials fallback.
 */

import * as React from "react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export interface UserAvatarProps {
  name: string
  imageUrl?: string
  size?: "xs" | "sm" | "md" | "lg" // 24, 32, 40, 48px
  className?: string
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase()
}

const sizeClasses: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
}

export function UserAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const [imageError, setImageError] = React.useState(false)

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && !imageError ? (
        // Radix AvatarImage conditionally mounts based on load status; a native <img>
        // keeps DOM deterministic for tests while still matching shadcn styling.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-slot="avatar-image"
          src={imageUrl}
          alt={name}
          className="aspect-square size-full rounded-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : null}
      <AvatarFallback className="text-xs font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
