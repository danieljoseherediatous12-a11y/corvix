'use client'

import { useSession } from "next-auth/react"
import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import InstallPWA from "@/components/ui/InstallPWA"
import { Loader2 } from "lucide-react"
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
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-700">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
          <p className="text-xs font-semibold text-slate-500">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  const rawRole = getUserRole(session)
  const roleDisplay = formatRoleName(rawRole)
  const name = session?.user?.name ?? "Daniel"
  const email = session?.user?.email ?? ""

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 antialiased font-sans">
      {/* Desktop sidebar */}
      <Sidebar
        businessName="Mi Corresponsal"
        userName={name}
        userEmail={email}
        userRole={roleDisplay}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* PWA Install Banner */}
        <InstallPWA />

        {/* Top bar (mobile only - with clear logo & correct DUEÑO badge) */}
        <header className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-slate-200/90 shadow-xs shrink-0 flex items-center justify-center">
              <CorvixLogo size={30} />
            </div>
            <div>
              <h1 className="font-black text-base leading-tight text-slate-900 tracking-wider flex items-center gap-1.5">
                CORVIX
              </h1>
              <p className="text-slate-400 text-[10px] font-semibold">Control Inteligente de Caja</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-[11px] font-black px-2.5 py-1 rounded-xl shadow-2xs">
              {roleDisplay}
            </span>
          </div>
        </header>

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
