'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatCOP, parseCOP } from '@/lib/calculations';
import {
  DollarSign, ArrowRight, AlertCircle, Wallet, CheckCircle2,
  Sparkles, History, Edit3, Scale
} from 'lucide-react';
import Link from 'next/link';

interface LastClosing {
  id: string;
  date: string;
  countedCash: number;
  expectedCash: number;
  difference: number;
  status: string;
  user?: { name: string };
}

export default function OpenSessionPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [initialCash, setInitialCash] = useState('');
  const [notes, setNotes] = useState('');
  const [lastClosing, setLastClosing] = useState<LastClosing | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState('');
  const [selectedSource, setSelectedSource] = useState<'previous' | 'manual'>('previous');

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => {
        if (data.lastClosing) {
          setLastClosing(data.lastClosing);
          // Pre-fill with the counted cash from previous closing by default
          const prevCash = data.lastClosing.countedCash || data.lastClosing.expectedCash || 5000000;
          setInitialCash(String(prevCash));
          setSelectedSource('previous');
        } else {
          setInitialCash('5000000');
          setSelectedSource('manual');
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingInitial(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const amount = parseCOP(initialCash);
    if (amount < 0) {
      setError('El efectivo inicial no puede ser negativo');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialCash: amount, notes }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 409) {
        setError(data.error || 'Error al abrir la caja');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Error de conexión con el servidor');
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const parsedAmount = parseCOP(initialCash);

  const presets = [1000000, 2000000, 3000000, 5000000, 10000000];

  return (
    <div className="max-w-lg mx-auto pt-6 pb-24 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
          <Wallet size={28} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Apertura de Caja</h1>
        <p className="text-xs text-slate-500 capitalize font-medium">{today}</p>
      </div>

      {/* Suggested Previous Closing Cash Banner */}
      {lastClosing && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <History size={16} className="text-emerald-600" />
              Arqueo del Cierre Anterior
            </span>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
              Sugerido
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-black text-slate-900">
                {formatCOP(lastClosing.countedCash || lastClosing.expectedCash)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Cierre del {new Date(lastClosing.date + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                {lastClosing.user?.name && ` • Por ${lastClosing.user.name}`}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setInitialCash(String(lastClosing.countedCash || lastClosing.expectedCash));
                setSelectedSource('previous');
              }}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                selectedSource === 'previous' && parsedAmount === (lastClosing.countedCash || lastClosing.expectedCash)
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {selectedSource === 'previous' && parsedAmount === (lastClosing.countedCash || lastClosing.expectedCash)
                ? '✓ Aplicado'
                : 'Usar este saldo'}
            </button>
          </div>
        </div>
      )}

      {/* Main Opening Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Selector Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 flex gap-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setSelectedSource('previous');
              if (lastClosing) setInitialCash(String(lastClosing.countedCash || lastClosing.expectedCash));
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedSource === 'previous'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History size={15} />
            <span>Cierre Anterior</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedSource('manual')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedSource === 'manual'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-transparent text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Edit3 size={15} />
            <span>Ingresar Manualmente</span>
          </button>
        </div>

        {/* Initial Cash Input Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Efectivo Inicial de la Caja ($ COP)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">$</span>
              <input
                type="number"
                value={initialCash}
                onChange={(e) => {
                  setInitialCash(e.target.value);
                  setSelectedSource('manual');
                }}
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-3xl font-black text-right focus:outline-none focus:border-slate-900 focus:bg-white transition"
                placeholder="0"
                min="0"
                autoFocus
              />
            </div>
            {parsedAmount > 0 && (
              <p className="text-right text-xs text-slate-600 font-bold">
                {formatCOP(parsedAmount)}
              </p>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Valores Rápidos de Base:</div>
            <div className="flex flex-wrap gap-2">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setInitialCash(String(val));
                    setSelectedSource('manual');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  {formatCOP(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
              Observaciones de Apertura (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas del cajero o responsable..."
              rows={2}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 focus:bg-white resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || parsedAmount <= 0}
          className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? 'Abriendo jornada...' : (
            <>
              <span>Abrir Jornada de Caja</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
