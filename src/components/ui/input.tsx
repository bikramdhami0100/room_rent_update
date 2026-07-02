import { forwardRef, InputHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  endAdornment?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type, endAdornment, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              endAdornment && "pr-10",
              error && "border-destructive",
              className
            )}
            ref={ref}
            id={id}
            {...props}
          />
          {endAdornment && (
            <div className="absolute right-0 top-0 flex h-full items-center pr-3">
              {endAdornment}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"
export { Input }
