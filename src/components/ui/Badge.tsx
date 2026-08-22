import React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeStatus =
  | "CUADRADO"
  | "SOBRANTE"
  | "FALTANTE"
  | "PENDIENTE"
  | "COMPLETADA"
  | "CANCELADA"
  | "REGISTRADO"
  | "REVISADO"

export type BadgeVariant =
  | "green" | "orange" | "red" | "yellow" | "gray"
  | "blue"  | "purple" | "emerald" | "default"

interface BadgeProps {
  status?:    BadgeStatus
  variant?:   BadgeVariant
  size?:      "sm" | "md"
  dot?:       boolean
  children?:  React.ReactNode
  className?: string
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const statusMap: Record<BadgeStatus, { label: string; variant: BadgeVariant }> = {
  CUADRADO:   { label: "Cuadrado",   variant: "green"   },
  SOBRANTE:   { label: "Sobrante",   variant: "orange"  },
  FALTANTE:   { label: "Faltante",   variant: "red"     },
  PENDIENTE:  { label: "Pendiente",  variant: "yellow"  },
  COMPLETADA: { label: "Completada", variant: "emerald" },
  CANCELADA:  { label: "Cancelada",  variant: "gray"    },
  REGISTRADO: { label: "Registrado", variant: "blue"    },
  REVISADO:   { label: "Revisado",   variant: "purple"  },
}

const variantClasses: Record<BadgeVariant, string> = {
  green:   "bg-green-100   text-green-800   ring-1 ring-green-300",
  orange:  "bg-orange-100  text-orange-800  ring-1 ring-orange-300",
  red:     "bg-red-100     text-red-800     ring-1 ring-red-300",
  yellow:  "bg-yellow-100  text-yellow-800  ring-1 ring-yellow-300",
  emerald: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
  gray:    "bg-gray-100    text-gray-700    ring-1 ring-gray-300",
  blue:    "bg-blue-100    text-blue-800    ring-1 ring-blue-300",
  purple:  "bg-purple-100  text-purple-800  ring-1 ring-purple-300",
  default: "bg-slate-100   text-slate-700   ring-1 ring-slate-300",
}

const dotColors: Record<BadgeVariant, string> = {
  green:   "bg-green-500",
  orange:  "bg-orange-500",
  red:     "bg-red-500",
  yellow:  "bg-yellow-500",
  emerald: "bg-emerald-500",
  gray:    "bg-gray-400",
  blue:    "bg-blue-500",
  purple:  "bg-purple-500",
  default: "bg-slate-400",
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Badge({
  status,
  variant: variantProp,
  size = "sm",
  dot  = false,
  children,
  className = "",
}: BadgeProps) {
  let resolvedVariant: BadgeVariant = variantProp ?? "default"
  let label: React.ReactNode = children

  if (status) {
    const preset = statusMap[status]
    resolvedVariant = preset.variant
    label = label ?? preset.label
  }

  const sizeClass = size === "md"
    ? "px-2.5 py-1 text-sm font-semibold"
    : "px-2 py-0.5 text-xs font-semibold"

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full",
        variantClasses[resolvedVariant],
        sizeClass,
        className,
      ].join(" ")}
    >
      {dot && (
        <span
          className={[
            "rounded-full shrink-0",
            size === "md" ? "w-2 h-2" : "w-1.5 h-1.5",
            dotColors[resolvedVariant],
          ].join(" ")}
        />
      )}
      {label}
    </span>
  )
}

export default Badge
