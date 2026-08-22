'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCOP } from '@/lib/calculations';
import { CheckCircle2, AlertTriangle, Lock, AlertCircle, ArrowLeft, ShieldCheck, ArrowRight, Wallet, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface DashboardSummary {
  date: string;
  initialCash: number;
  totalIncome: number;
  totalExpense: number;
  totalFees?: number;
  expectedCash: number;
  operationsCount: number;
  sessionId: string;
  isClosed: boolean;
}

interface Alert {
  type: string;
  message: string;
  severity: string;
}

export default function ClosingPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [closingResult, setClosingResult] = useState<{
    status: string;
    difference: number;
    countedCash: number;
    expectedCash: number;
  } | null>(null);
  const [pendingVouchers, setPendingVouchers] = useState(0);
  const [noVoucher, setNoVoucher] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setAlerts(data.alerts || []);
        setPendingVouchers(
          data.recentOperations?.filter((op: { voucher?: { status: string } }) =>
            op.voucher?.status === 'PENDIENTE' || op.voucher?.status === 'FALTA'
          ).length || 0
        );
        setNoVoucher(
          data.recentOperations?.filter((op: { voucher?: unknown }) => !op.voucher).length || 0
        );
      }
    };
    load();
  }, []);

  const countedValue = parseInt(countedCash) || 0;
  const expectedCash = summary?.expectedCash || 0;
  const difference = countedValue - expectedCash;
  const diffStatus = difference === 0 ? 'CUADRADO' : difference > 0 ? 'SOBRANTE' : 'FALTANTE';

  const handleClose = async () => {
    if (!summary?.sessionId) return;
    if (!confirmed) {
      setError('Marca la casilla de confirmación antes de cerrar');
      return;
    }
    if (!countedCash) {
      setError('Ingresa el efectivo contado antes de cerrar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/closings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: summary.sessionId,
          countedCash: countedValue,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al cerrar la caja');
        return;
      }

      setClosingResult({
        status: data.closing.status,
        difference: data.closing.difference,
        countedCash: data.closing.countedCash,
        expectedCash: data.closing.expectedCash,
      });
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (closingResult) {
    const isCuadrado = closingResult.status === 'CUADRADO';
    return (
      <div className="max-w-2xl mx-auto space-y-5 pt-6 pb-24 animate-fade-in-up">
        <div className="border border-slate-200 rounded-3xl p-8 text-center bg-white shadow-2xs space-y-2">
          <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Lock size={26} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {isCuadrado ? 'Caja Cerrada y Cuadrada' : `Cierre con Diferencia: ${formatCOP(closingResult.difference)}`}
          </h2>
          <p className="text-xs text-slate-500 font-medium">La jornada de hoy ha sido bloqueada y auditada correctamente.</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs divide-y divide-slate-100 text-sm">
          <div className="flex justify-between p-5">
            <span className="text-slate-500">Saldo Esperado en Sistema</span>
            <span className="font-bold text-slate-900">{formatCOP(closingResult.expectedCash)}</span>
          </div>
          <div className="flex justify-between p-5">
            <span className="text-slate-500">Efectivo Físico Contado</span>
            <span className="font-bold text-slate-900">{formatCOP(closingResult.countedCash)}</span>
          </div>
          <div className="flex justify-between p-5 bg-slate-50/50">
            <span className="text-slate-700 font-bold">Diferencia Final</span>
            <span className={`font-black text-base ${isCuadrado ? 'text-emerald-700' : 'text-rose-700'}`}>
              {closingResult.difference >= 0 ? '+' : ''}{formatCOP(closingResult.difference)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => router.push('/history')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-4 rounded-xl text-xs transition shadow-2xs cursor-pointer">
            Ver Historial
          </button>
          <button onClick={() => router.push('/reports')} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl text-xs transition shadow-sm cursor-pointer">
            Ver Reportes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cierre del Día</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Finalizar jornada, conciliar saldo y bloquear modificaciones
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 Cols): Financial Breakdown */}
        <div className="lg:col-span-6 space-y-5">
          {summary && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-slate-500" />
                Resumen Financiero del Día
              </h3>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Efectivo Inicial en Caja:</span>
                  <span className="font-bold text-slate-900">{formatCOP(summary.initialCash)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Total Ingresos Recibidos:</span>
                  <span className="font-bold text-emerald-700">+{formatCOP(summary.totalIncome)}</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-slate-500">Total Egresos Entregados:</span>
                  <span className="font-bold text-rose-700">-{formatCOP(summary.totalExpense)}</span>
                </div>
                <div className="flex justify-between py-2.5 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/70 my-1">
                  <span className="text-emerald-900 font-bold">Ganancias por Comisiones:</span>
                  <span className="font-black text-emerald-800">+{formatCOP(summary.totalFees || 0)}</span>
                </div>
                <div className="flex justify-between py-3 bg-slate-50 p-3 rounded-xl font-bold mt-2">
                  <span className="text-slate-900">Saldo Esperado en Caja:</span>
                  <span className="font-black text-slate-900 text-sm">{formatCOP(expectedCash)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {(alerts.length > 0 || pendingVouchers > 0 || noVoucher > 0) && (
            <div className="space-y-2">
              {pendingVouchers > 0 && (
                <div className="flex items-center gap-2.5 p-4 rounded-2xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>Hay {pendingVouchers} comprobante(s) pendientes de revisión antes del cierre.</span>
                </div>
              )}
              {noVoucher > 0 && (
                <div className="flex items-center gap-2.5 p-4 rounded-2xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>Hay {noVoucher} operación(es) registradas sin voucher adjunto.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (6 Cols): Input Counted Cash & Final Lock Action */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Lock size={16} className="text-slate-500" />
              Conciliación Final de Caja
            </h3>

            {/* Input Counted Cash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Efectivo Físico Contado ($ COP)
                </label>
                <Link href="/cash-count" className="text-[11px] font-bold text-emerald-700 hover:underline">
                  Usar Calculadora de Billetes
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">$</span>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-3xl font-black text-right focus:outline-none focus:border-slate-900 focus:bg-white transition"
                  placeholder="0"
                  autoFocus
                />
              </div>
            </div>

            {/* Difference live badge */}
            {countedCash && (
              <div className={`p-4 rounded-2xl border text-center transition-all ${
                diffStatus === 'CUADRADO' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                diffStatus === 'SOBRANTE' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="font-bold text-xs uppercase tracking-wider">
                  {diffStatus === 'CUADRADO' ? 'Caja Cuadrada' : diffStatus === 'SOBRANTE' ? 'Sobrante' : 'Faltante'}
                </div>
                <div className={`text-2xl font-black mt-0.5 ${
                  diffStatus === 'CUADRADO' ? 'text-emerald-700' : diffStatus === 'SOBRANTE' ? 'text-amber-800' : 'text-rose-700'
                }`}>
                  {difference >= 0 ? '+' : ''}{formatCOP(difference)}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Observaciones del Cierre
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Novedades de la jornada, motivos de descuadre..."
                rows={2}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 focus:bg-white resize-none"
              />
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
              />
              <span className="text-xs text-slate-600 leading-tight">
                Confirmo que el efectivo ingresado es el existente físicamente en la gaveta. Entiendo que la jornada quedará bloqueada.
              </span>
            </label>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              onClick={handleClose}
              disabled={loading || !confirmed || !countedCash}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Cerrando caja...' : (
                <>
                  <Lock size={18} />
                  <span>Finalizar y Cerrar Jornada</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
