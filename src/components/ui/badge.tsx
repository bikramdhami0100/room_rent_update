import { cn } from "@/lib/utils"
import { HTMLAttributes } from "react"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning"

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    destructive: "bg-destructive text-white",
    outline: "border border-border text-foreground",
    success: "bg-accent text-accent-foreground",
    warning: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  }
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
