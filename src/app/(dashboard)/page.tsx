'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatCOP } from '@/lib/calculations';
import Link from 'next/link';
import {
  Plus, Camera, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, Clock, FileText, BarChart3,
  Scale, RefreshCw, Calculator, History, Shield, Wallet,
  Lock, ArrowUpRight, ArrowDownRight, Layers, ArrowRight,
  Receipt, Building2, Smartphone, ShieldCheck, Coins, Sparkles
} from 'lucide-react';

interface DashboardSummary {
  date: string;
  initialCash: number;
  totalIncome: number;
  totalExpense: number;
  totalFees: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  cashStatus: 'CUADRADO' | 'SOBRANTE' | 'FALTANTE' | null;
  operationsCount: number;
  sessionStatus: string;
  sessionId: string;
  isClosed: boolean;
  openedBy: { name: string } | null;
  openedAt: string;
}

interface Alert {
  type: string;
  message: string;
  severity: 'WARNING' | 'DANGER' | 'INFO';
}

interface Operation {
  id: string;
  type: 'INGRESO' | 'EGRESO';
  amount: number;
  fee?: number;
  netCashFlow: number;
  description?: string;
  reference?: string;
  operatedAt: string;
  category?: { name: string; color?: string };
  voucher?: { status: string };
  user: { name: string };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentOps, setRecentOps] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSession, setNoSession] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setAlerts(data.alerts || []);
        setRecentOps(data.recentOperations || []);
        setNoSession(false);
      } else {
        setNoSession(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargando datos de caja...</p>
        </div>
      </div>
    );
  }

  if (noSession) {
    return (
      <div className="w-full space-y-6 pb-24">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-2xs text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Wallet size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Caja No Iniciada</h2>
            <p className="text-xs text-slate-500">
              No hay una jornada abierta para hoy ({today}). Ingresa la base en efectivo para comenzar.
            </p>
          </div>
          <Link
            href="/open-session"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-2xl text-sm transition shadow-md w-full"
          >
            <span>Abrir Caja de Hoy</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = summary?.isClosed || summary?.sessionStatus === 'CERRADA';

  const cashStatusConfig = {
    CUADRADO: {
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      icon: <CheckCircle2 size={22} className="text-emerald-600" />,
      label: 'CAJA PERFECTAMENTE CUADRADA',
    },
    SOBRANTE: {
      color: 'text-amber-800',
      bg: 'bg-amber-50 border-amber-200',
      icon: <AlertTriangle size={22} className="text-amber-600" />,
      label: `SOBRAN ${formatCOP(summary?.difference || 0)}`,
    },
    FALTANTE: {
      color: 'text-rose-700',
      bg: 'bg-rose-50 border-rose-200',
      icon: <AlertTriangle size={22} className="text-rose-600" />,
      label: `FALTAN ${formatCOP(Math.abs(summary?.difference || 0))}`,
    },
  };

  const statusInfo = summary?.cashStatus ? cashStatusConfig[summary.cashStatus] : null;

  return (
    <div className="w-full space-y-6 pb-24 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">PANEL DE CONTROL — CORVIX</h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 capitalize mt-0.5 font-medium">
            <span>{today}</span>
            <span>•</span>
            {isClosed ? (
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <Lock size={12} /> Caja Cerrada Oficialmente
              </span>
            ) : (
              <span>Atendido por <strong className="text-slate-700">{summary?.openedBy?.name || 'Operador'}</strong></span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw size={14} className="text-slate-500" />
            <span>Actualizar</span>
          </button>
          {!isClosed ? (
            <Link
              href="/operations/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Plus size={14} />
              <span>Nueva Operación</span>
            </Link>
          ) : (
            <Link
              href="/history"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
            >
              <History size={14} />
              <span>Ver Historial de Cierre</span>
            </Link>
          )}
        </div>
      </div>

      {/* Closed Session Banner if CERRADA */}
      {isClosed && (
        <div className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Lock size={24} />
            </div>
            <div>
              <div className="font-black text-base md:text-lg text-white flex items-center gap-2">
                <span>JORNADA DE HOY CERRADA Y AUDITADA</span>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/30">
                  Cerrada
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Esta caja finalizó su turno. El saldo físico final fue conciliado y las modificaciones están bloqueadas.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/history"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/10"
            >
              Ver Historial
            </Link>
            <Link
              href="/reports"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Ver Reporte
            </Link>
          </div>
        </div>
      )}

      {/* Cash Status Alert Banner if not closed */}
      {!isClosed && statusInfo && (
        <div className={`border rounded-2xl p-4.5 flex items-center justify-between gap-4 shadow-2xs ${statusInfo.bg}`}>
          <div className="flex items-center gap-3">
            {statusInfo.icon}
            <div>
              <div className={`font-black text-lg ${statusInfo.color}`}>
                {statusInfo.label}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Estado comparativo de efectivo físico vs saldo esperado</p>
            </div>
          </div>
          <Link
            href="/cash-count"
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shrink-0 shadow-2xs transition"
          >
            Ver Arqueo
          </Link>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && !isClosed && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs font-medium ${
                alert.severity === 'DANGER'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertTriangle size={16} className="shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 5 Executive Metric Cards (Including Ganancias del Corresponsal) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Initial cash */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Base Inicial</span>
            <Wallet size={16} />
          </div>
          <div className="text-xl font-black text-slate-900">
            {formatCOP(summary?.initialCash || 0)}
          </div>
          <div className="text-[10px] text-slate-400">Efectivo de apertura</div>
        </div>

        {/* Incomes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ingresos</span>
            <ArrowDownRight size={18} />
          </div>
          <div className="text-xl font-black text-emerald-700">
            +{formatCOP(summary?.totalIncome || 0)}
          </div>
          <div className="text-[10px] text-emerald-600/80 font-medium">Entradas de caja</div>
        </div>

        {/* Expenses */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Egresos</span>
            <ArrowUpRight size={18} />
          </div>
          <div className="text-xl font-black text-rose-700">
            -{formatCOP(summary?.totalExpense || 0)}
          </div>
          <div className="text-[10px] text-rose-600/80 font-medium">Retiros entregados</div>
        </div>

        {/* Total Fees / Ganancias del Punto (From User Table) */}
        <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-300 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">Ganancias Hoy</span>
            <Coins size={17} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-800">
            +{formatCOP(summary?.totalFees || 0)}
          </div>
          <div className="text-[10px] text-emerald-700 font-bold">Comisiones del punto</div>
        </div>

        {/* Expected Cash in Register */}
        <div className="col-span-2 sm:col-span-1 bg-slate-900 rounded-2xl p-4 text-white shadow-2xs space-y-1 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Saldo en Caja</span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div className="text-xl font-black text-white">
            {formatCOP(summary?.expectedCash || 0)}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">Dinero físico teórico</div>
        </div>
      </div>

      {/* Main Grid: Left Transactions (8 cols) + Right Shift & Action Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): Recent Operations & Live Feed */}
        <div className="lg:col-span-8 space-y-5">
          {/* Quick Actions Bar */}
          {!isClosed ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link
                href="/operations/new"
                className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center text-center gap-1.5 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus size={20} />
                </div>
                <span className="text-xs font-bold text-slate-900">Nueva Operación</span>
              </Link>

              <Link
                href="/scanner"
                className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center text-center gap-1.5 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Camera size={20} />
                </div>
                <span className="text-xs font-bold text-slate-900">Escanear QR</span>
              </Link>

              <Link
                href="/cash-count"
                className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center text-center gap-1.5 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Scale size={20} />
                </div>
                <span className="text-xs font-bold text-slate-900">Arqueo Físico</span>
              </Link>

              <Link
                href="/closing"
                className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col items-center justify-center text-center gap-1.5 transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Lock size={20} />
                </div>
                <span className="text-xs font-bold text-slate-900">Cierre del Día</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/history"
                className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-center gap-2 transition font-bold text-xs text-slate-800"
              >
                <History size={16} className="text-slate-600" />
                <span>Historial de Cierres</span>
              </Link>
              <Link
                href="/reports"
                className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-center gap-2 transition font-bold text-xs text-slate-800"
              >
                <BarChart3 size={16} className="text-slate-600" />
                <span>Reportes Financieros</span>
              </Link>
              <Link
                href="/open-session"
                className="bg-slate-900 hover:bg-slate-800 p-4 rounded-2xl text-white shadow-sm flex items-center justify-center gap-2 transition font-bold text-xs"
              >
                <Plus size={16} />
                <span>Abrir Siguiente Turno</span>
              </Link>
            </div>
          )}

          {/* Recent Operations Table Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-500" />
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Movimientos Registrados en esta Caja ({summary?.operationsCount || 0})
                </h3>
              </div>
              <Link href="/operations" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
                <span>Ver todas</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {recentOps.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileText size={36} className="mx-auto opacity-30" />
                <p className="text-xs font-semibold text-slate-500">Aún no hay operaciones registradas en esta jornada</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOps.map((op) => {
                  const isIncome = op.type === 'INGRESO';
                  return (
                    <div key={op.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {isIncome ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {op.category?.name || (isIncome ? 'Ingreso' : 'Retiro')}
                            </span>
                            {op.fee && op.fee > 0 ? (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                                +{formatCOP(op.fee)} ganancia
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(op.operatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            <span> • Por {op.user?.name}</span>
                            {op.reference && <span> • Ref: {op.reference}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`font-black text-sm md:text-base ${
                          isIncome ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {isIncome ? '+' : '-'}{formatCOP(op.amount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 Cols): Shift Summary & System Monitor */}
        <div className="lg:col-span-4 space-y-5">
          {/* Shift Details Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              Estado del Turno
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Estado de Caja:</span>
                <span className={`font-bold px-2 py-0.5 rounded border ${
                  isClosed
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}>
                  {isClosed ? 'CERRADA' : 'ABIERTA'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Hora de Apertura:</span>
                <span className="font-bold text-slate-900">
                  {summary?.openedAt ? new Date(summary.openedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Cajero Responsable:</span>
                <span className="font-bold text-slate-900">{summary?.openedBy?.name || 'N/A'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Ganancias del Día:</span>
                <span className="font-black text-emerald-700">+{formatCOP(summary?.totalFees || 0)}</span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Total Transacciones:</span>
                <span className="font-black text-slate-900">{summary?.operationsCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Quick Denomination Audit Card */}
          {!isClosed && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Scale size={16} className="text-slate-500" />
                  Arqueo Rápido
                </h3>
                <Link href="/cash-count" className="text-xs font-bold text-emerald-700 hover:underline">
                  Contar Billetes
                </Link>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Realiza arqueos periódicos para verificar que la cantidad física en gaveta coincide con los registros.
              </p>
              <Link
                href="/cash-count"
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition shadow-sm"
              >
                <Scale size={15} />
                <span>Realizar Arqueo Ahora</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
