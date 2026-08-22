'use client'

import { useSession } from "next-auth/react"
import { Sidebar } from "@/components/layout/Sidebar"
import { MobileNav } from "@/components/layout/MobileNav"
import InstallPWA from "@/components/ui/InstallPWA"
import { Loader2, Landmark } from "lucide-react"
import { CorvixLogo } from "@/components/ui/CorvixLogo"

interface AppLayoutProps {
  children: React.ReactNode
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

  const role = getUserRole(session)
  const name = session?.user?.name ?? "Usuario"
  const email = session?.user?.email ?? ""

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 antialiased font-sans">
      {/* Desktop sidebar */}
      <Sidebar
        businessName="Mi Corresponsal"
        userName={name}
        userEmail={email}
        userRole={role}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* PWA Install Banner */}
        <InstallPWA />

        {/* Top bar (mobile only) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 p-1 border border-slate-800 shrink-0 flex items-center justify-center">
              <CorvixLogo size={22} />
            </div>
            <div>
              <h1 className="font-black text-sm leading-tight text-slate-900 tracking-wider">
                CORVIX
              </h1>
              <p className="text-slate-500 text-[10px]">Control de Caja</p>
            </div>
          </div>
          <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
            {role}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6 bg-slate-50">
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
