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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 safe-area-pb shadow-lg">
      <div className="grid grid-cols-5 h-16">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex flex-col items-center justify-center gap-1 transition-all active:scale-95",
                active ? "text-emerald-400" : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              <div
                className={[
                  "rounded-lg p-1.5 transition-all",
                  active ? "bg-slate-800 text-emerald-400" : "",
                ].join(" ")}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              </div>
              <span className={["text-[10px] font-medium leading-none", active ? "font-bold text-emerald-400" : ""].join(" ")}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileNav
