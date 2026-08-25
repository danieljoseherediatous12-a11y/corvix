'use client'

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import InstallPWA from "@/components/ui/InstallPWA"
import Link from "next/link"
import {
  Menu, X, LogOut, CheckCircle2,
  CalendarCheck, History, BarChart3, Search,
  Settings, ShieldAlert, ListFilter, User
} from "lucide-react"
import { CorvixLogo } from "@/components/ui/CorvixLogo"

interface AppLayoutProps {
  children: React.ReactNode
}

export function formatRoleName(role?: string): string {
  if (!role) return "OPERADOR"
  if (role === "DUENO" || role === "DUEÑO") return "DUEÑO"
  if (role === "OPERADOR") return "ASESOR"
  if (role === "ADMIN") return "ADMIN"
  return role
}

function getUserRole(session: ReturnType<typeof useSession>["data"]) {
  if (!session?.user) return "OPERADOR"
  return (session.user as { role?: string }).role ?? "OPERADOR"
}

export function AppLayout({ children }: AppLayoutProps) {
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [businessName, setBusinessName] = useState<string>('Control de Caja')

  const rawRole = getUserRole(session)
  const roleDisplay = formatRoleName(rawRole)
  const isOwner = ['DUENO', 'DUEÑO', 'ADMIN'].includes(String(rawRole || '').toUpperCase())
  const name = session?.user?.name || "Usuario"
  const email = session?.user?.email ?? ""

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const bName = (data.settings || []).find((s: { key: string; value: string }) => s.key === 'business_name')?.value
        if (bName && bName.trim()) {
          setBusinessName(bName.trim())
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 antialiased font-sans">
      {/* Desktop sidebar */}
      <Sidebar
        businessName={businessName}
        userName={name}
        userEmail={email}
        userRole={roleDisplay}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* PWA Install Banner */}
        <InstallPWA />

        {/* Top bar (mobile only) */}
        <header className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-30 sticky top-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-slate-200/90 shadow-2xs shrink-0 flex items-center justify-center">
              <CorvixLogo size={32} />
            </div>
            <div>
              <h1 className="font-black text-base leading-tight text-slate-900 tracking-wider flex items-center gap-1.5">
                CORVIX
              </h1>
              <p className="text-emerald-600 text-[10px] font-black uppercase tracking-wider truncate max-w-[150px]">
                {businessName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-[11px] font-black px-2.5 py-1 rounded-xl shadow-2xs">
              {roleDisplay}
            </span>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              aria-label="Abrir Menú"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {/* Mobile Full Navigation Drawer Modal */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in">
            <div className="bg-white rounded-t-3xl border-t border-slate-200 p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-sm">{name}</p>
                    <p className="text-slate-400 text-xs">{email || roleDisplay}</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Links Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <Link
                  href="/closing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50 text-slate-800 font-bold text-xs transition"
                >
                  <CalendarCheck size={18} className="text-emerald-600" />
                  <span>Cierre de Caja</span>
                </Link>

                <Link
                  href="/history"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50 text-slate-800 font-bold text-xs transition"
                >
                  <History size={18} className="text-indigo-600" />
                  <span>Historial</span>
                </Link>

                <Link
                  href="/operations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50 text-slate-800 font-bold text-xs transition"
                >
                  <ListFilter size={18} className="text-blue-600" />
                  <span>Operaciones</span>
                </Link>

                <Link
                  href="/search"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50 text-slate-800 font-bold text-xs transition"
                >
                  <Search size={18} className="text-amber-600" />
                  <span>Búsqueda</span>
                </Link>

                {isOwner && (
                  <>
                    <Link
                      href="/reports"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50 text-slate-800 font-bold text-xs transition"
                    >
                      <BarChart3 size={18} className="text-emerald-700" />
                      <span>Reportes</span>
                    </Link>

                    <Link
                      href="/owner"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900 text-white font-bold text-xs transition"
                    >
                      <ShieldAlert size={18} className="text-emerald-400" />
                      <span>Panel Dueño</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-emerald-50 text-slate-800 font-bold text-xs transition"
                    >
                      <Settings size={18} className="text-slate-600" />
                      <span>Configuración</span>
                    </Link>
                  </>
                )}
              </div>

              {/* Logout Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl font-black text-xs transition cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-6 bg-slate-50">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1540px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}

export default AppLayout
