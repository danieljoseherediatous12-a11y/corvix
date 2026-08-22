'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatCOP } from '@/lib/calculations';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, ArrowDownRight, ArrowUpRight, FileText, Layers, Wallet } from 'lucide-react';

interface ReportData {
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
  byCategory: Array<{ name: string; type: string; total: number; count: number }>;
  closings: Array<{
    date: string;
    totalIncome: number;
    totalExpense: number;
    difference: number;
    status: string;
    operationsCount: number;
  }>;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      const data = await res.json();
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [type]);

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ['Fecha', 'Ingresos', 'Egresos', 'Diferencia', 'Estado', 'Operaciones'],
      ...report.closings.map((c) => [
        c.date,
        c.totalIncome,
        c.totalExpense,
        c.difference,
        c.status,
        c.operationsCount,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-corvix-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeLabels = { daily: 'Hoy', weekly: 'Esta Semana', monthly: 'Este Mes' };

  return (
    <div className="w-full space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reportes Financieros</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Consolidado de ingresos, egresos y balances de caja</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex gap-1 bg-slate-200/70 p-1 rounded-2xl border border-slate-200">
            {(['daily', 'weekly', 'monthly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  type === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
          >
            <Download size={15} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos Totales</span>
                <ArrowDownRight size={20} />
              </div>
              <div className="text-2xl font-black text-emerald-700">+{formatCOP(report.summary.totalIncome)}</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Retiros / Egresos</span>
                <ArrowUpRight size={20} />
              </div>
              <div className="text-2xl font-black text-rose-700">-{formatCOP(report.summary.totalExpense)}</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Transacciones</span>
                <Layers size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{report.summary.totalOperations}</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Días Registrados</span>
                <Calendar size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{report.summary.daysWithData}</div>
            </div>
          </div>

          {/* 2-Column Grid: By Category + Daily Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By category */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider">
                Desglose por Categoría
              </div>
              {report.byCategory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  Sin operaciones por categoría
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {report.byCategory
                    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
                    .map((cat) => (
                      <div key={cat.name} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-slate-50/70 transition">
                        <div>
                          <div className="font-bold text-slate-900">{cat.name}</div>
                          <div className="text-xs text-slate-400">{cat.count} transacciones</div>
                        </div>
                        <div className={`font-black ${cat.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {cat.type === 'INGRESO' ? '+' : '-'}{formatCOP(Math.abs(cat.total))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Daily Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} /> Detalle Cronológico por Día
              </div>
              {report.closings.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No hay cierres para este período
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {report.closings.map((c) => (
                    <div key={c.date} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-slate-50/70 transition">
                      <div>
                        <div className="font-bold text-slate-900 capitalize">
                          {new Date(c.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-xs text-slate-400">{c.operationsCount} operaciones • Estado: <strong>{c.status}</strong></div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-emerald-700 font-bold">+{formatCOP(c.totalIncome)}</div>
                        <div className="text-xs text-rose-700 font-bold">-{formatCOP(c.totalExpense)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
