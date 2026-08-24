'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCOP } from '@/lib/calculations';
import { History, ChevronRight, Calendar, CheckCircle2, AlertTriangle, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface DailyClosing {
  id: string;
  date: string;
  initialCash: number;
  totalIncome: number;
  totalExpense: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  status: string;
  operationsCount: number;
  closedAt: string;
  user: { name: string };
  isClosed?: boolean;
}

export default function HistoryPage() {
  const router = useRouter();
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/closings?limit=60')
      .then((r) => r.json())
      .then((data) => {
        setClosings(data.closings || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Historial de Jornadas</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Cierres de caja y balances diarios históricos</p>
      </div>

      {closings.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <Calendar size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs font-semibold text-slate-500">No hay cierres registrados todavía</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {closings.map((closing) => {
            const isCuadrado = closing.status === 'CUADRADO';
            const dateLabel = new Date(closing.date + 'T12:00:00').toLocaleDateString('es-CO', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });

            return (
              <button
                key={closing.id}
                onClick={() => router.push(`/history/${closing.date}`)}
                className="w-full text-left bg-white border border-slate-200/90 rounded-3xl p-6 hover:border-slate-300 hover:shadow-md transition-all space-y-4 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-black text-slate-900 capitalize text-sm truncate block group-hover:text-emerald-700 transition">
                      {dateLabel}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      {closing.isClosed ? `Cerrado por ${closing.user?.name}` : `Abierto por ${closing.user?.name}`}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md shrink-0 ${
                    closing.status === 'CUADRADO' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                    closing.status === 'SOBRANTE' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                    closing.status === 'EN_CURSO' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                    'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {closing.status === 'EN_CURSO' ? 'EN CURSO' : closing.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Ingresos</div>
                    <div className="font-black text-emerald-700 mt-0.5">+{formatCOP(closing.totalIncome)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Egresos</div>
                    <div className="font-black text-rose-700 mt-0.5">-{formatCOP(closing.totalExpense)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Diferencia</div>
                    <div className={`font-black mt-0.5 ${isCuadrado ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {closing.difference >= 0 ? '+' : ''}{formatCOP(closing.difference)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>{closing.operationsCount} transacciones registradas</span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
