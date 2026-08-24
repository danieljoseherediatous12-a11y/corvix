'use client';

import { useState, useEffect } from 'react';
import { formatCOP, formatDateTime } from '@/lib/calculations';
import { Search, FileText, TrendingUp, TrendingDown, ArrowRight, QrCode, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    operations: Array<{
      id: string;
      type: 'INGRESO' | 'EGRESO';
      amount: number;
      reference?: string;
      operationNumber?: string;
      description?: string;
      operatedAt: string;
      category?: { name: string };
      user: { name: string };
    }>;
    vouchers: Array<{
      id: string;
      qrReference?: string;
      qrOperationNum?: string;
      qrTransactionId?: string;
      qrAmount?: number;
      qrEntity?: string;
      ocrReference?: string;
      ocrOperationNum?: string;
      ocrEntity?: string;
      imageUrl?: string;
      operation: {
        id: string;
        amount: number;
        type: string;
        reference?: string;
        operationNumber?: string;
        category?: { name: string };
      };
    }>;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="w-full space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Búsqueda Inteligente</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Busca cualquier operación, número de comprobante, referencia o cliente
        </p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribe número de referencia, voucher, cajero, monto..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200/90 rounded-2xl text-sm font-medium focus:outline-none focus:border-slate-900 shadow-2xs transition"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      )}

      {results && !loading && (
        <div className="space-y-6">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {results.total} Resultados encontrados para &quot;{query}&quot;
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operations */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Operaciones ({results.operations.length})</h3>
              {results.operations.length === 0 ? (
                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl text-slate-400 text-xs text-center shadow-2xs">
                  Sin operaciones coincidentes
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
                  {results.operations.map((op) => (
                    <div key={op.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          op.type === 'INGRESO' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {op.type === 'INGRESO' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{op.category?.name || op.type}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {formatDateTime(op.operatedAt)}
                            {op.reference && <span> • Ref: {op.reference}</span>}
                          </div>
                        </div>
                      </div>
                      <div className={`font-black text-sm ${op.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {op.type === 'INGRESO' ? '+' : '-'}{formatCOP(op.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vouchers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Comprobantes ({results.vouchers.length})</h3>
                <Link href="/vouchers" className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1">
                  <span>Ver todos</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
              {results.vouchers.length === 0 ? (
                <div className="p-6 bg-white border border-slate-200/90 rounded-2xl text-slate-400 text-xs text-center shadow-2xs">
                  Sin vouchers coincidentes
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
                  {results.vouchers.map((v) => {
                    const refNumber = v.qrReference || v.ocrReference || v.operation?.reference || 'Sin Ref';
                    const opNum = v.qrOperationNum || v.ocrOperationNum || v.operation?.operationNumber || 'S/N';
                    const entity = v.ocrEntity || v.qrEntity || v.operation?.category?.name || 'Comprobante';

                    return (
                      <Link
                        key={v.id}
                        href="/vouchers"
                        className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-700 shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">Op #{opNum}</span>
                              {v.imageUrl && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-1.5 py-0.5 rounded-md border border-emerald-200">
                                  📸 Foto
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                              Ref: {refNumber} • <span className="text-slate-400 font-sans">{entity}</span>
                            </div>
                          </div>
                        </div>
                        <div className="font-black text-sm text-slate-900">
                          {formatCOP(v.qrAmount || v.operation?.amount || 0)}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
