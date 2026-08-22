'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatCOP } from '@/lib/calculations';
import {
  ShieldAlert, TrendingUp, TrendingDown, AlertTriangle, Users,
  FileText, BarChart3, DollarSign, Calendar, Clock, ShieldCheck,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';

interface OwnerStats {
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalOperations: number;
    daysWithData: number;
    squaredDays: number;
    surplusDays: number;
    deficitDays: number;
    totalDifference: number;
  };
  closings: Array<{
    date: string;
    status: string;
    totalIncome: number;
    totalExpense: number;
    difference: number;
    operationsCount: number;
    user: { name: string };
  }>;
  byCategory: Array<{ name: string; type: string; total: number; count: number }>;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  userName?: string;
  createdAt: string;
  newValue?: string;
}

interface TodaySummary {
  totalIncome?: number;
  totalExpense?: number;
  expectedCash?: number;
  difference?: number;
  cashStatus?: 'CUADRADO' | 'SOBRANTE' | 'FALTANTE' | null;
}

export default function OwnerPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'audit'>('overview');

  const userRole = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (userRole !== 'DUENO' && userRole !== 'ADMIN') return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [reportRes, dashRes, auditRes] = await Promise.all([
          fetch(`/api/reports?type=${period}`),
          fetch('/api/dashboard'),
          fetch('/api/audit?limit=50'),
        ]);

        const reportData = await reportRes.json();
        const dashData = await dashRes.json();
        const auditData = await auditRes.json();

        setStats(reportData);
        setTodaySummary(dashData.summary);
        setAuditLogs(auditData.logs || []);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period, userRole]);

  if (userRole !== 'DUENO' && userRole !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm">
          <ShieldAlert size={40} className="mx-auto mb-3 text-slate-400" />
          <h2 className="font-bold text-slate-800 text-sm">Acceso Restringido</h2>
          <p className="text-xs text-slate-500 mt-1">Esta sección es exclusiva para el perfil de Dueño / Administrador.</p>
        </div>
      </div>
    );
  }

  const actionLabels: Record<string, string> = {
    LOGIN: 'Inicio de sesión',
    LOGOUT: 'Cierre de sesión',
    CREATE: 'Creación de registro',
    UPDATE: 'Modificación',
    DELETE: 'Cancelación',
    OPEN_SESSION: 'Apertura de caja',
    CLOSE_SESSION: 'Cierre de jornada',
    SCAN_QR: 'Escaneo de QR',
    OCR: 'Lectura OCR',
    CASH_COUNT: 'Arqueo de caja',
    DAILY_CLOSE: 'Cierre definitivo del día',
    EXPORT: 'Exportación de datos',
  };

  const entityLabels: Record<string, string> = {
    Operation: 'Operación',
    Voucher: 'Voucher',
    CashCount: 'Arqueo',
    DailyClosing: 'Cierre Diario',
    CashSession: 'Jornada de Caja',
    Settings: 'Configuración',
    User: 'Usuario',
  };

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-sm border border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">PANEL DEL DUEÑO</h1>
            <p className="text-xs text-slate-400">Supervisión integral de operaciones, balances y auditoría</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Resumen General
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'operations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Historial de Días
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Registro de Auditoría
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      )}

      {!loading && stats && activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex justify-end gap-1.5">
            {(['daily', 'weekly', 'monthly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  period === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'daily' ? 'Hoy' : t === 'weekly' ? 'Esta Semana' : 'Este Mes'}
              </button>
            ))}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Ingresos</span>
                <ArrowDownRight size={18} />
              </div>
              <div className="text-xl font-black text-emerald-700">+{formatCOP(stats.summary.totalIncome)}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Egresos</span>
                <ArrowUpRight size={18} />
              </div>
              <div className="text-xl font-black text-rose-700">-{formatCOP(stats.summary.totalExpense)}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Operaciones</span>
              <div className="text-xl font-black text-slate-900">{stats.summary.totalOperations}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Diferencia Total</span>
              <div className={`text-xl font-black ${
                stats.summary.totalDifference === 0 ? 'text-emerald-700' :
                stats.summary.totalDifference > 0 ? 'text-amber-800' : 'text-rose-700'
              }`}>
                {stats.summary.totalDifference >= 0 ? '+' : ''}{formatCOP(stats.summary.totalDifference)}
              </div>
            </div>
          </div>

          {/* By category */}
          {stats.byCategory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider">
                Movimientos por Tipo de Operación
              </div>
              <div className="divide-y divide-slate-100">
                {stats.byCategory.map((cat) => (
                  <div key={cat.name} className="px-6 py-3.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-bold text-slate-900">{cat.name}</div>
                      <div className="text-xs text-slate-400">{cat.count} operaciones registradas</div>
                    </div>
                    <div className={`font-black ${cat.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {cat.type === 'INGRESO' ? '+' : ''}{formatCOP(cat.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && stats && activeTab === 'operations' && (
        <div className="space-y-3">
          {stats.closings.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Calendar size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold text-slate-500">No hay cierres en este período</p>
            </div>
          ) : (
            stats.closings.map((c) => (
              <div key={c.date} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 text-sm capitalize">
                    {new Date(c.date + 'T12:00:00').toLocaleDateString('es-CO', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {c.operationsCount} operaciones • Cerrado por {c.user?.name}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-emerald-700 font-bold">+{formatCOP(c.totalIncome)}</div>
                  <div className="text-xs text-rose-700 font-bold">-{formatCOP(c.totalExpense)}</div>
                  <div className={`text-xs font-black mt-1 ${
                    c.status === 'CUADRADO' ? 'text-emerald-700' :
                    c.status === 'SOBRANTE' ? 'text-amber-800' : 'text-rose-700'
                  }`}>
                    {c.status === 'CUADRADO' ? 'Cuadrado' : `${c.status}: ${formatCOP(c.difference)}`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} /> Registro Cronológico de Acciones
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">Sin registros de auditoría</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-6 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/70 transition">
                  <div>
                    <div className="font-bold text-slate-900">
                      {actionLabels[log.action] || log.action} • <span className="text-slate-500 font-normal">{entityLabels[log.entity] || log.entity}</span>
                    </div>
                    {log.userName && (
                      <div className="text-slate-400 mt-0.5">Usuario: <strong className="text-slate-600">{log.userName}</strong></div>
                    )}
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">
                    {new Date(log.createdAt).toLocaleString('es-CO', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
