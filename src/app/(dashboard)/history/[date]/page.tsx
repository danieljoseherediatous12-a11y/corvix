'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatCOP } from '@/lib/calculations';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

export default function HistoryDetailPage() {
  const { date } = useParams() as { date: string };
  const router = useRouter();
  const [closing, setClosing] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/closings?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        setClosing(data.closing);
        setLoading(false);
      });
  }, [date]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!closing) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-sm text-slate-500">No se encontró el cierre para esta fecha</p>
        <button onClick={() => router.back()} className="mt-3 text-xs font-bold text-slate-900">Volver</button>
      </div>
    );
  }

  const c = closing as {
    date: string;
    status: string;
    initialCash: number;
    totalIncome: number;
    totalExpense: number;
    expectedCash: number;
    countedCash: number;
    difference: number;
    operationsCount: number;
    vouchersCount: number;
    pendingVouchers: number;
    operationsNoVoucher: number;
    closedAt: string;
    notes?: string;
    user: { name: string };
    session: { operations: Array<{ id: string; type: string; amount: number; netCashFlow: number; description?: string; operatedAt: string; category?: { name: string }; voucher?: { status: string } }> };
  };

  const dateLabel = new Date(c.date + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 capitalize tracking-tight">{dateLabel}</h1>
          <p className="text-xs text-slate-500">Estado de jornada: <strong>{c.status}</strong></p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 text-sm">
        <div className="flex justify-between p-4">
          <span className="text-slate-500">Efectivo Inicial</span>
          <span className="font-bold text-slate-900">{formatCOP(c.initialCash)}</span>
        </div>
        <div className="flex justify-between p-4">
          <span className="text-slate-500">Ingresos</span>
          <span className="font-bold text-emerald-700">+{formatCOP(c.totalIncome)}</span>
        </div>
        <div className="flex justify-between p-4">
          <span className="text-slate-500">Egresos</span>
          <span className="font-bold text-rose-700">-{formatCOP(c.totalExpense)}</span>
        </div>
        <div className="flex justify-between p-4 bg-slate-50 font-bold">
          <span className="text-slate-900">Saldo Esperado</span>
          <span className="font-black text-slate-900">{formatCOP(c.expectedCash)}</span>
        </div>
        <div className="flex justify-between p-4">
          <span className="text-slate-500">Efectivo Contado</span>
          <span className="font-bold text-slate-900">{formatCOP(c.countedCash)}</span>
        </div>
        <div className="flex justify-between p-4">
          <span className="text-slate-500">Diferencia Final</span>
          <span className={`font-black ${c.difference === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {c.difference >= 0 ? '+' : ''}{formatCOP(c.difference)}
          </span>
        </div>
      </div>

      {c.session?.operations && c.session.operations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} /> Operaciones del Día
          </div>
          <div className="divide-y divide-slate-100">
            {c.session.operations.map((op) => (
              <div key={op.id} className="flex items-center justify-between px-5 py-3.5 text-xs">
                <div>
                  <div className="font-bold text-slate-900">{op.category?.name || op.type}</div>
                  <div className="text-slate-400 mt-0.5">
                    {new Date(op.operatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    {op.description && ` • ${op.description}`}
                  </div>
                </div>
                <div className={`font-black ${op.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {op.type === 'INGRESO' ? '+' : '-'}{formatCOP(op.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-[11px] text-slate-400">
        Cerrado por {c.user?.name} • {new Date(c.closedAt).toLocaleString('es-CO')}
      </div>
    </div>
  );
}
