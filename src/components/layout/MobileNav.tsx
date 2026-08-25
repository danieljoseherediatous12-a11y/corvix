'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  PlusCircle,
  ScanLine,
  Receipt,
  Scale,
} from "lucide-react"

const mobileNavItems = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/operations/new", label: "Operación", icon: PlusCircle },
  { href: "/scanner", label: "Escáner", icon: ScanLine },
  { href: "/vouchers", label: "Vouchers", icon: Receipt },
  { href: "/cash-count", label: "Arqueo", icon: Scale },
]

export function MobileNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-5 h-[68px] px-2 items-center">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className="flex flex-col items-center justify-center h-full relative group transition-transform duration-100 active:scale-95 touch-manipulation select-none"
            >
              {/* Icon Container with Emerald Glow if Active */}
              <div
                className={`flex items-center justify-center w-11 h-8 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.35)] scale-105"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon
                  size={active ? 20 : 19}
                  strokeWidth={active ? 2.5 : 1.8}
                  className="transition-transform duration-200"
                />
              </div>

              {/* Label */}
              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors duration-200 ${
                  active
                    ? "font-black text-emerald-400"
                    : "font-semibold text-slate-400 group-hover:text-slate-300"
                }`}
              >
                {label}
              </span>

              {/* Active Sub-Dot Indicator */}
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
