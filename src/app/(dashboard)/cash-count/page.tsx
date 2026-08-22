'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatCOP } from '@/lib/calculations';
import {
  Scale, Plus, Minus, CheckCircle2, AlertTriangle,
  RotateCcw, Save, ArrowLeft, DollarSign, Wallet, ShieldCheck, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface Denomination {
  id: string;
  value: number;
  label: string;
  type: string;
}

export default function CashCountPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [expectedCash, setExpectedCash] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/dashboard').then((r) => r.json()),
    ])
      .then(([settingsData, dashData]) => {
        const denoms: Denomination[] = settingsData.denominations || [];
        setDenominations(denoms.sort((a, b) => b.value - a.value));

        const initCounts: Record<string, number> = {};
        denoms.forEach((d) => {
          initCounts[d.id] = 0;
        });
        setCounts(initCounts);

        if (dashData?.summary) {
          setExpectedCash(dashData.summary.expectedCash ?? dashData.summary.initialCash ?? 0);
        } else if (dashData?.session) {
          setExpectedCash(dashData.session.initialCash ?? 0);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const updateCount = (id: string, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  const setCountDirect = (id: string, value: string) => {
    const num = parseInt(value) || 0;
    setCounts((prev) => ({
      ...prev,
      [id]: Math.max(0, num),
    }));
  };

  const resetAll = () => {
    if (!confirm('¿Restablecer el conteo de billetes y monedas a cero?')) return;
    const reset: Record<string, number> = {};
    denominations.forEach((d) => {
      reset[d.id] = 0;
    });
    setCounts(reset);
    setNotes('');
  };

  const totalCounted = denominations.reduce((acc, d) => {
    return acc + (counts[d.id] || 0) * d.value;
  }, 0);

  const difference = totalCounted - expectedCash;
  const isExact = difference === 0;
  const isSurplus = difference > 0;
  const isDeficit = difference < 0;

  const handleSave = async () => {
    setSaving(true);
    setError('');

    const details = denominations
      .filter((d) => (counts[d.id] || 0) > 0)
      .map((d) => ({
        denominationId: d.id,
        quantity: counts[d.id] || 0,
        subtotal: (counts[d.id] || 0) * d.value,
      }));

    try {
      const res = await fetch('/api/cash-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countedCash: totalCounted,
          difference,
          status: isExact ? 'CUADRADO' : isSurplus ? 'SOBRANTE' : 'FALTANTE',
          notes,
          details,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al registrar el arqueo');
        setSaving(false);
        return;
      }

      setSaved(true);
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } catch {
      setError('Error de conexión con el servidor');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-sm w-full animate-fade-in-up">
          <CheckCircle2 size={56} className="text-emerald-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Arqueo Registrado</h2>
          <p className="text-xs text-slate-500 mt-1">Conteo de efectivo guardado con éxito...</p>
        </div>
      </div>
    );
  }

  const bills = denominations.filter((d) => d.type === 'BILLETE');
  const coins = denominations.filter((d) => d.type === 'MONEDA');

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Arqueo de Caja Físico</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Conteo minucioso de billetes y monedas con verificación de descuadres
            </p>
          </div>
        </div>

        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>Reiniciar Conteo</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Denominations Counter Grid */}
        <div className="lg:col-span-7 space-y-5">
          {/* Bills Grid */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Billetes en Caja
              </span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {bills.length} Denominaciones
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bills.map((denom) => {
                const count = counts[denom.id] || 0;
                const subtotal = count * denom.value;
                return (
                  <div
                    key={denom.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      count > 0 ? 'bg-slate-50/90 border-slate-300 shadow-2xs' : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-slate-900 text-sm">{denom.label}</span>
                      <span className="font-bold text-xs text-slate-600">{formatCOP(subtotal)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCount(denom.id, -1)}
                        className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-base transition shrink-0 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={count === 0 ? '' : count}
                        onChange={(e) => setCountDirect(denom.id, e.target.value)}
                        placeholder="0"
                        className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-xl text-center font-black text-base focus:outline-none focus:border-slate-900"
                        min="0"
                      />
                      <button
                        type="button"
                        onClick={() => updateCount(denom.id, 1)}
                        className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-base transition shrink-0 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Add Buttons */}
                    <div className="flex gap-1.5 mt-2">
                      {[5, 10, 20].map((qty) => (
                        <button
                          key={qty}
                          type="button"
                          onClick={() => updateCount(denom.id, qty)}
                          className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition cursor-pointer"
                        >
                          +{qty}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coins Grid */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Monedas en Caja
              </span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {coins.length} Denominaciones
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coins.map((denom) => {
                const count = counts[denom.id] || 0;
                const subtotal = count * denom.value;
                return (
                  <div
                    key={denom.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      count > 0 ? 'bg-slate-50/90 border-slate-300 shadow-2xs' : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 text-xs">{denom.label}</span>
                      <span className="font-bold text-xs text-slate-600">{formatCOP(subtotal)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateCount(denom.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm transition shrink-0 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={count === 0 ? '' : count}
                        onChange={(e) => setCountDirect(denom.id, e.target.value)}
                        placeholder="0"
                        className="w-full py-1 px-2 bg-white border border-slate-200 rounded-lg text-center font-bold text-sm focus:outline-none focus:border-slate-900"
                        min="0"
                      />
                      <button
                        type="button"
                        onClick={() => updateCount(denom.id, 1)}
                        className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-sm transition shrink-0 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Live Balance Meter & Action Card */}
        <div className="lg:col-span-5 space-y-5">
          {/* Comparison Status Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Scale size={16} className="text-slate-500" />
              Comparación en Tiempo Real
            </h3>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Efectivo Físico Contado</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{formatCOP(totalCounted)}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <Wallet size={20} />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Saldo Esperado en Sistema</div>
                  <div className="text-xl font-bold text-slate-700 mt-0.5">{formatCOP(expectedCash)}</div>
                </div>
                <div className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-2xs">
                  Teórico
                </div>
              </div>
            </div>

            {/* Difference / Discrepancy Banner */}
            <div className={`p-5 rounded-2xl border text-center transition-all ${
              isExact ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              isSurplus ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                {isExact && <CheckCircle2 size={16} className="text-emerald-600" />}
                {!isExact && <AlertTriangle size={16} className={isSurplus ? 'text-amber-600' : 'text-rose-600'} />}
                <span>{isExact ? 'Caja Perfectamente Cuadrada' : isSurplus ? 'Sobrante en Caja' : 'Faltante en Caja'}</span>
              </div>

              <div className={`text-4xl font-black mt-2 ${
                isExact ? 'text-emerald-700' : isSurplus ? 'text-amber-800' : 'text-rose-700'
              }`}>
                {difference >= 0 ? '+' : ''}{formatCOP(difference)}
              </div>

              <p className="text-xs mt-1 opacity-80 font-medium">
                {isExact ? 'El efectivo físico coincide exactamente con el sistema.' :
                 isSurplus ? 'Hay más dinero físico en caja que el registrado en sistema.' :
                 'Falta dinero físico en caja respecto al registro del sistema.'}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Observaciones del Arqueo
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Motivo del descuadre, notas del operador..."
                rows={2}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 focus:bg-white resize-none"
              />
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? 'Guardando arqueo...' : (
                <>
                  <span>Registrar y Guardar Arqueo</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
