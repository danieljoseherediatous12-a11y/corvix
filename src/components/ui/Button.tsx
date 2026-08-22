import React from "react"
import { Loader2 } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = "primary" | "danger" | "warning" | "ghost" | "outline" | "info"
type Size    = "sm" | "md" | "lg" | "xl"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant
  size?:      Size
  loading?:   boolean
  icon?:      React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-700 shadow-sm",
  danger:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-red-700 shadow-sm",
  warning:
    "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white border border-amber-600 shadow-sm",
  info:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border border-blue-700 shadow-sm",
  ghost:
    "bg-transparent hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 border border-transparent",
  outline:
    "bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 border border-emerald-400",
}

const sizeClasses: Record<Size, string> = {
  sm:  "py-1.5 px-3   text-sm  gap-1.5 rounded-md",
  md:  "py-2.5 px-4   text-sm  gap-2   rounded-lg",
  lg:  "py-4   px-6   text-base gap-2.5 rounded-xl",
  xl:  "py-5   px-8   text-lg  gap-3   rounded-xl",
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = "primary",
      size      = "md",
      loading   = false,
      icon,
      iconRight,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          "inline-flex items-center justify-center font-semibold",
          "transition-all duration-150 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-1",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? "w-full" : "",
          isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {loading ? (
          <Loader2
            className="animate-spin shrink-0"
            size={size === "xl" ? 22 : size === "lg" ? 20 : 16}
          />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && iconRight && (
          <span className="shrink-0">{iconRight}</span>
        )}
      </button>
    )
  }
)

Button.displayName = "Button"

export default Button
