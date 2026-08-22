'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { formatCOP, formatDateTime } from '@/lib/calculations';
import {
  Plus, Search, Filter, TrendingUp, TrendingDown,
  FileText, CheckCircle2, AlertCircle, Clock, Trash2,
  ArrowDownRight, ArrowUpRight, DollarSign, Layers,
  Receipt, Wallet, RefreshCw
} from 'lucide-react';

interface Operation {
  id: string;
  type: 'INGRESO' | 'EGRESO';
  amount: number;
  receivedAmount?: number;
  changeAmount?: number;
  netCashFlow: number;
  description?: string;
  reference?: string;
  voucherNumber?: string;
  operationNumber?: string;
  status: string;
  operatedAt: string;
  category?: { name: string; color?: string };
  user: { name: string };
  voucher?: {
    id: string;
    status: string;
    qrScanned: boolean;
    ocrCompleted: boolean;
    imageUrl?: string;
  };
}

export default function OperationsPage() {
  const { data: session } = useSession();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);

  const fetchOperations = async () => {
    setLoading(true);
    try {
      let url = '/api/operations?limit=100';
      if (filterType !== 'ALL') url += `&type=${filterType}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setOperations(data.operations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, [filterType, filterStatus]);

  const filtered = operations.filter((op) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (op.reference && op.reference.toLowerCase().includes(term)) ||
      (op.operationNumber && op.operationNumber.toLowerCase().includes(term)) ||
      (op.voucherNumber && op.voucherNumber.toLowerCase().includes(term)) ||
      (op.description && op.description.toLowerCase().includes(term)) ||
      (op.category?.name && op.category.name.toLowerCase().includes(term)) ||
      op.amount.toString().includes(term)
    );
  });

  // Calculate stats
  const totalIncome = operations
    .filter((op) => op.type === 'INGRESO' && op.status !== 'CANCELADA')
    .reduce((acc, op) => acc + op.amount, 0);

  const totalExpense = operations
    .filter((op) => op.type === 'EGRESO' && op.status !== 'CANCELADA')
    .reduce((acc, op) => acc + op.amount, 0);

  const netFlow = totalIncome - totalExpense;
  const validOpsCount = operations.filter((op) => op.status !== 'CANCELADA').length;

  const handleCancelOp = async (id: string) => {
    if (!confirm('¿Estás seguro de cancelar esta operación? Quedará registrado en auditoría.')) return;
    try {
      const res = await fetch(`/api/operations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchOperations();
        setSelectedOp(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const userRole = (session?.user as { role?: string })?.role;

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Registro de Operaciones</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitoreo y auditoría en tiempo real de transacciones de caja
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOperations}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/operations/new"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition text-xs"
          >
            <Plus size={16} />
            Nueva Operación
          </Link>
        </div>
      </div>

      {/* 4 Executive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Operaciones</span>
            <Layers size={18} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{validOpsCount}</div>
          <div className="text-[11px] text-slate-400">Transacciones completadas</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Ingresos</span>
            <ArrowDownRight size={18} />
          </div>
          <div className="text-2xl font-black text-emerald-700">+{formatCOP(totalIncome)}</div>
          <div className="text-[11px] text-emerald-600 font-medium">Depósitos y pagos recibidos</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Retiros</span>
            <ArrowUpRight size={18} />
          </div>
          <div className="text-2xl font-black text-rose-700">-{formatCOP(totalExpense)}</div>
          <div className="text-[11px] text-rose-600 font-medium">Efectivo entregado a clientes</div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-900">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Flujo Neto</span>
            <Wallet size={18} className="text-slate-700" />
          </div>
          <div className={`text-2xl font-black ${netFlow >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
            {netFlow >= 0 ? '+' : ''}{formatCOP(netFlow)}
          </div>
          <div className="text-[11px] text-slate-400">Balance neto de la jornada</div>
        </div>
      </div>

      {/* Main Content Grid: Filters + Table + Sidebar stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Search, Filters & Operations List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-2xs">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por referencia, n° de operación, monto, categoría o descripción..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3.5 py-1.5 transition ${filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterType('INGRESO')}
                  className={`px-3.5 py-1.5 transition ${filterType === 'INGRESO' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  Ingresos
                </button>
                <button
                  onClick={() => setFilterType('EGRESO')}
                  className={`px-3.5 py-1.5 transition ${filterType === 'EGRESO' ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  Retiros / Egresos
                </button>
              </div>

              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 transition ${filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterStatus('COMPLETADA')}
                  className={`px-3 py-1.5 transition ${filterStatus === 'COMPLETADA' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  Completadas
                </button>
                <button
                  onClick={() => setFilterStatus('CANCELADA')}
                  className={`px-3 py-1.5 transition ${filterStatus === 'CANCELADA' ? 'bg-rose-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  Canceladas
                </button>
              </div>
            </div>
          </div>

          {/* Operations List */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex justify-center shadow-2xs">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100 text-slate-400">
                <FileText size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">No hay operaciones registradas</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Comienza registrando tu primera transacción del día o escaneando un comprobante.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Link
                  href="/operations/new"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  Registrar Operación
                </Link>
                <Link
                  href="/scanner"
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs"
                >
                  Escanear Voucher
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
              {filtered.map((op) => {
                const isIncome = op.type === 'INGRESO';
                const isCancelled = op.status === 'CANCELADA';

                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOp(op)}
                    className={`p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isCancelled ? 'opacity-50 bg-slate-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {isIncome ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {op.category?.name || (isIncome ? 'Ingreso' : 'Retiro')}
                          </span>
                          {isCancelled && (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Cancelada
                            </span>
                          )}
                          {op.voucher ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Voucher
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              Sin voucher
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(op.operatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          <span> • Atendido por {op.user?.name}</span>
                          {op.reference && <span> • Ref: {op.reference}</span>}
                          {op.operationNumber && <span> • Op: {op.operationNumber}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-black text-base ${
                        isCancelled ? 'text-slate-400 line-through' :
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

        {/* Right 1 Col: Quick Actions & Live Summary */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Acciones Rápidas</h3>
            <div className="space-y-2">
              <Link
                href="/operations/new"
                className="w-full flex items-center justify-between p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs transition shadow-sm"
              >
                <span>Nueva Operación Manual</span>
                <Plus size={16} />
              </Link>
              <Link
                href="/scanner"
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs transition"
              >
                <span>Escanear Comprobante QR</span>
                <Receipt size={16} className="text-slate-500" />
              </Link>
              <Link
                href="/cash-count"
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl font-bold text-xs transition"
              >
                <span>Arqueo de Efectivo</span>
                <Wallet size={16} className="text-slate-500" />
              </Link>
            </div>
          </div>

          {/* Shift Cash Guidelines Card */}
          <div className="bg-linear-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 size={16} />
              <span>Control de Cuadre de Caja</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Cada operación registrada afecta directamente el saldo físico. Al final de la jornada realiza el arqueo de billetes para verificar la exactitud del cierre.
            </p>
            <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
              <span>Auditoría continua activa</span>
              <span className="text-emerald-400 font-bold">100% Exacto</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedOp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Detalle de Operación</h3>
              <button onClick={() => setSelectedOp(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tipo:</span>
                <span className="font-bold">{selectedOp.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Valor:</span>
                <span className="font-black text-slate-900 text-sm">{formatCOP(selectedOp.amount)}</span>
              </div>
              {selectedOp.receivedAmount && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Dinero Recibido:</span>
                  <span className="font-bold">{formatCOP(selectedOp.receivedAmount)}</span>
                </div>
              )}
              {selectedOp.changeAmount !== undefined && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Cambio Entregado:</span>
                  <span className="font-bold text-slate-900">{formatCOP(selectedOp.changeAmount)}</span>
                </div>
              )}
              {selectedOp.reference && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Referencia:</span>
                  <span className="font-mono font-bold">{selectedOp.reference}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Fecha y Hora:</span>
                <span>{formatDateTime(selectedOp.operatedAt)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Atendido por:</span>
                <span className="font-bold">{selectedOp.user?.name}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              {(userRole === 'DUENO' || userRole === 'ADMIN') && selectedOp.status !== 'CANCELADA' && (
                <button
                  onClick={() => handleCancelOp(selectedOp.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 py-3 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  <Trash2 size={15} /> Cancelar Operación
                </button>
              )}
              <button
                onClick={() => setSelectedOp(null)}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
