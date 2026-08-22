import React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type CardVariant = "default" | "green" | "red" | "blue" | "orange" | "purple"

interface CardProps {
  title?:     React.ReactNode
  subtitle?:  string
  icon?:      React.ReactNode
  variant?:   CardVariant
  footer?:    React.ReactNode
  className?: string
  children?:  React.ReactNode
  /** Compact padding */
  compact?:   boolean
  /** Remove internal padding – useful for full-bleed children */
  noPad?:     boolean
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const variantStyles: Record<CardVariant, { wrapper: string; header: string; icon: string }> = {
  default: {
    wrapper: "bg-white border-gray-200",
    header:  "text-gray-800",
    icon:    "bg-gray-100 text-gray-600",
  },
  green: {
    wrapper: "bg-white border-emerald-200",
    header:  "text-emerald-800",
    icon:    "bg-emerald-100 text-emerald-600",
  },
  red: {
    wrapper: "bg-white border-red-200",
    header:  "text-red-800",
    icon:    "bg-red-100 text-red-600",
  },
  blue: {
    wrapper: "bg-white border-blue-200",
    header:  "text-blue-800",
    icon:    "bg-blue-100 text-blue-600",
  },
  orange: {
    wrapper: "bg-white border-orange-200",
    header:  "text-orange-800",
    icon:    "bg-orange-100 text-orange-600",
  },
  purple: {
    wrapper: "bg-white border-purple-200",
    header:  "text-purple-800",
    icon:    "bg-purple-100 text-purple-600",
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Card({
  title,
  subtitle,
  icon,
  variant   = "default",
  footer,
  className = "",
  children,
  compact   = false,
  noPad     = false,
}: CardProps) {
  const style = variantStyles[variant]
  const pad   = noPad ? "" : compact ? "p-4" : "p-5 md:p-6"

  return (
    <div
      className={[
        "rounded-xl border shadow-sm",
        style.wrapper,
        className,
      ].join(" ")}
    >
      {/* Header row */}
      {(title || icon) && (
        <div className={["flex items-start gap-3", compact ? "px-4 pt-4" : "px-5 pt-5 md:px-6 md:pt-6"].join(" ")}>
          {icon && (
            <div className={["rounded-lg p-2 shrink-0", style.icon].join(" ")}>
              {icon}
            </div>
          )}
          {title && (
            <div className="min-w-0">
              <h3 className={["font-semibold text-base leading-tight", style.header].join(" ")}>
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {children && (
        <div className={[(title || icon) && !noPad ? (compact ? "px-4 pt-3 pb-4" : "px-5 pb-5 pt-4 md:px-6 md:pb-6") : pad].join(" ")}>
          {children}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="border-t border-gray-100 px-5 py-3 md:px-6 bg-gray-50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  )
}

export default Card
