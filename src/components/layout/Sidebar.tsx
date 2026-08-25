'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  PlusCircle,
  ScanLine,
  Receipt,
  Scale,
  Lock,
  History,
  BarChart3,
  Search,
  Settings,
  LogOut,
  Building2,
  ShieldAlert,
  ListOrdered,
} from 'lucide-react';
import { CorvixLogo } from '@/components/ui/CorvixLogo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
}

interface SidebarProps {
  businessName?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/operations/new', label: 'Nueva Operación', icon: <PlusCircle size={20} /> },
  { href: '/operations', label: 'Operaciones', icon: <ListOrdered size={20} /> },
  { href: '/scanner', label: 'Escanear Voucher', icon: <ScanLine size={20} /> },
  { href: '/vouchers', label: 'Vouchers', icon: <Receipt size={20} /> },
  { href: '/cash-count', label: 'Arqueo de Caja', icon: <Scale size={20} /> },
  { href: '/closing', label: 'Cierre del Día', icon: <Lock size={20} /> },
  { href: '/history', label: 'Historial', icon: <History size={20} /> },
  { href: '/reports', label: 'Reportes', icon: <BarChart3 size={20} /> },
  { href: '/owner', label: 'Panel del Dueño', icon: <ShieldAlert size={20} />, ownerOnly: true },
  { href: '/search', label: 'Búsqueda', icon: <Search size={20} /> },
  { href: '/settings', label: 'Configuración', icon: <Settings size={20} /> },
];

export function Sidebar({
  businessName = 'Corresponsal',
  userName = 'Usuario',
  userEmail = '',
  userRole = 'OPERADOR',
}: SidebarProps) {
  const pathname = usePathname();
  const normalizedRole = String(userRole || '').toUpperCase();
  const isOwner = normalizedRole === 'DUENO' || normalizedRole === 'DUEÑO' || normalizedRole === 'ADMIN';

  function isActive(href: string) {
    if (href === '/') return pathname === '/' || pathname === '/dashboard';
    if (href === '/operations') return pathname === '/operations';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className="hidden md:flex flex-col w-68 min-h-screen bg-white text-slate-700 border-r border-slate-200/90 shrink-0 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-slate-100 bg-linear-to-b from-slate-50/80 to-white">
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-sm bg-white p-1.5 border border-slate-200/90 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CorvixLogo size={46} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-900 text-xl tracking-widest leading-none group-hover:text-emerald-600 transition-colors">
              CORVIX
            </p>
            <p className="text-emerald-600 text-[11px] font-black uppercase tracking-wider mt-1 truncate max-w-[160px]">
              {businessName || 'Control de Caja'}
            </p>
          </div>
        </Link>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3.5 space-y-1">
        {navItems
          .filter((item) => !item.ownerOnly || isOwner)
          .map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-100 group touch-manipulation ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={active ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-700'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {active && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                )}
              </Link>
            );
          })}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-800 font-bold text-sm shadow-2xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-900 text-xs font-bold truncate leading-tight">
              {userName}
            </p>
            <p className="text-slate-400 text-[10px] truncate mt-0.5">{userEmail}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
            {userRole}
          </span>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-700 border border-slate-200/80 hover:border-rose-200 transition-all cursor-pointer"
        >
          <LogOut size={15} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
