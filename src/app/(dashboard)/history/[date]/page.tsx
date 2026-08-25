'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatCOP } from '@/lib/calculations';
import { CorvixLogo } from '@/components/ui/CorvixLogo';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Coins,
  TrendingUp,
  TrendingDown,
  User,
  Clock,
  Printer,
  Eye,
  X,
  CreditCard,
  Building2,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Search,
  Filter,
  ImageIcon,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface VoucherData {
  id: string;
  status: string;
  qrRaw?: string | null;
  qrOperationNum?: string | null;
  qrReference?: string | null;
  qrTransactionId?: string | null;
  qrAmount?: number | null;
  qrDate?: string | null;
  qrTime?: string | null;
  qrType?: string | null;
  qrEntity?: string | null;
  qrCommerce?: string | null;
  qrAuthCode?: string | null;
  ocrText?: string | null;
  ocrAmount?: number | null;
  ocrReference?: string | null;
  ocrEntity?: string | null;
  imageUrl?: string | null;
  imagePath?: string | null;
  scannedAt?: string | null;
}

interface OperationItem {
  id: string;
  type: string;
  amount: number;
  fee?: number | null;
  receivedAmount?: number | null;
  changeAmount?: number | null;
  netCashFlow: number;
  description?: string | null;
  reference?: string | null;
  voucherNumber?: string | null;
  operationNumber?: string | null;
  status: string;
  operatedAt: string;
  category?: { name: string; icon?: string } | null;
  user?: { name: string } | null;
  voucher?: VoucherData | null;
}

interface CashCountDetail {
  denomination: number;
  quantity: number;
  subtotal: number;
}

interface CashCountItem {
  id: string;
  expectedCash: number;
  countedCash: number;
  difference: number;
  status: string;
  notes?: string | null;
  createdAt: string;
  user?: { name: string } | null;
  details: CashCountDetail[];
}

interface ClosingDetail {
  id: string;
  date: string;
  status: string;
  initialCash: number;
  totalIncome: number;
  totalExpense: number;
  totalFees?: number | null;
  expectedCash: number;
  countedCash: number;
  difference: number;
  operationsCount: number;
  vouchersCount: number;
  pendingVouchers: number;
  operationsNoVoucher: number;
  closedAt: string;
  notes?: string | null;
  user: { id: string; name: string };
  session?: {
    id: string;
    operations: OperationItem[];
    cashCounts: CashCountItem[];
  };
}

export default function HistoryDetailPage() {
  const { date } = useParams() as { date: string };
  const router = useRouter();
  const [closing, setClosing] = useState<ClosingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OPERATIONS' | 'VOUCHERS' | 'ARQUEO'>('OPERATIONS');
  const [filterType, setFilterType] = useState<'ALL' | 'INGRESO' | 'EGRESO' | 'WITH_VOUCHER'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState<{ op: OperationItem; voucher: VoucherData } | null>(null);

  useEffect(() => {
    fetch(`/api/closings?date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        setClosing(data.closing);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
        <p className="text-xs text-slate-500 font-medium">Cargando reporte histórico y vouchers...</p>
      </div>
    );
  }

  if (!closing) {
    return (
      <div className="max-w-md mx-auto text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-lg font-black text-slate-900">Jornada no encontrada</h2>
        <p className="text-xs text-slate-500 mt-1">No se encontró un cierre registrado para la fecha {date}.</p>
        <button
          onClick={() => router.push('/history')}
          className="mt-5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
        >
          Volver al Historial
        </button>
      </div>
    );
  }

  const operations = closing.session?.operations || [];
  const cashCounts = closing.session?.cashCounts || [];
  const latestArqueo = cashCounts.length > 0 ? cashCounts[0] : null;

  // Filter operations
  const filteredOps = operations.filter((op) => {
    if (filterType === 'INGRESO' && op.type !== 'INGRESO') return false;
    if (filterType === 'EGRESO' && op.type !== 'EGRESO') return false;
    if (filterType === 'WITH_VOUCHER' && !op.voucher) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchCat = op.category?.name?.toLowerCase().includes(q);
      const matchDesc = op.description?.toLowerCase().includes(q);
      const matchRef = op.reference?.toLowerCase().includes(q);
      const matchNum = op.operationNumber?.toLowerCase().includes(q);
      const matchUser = op.user?.name?.toLowerCase().includes(q);
      const matchVoucherRef = op.voucher?.qrReference?.toLowerCase().includes(q);
      return matchCat || matchDesc || matchRef || matchNum || matchUser || matchVoucherRef;
    }
    return true;
  });

  const vouchersList = operations.filter((op) => op.voucher && op.voucher.id);

  const isCuadrado = closing.status === 'CUADRADO';
  const isSobrante = closing.status === 'SOBRANTE';
  const dateLabel = new Date(closing.date + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const catMap: Record<string, { name: string; type: string; count: number; total: number; fees: number }> = {};
  for (const op of operations) {
    const name = op.category?.name || (op.type === 'INGRESO' ? 'Ingreso General' : 'Egreso General');
    if (!catMap[name]) {
      catMap[name] = { name, type: op.type, count: 0, total: 0, fees: 0 };
    }
    catMap[name].count++;
    catMap[name].total += op.amount;
    catMap[name].fees += op.fee || 0;
  }
  const categoriesSummary = Object.values(catMap);

  const closingTimeStr = closing.closedAt
    ? new Date(closing.closedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })
    : 'Jornada en curso';

  return (
    <>
      {/* SCREEN ONLY: INTERACTIVE UI */}
      <div className="screen-only w-full space-y-6 pb-28">
        {/* HEADER WITH ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/history')}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0"
              title="Volver"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 capitalize tracking-tight">
                  {dateLabel}
                </h1>
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    isCuadrado
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : isSobrante
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {closing.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                <span>Cerrado por: <strong>{closing.user?.name || 'Propietario'}</strong></span>
                <span>•</span>
                <span>Hora de Cierre: {closingTimeStr}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer shadow-sm"
            >
              <Printer size={16} />
              <span>Imprimir Resumen Formal</span>
            </button>
          </div>
        </div>

      {/* 6 KEY METRICS DASHBOARD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Base Apertura</div>
          <div className="text-base font-black text-slate-900 mt-1 truncate">
            {formatCOP(closing.initialCash)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
            <ArrowUpRight size={12} /> Ingresos (+Entró)
          </div>
          <div className="text-base font-black text-emerald-700 mt-1 truncate">
            +{formatCOP(closing.totalIncome)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1">
            <ArrowDownRight size={12} /> Egresos (-Salió)
          </div>
          <div className="text-base font-black text-rose-700 mt-1 truncate">
            -{formatCOP(closing.totalExpense)}
          </div>
        </div>

        <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
            <Coins size={12} /> Ganancias Comisiones
          </div>
          <div className="text-base font-black text-emerald-800 mt-1 truncate">
            +{formatCOP(closing.totalFees || 0)}
          </div>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold text-slate-400 uppercase">Saldo Esperado</div>
          <div className="text-base font-black text-white mt-1 truncate">
            {formatCOP(closing.expectedCash)}
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-2xs ${
          isCuadrado ? 'bg-emerald-50 border-emerald-200' : isSobrante ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="text-[10px] font-bold uppercase text-slate-600">Arqueo Final</div>
          <div className="text-base font-black text-slate-900 mt-1 truncate">
            {formatCOP(closing.countedCash)}
          </div>
          <div className={`text-[10px] font-black mt-0.5 ${
            isCuadrado ? 'text-emerald-700' : isSobrante ? 'text-amber-700' : 'text-rose-700'
          }`}>
            Dif: {closing.difference >= 0 ? '+' : ''}{formatCOP(closing.difference)}
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('OPERATIONS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
            activeTab === 'OPERATIONS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText size={16} />
          <span>Todas las Operaciones ({operations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('VOUCHERS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
            activeTab === 'VOUCHERS'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <QrCode size={16} />
          <span>Vouchers y Comprobantes ({vouchersList.length})</span>
        </button>

        {latestArqueo && (
          <button
            onClick={() => setActiveTab('ARQUEO')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer ${
              activeTab === 'ARQUEO'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers size={16} />
            <span>Desglose de Billetes y Monedas</span>
          </button>
        )}
      </div>

      {/* TAB CONTENT 1: DETAILED OPERATIONS */}
      {activeTab === 'OPERATIONS' && (
        <div className="space-y-4">
          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por referencia, cliente, cajero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'ALL' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({operations.length})
              </button>
              <button
                onClick={() => setFilterType('INGRESO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'INGRESO' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFilterType('EGRESO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'EGRESO' ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Egresos
              </button>
              <button
                onClick={() => setFilterType('WITH_VOUCHER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'WITH_VOUCHER' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Con Voucher ({vouchersList.length})
              </button>
            </div>
          </div>

          {filteredOps.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-2xs">
              <FileText size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-500">No se encontraron operaciones con los filtros aplicados</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden divide-y divide-slate-100">
              {filteredOps.map((op, idx) => {
                const isIngreso = op.type === 'INGRESO';
                const hasVoucher = !!op.voucher;
                const timeStr = new Date(op.operatedAt).toLocaleTimeString('es-CO', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <div
                    key={op.id}
                    className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* LEFT: INFO */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                          isIngreso
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isIngreso ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-900">
                            {op.category?.name || (isIngreso ? 'Consignación / Recarga' : 'Retiro')}
                          </span>
                          {op.fee && op.fee > 0 ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                              + {formatCOP(op.fee)} ganancia
                            </span>
                          ) : null}
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock size={12} /> {timeStr}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                          {op.reference && (
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              Ref: {op.reference}
                            </span>
                          )}
                          {op.description && (
                            <span>{op.description}</span>
                          )}
                          {op.user?.name && (
                            <span className="text-slate-400 flex items-center gap-1">
                              <User size={11} /> Cajero: {op.user.name}
                            </span>
                          )}
                        </div>

                        {/* RECEIVED & CHANGE INFO IF RECORDED */}
                        {op.receivedAmount && op.receivedAmount > 0 && (
                          <div className="text-[11px] text-slate-400 pt-0.5">
                            Cliente pagó con: <strong>{formatCOP(op.receivedAmount)}</strong>
                            {op.changeAmount && op.changeAmount > 0 ? ` • Cambio: ${formatCOP(op.changeAmount)}` : ' • Pago exacto'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: AMOUNTS & VOUCHER ACTION */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <div
                          className={`text-base font-black ${
                            isIngreso ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isIngreso ? '+' : '-'}{formatCOP(op.amount)}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          Impacto caja: {isIngreso ? '+' : '-'}{formatCOP(Math.abs(op.netCashFlow))}
                        </div>
                      </div>

                      {hasVoucher ? (
                        <button
                          onClick={() => setSelectedVoucher({ op, voucher: op.voucher! })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition cursor-pointer shadow-2xs"
                        >
                          <Eye size={14} />
                          <span>Ver Voucher</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-xl">
                          Sin Voucher
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: VOUCHERS GALLERY & VERIFICATION */}
      {activeTab === 'VOUCHERS' && (
        <div className="space-y-4">
          {vouchersList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-2xs">
              <QrCode size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-500">No hay comprobantes escaneados registrados en esta jornada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vouchersList.map((op) => {
                const v = op.voucher!;
                return (
                  <div
                    key={v.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-3.5 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                          <QrCode size={18} />
                        </div>
                        <div>
                          <div className="font-black text-xs text-slate-900">
                            {v.qrEntity || v.ocrEntity || op.category?.name || 'Voucher Validado'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(op.operatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {v.status || 'REGISTRADO'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monto Comprobante:</span>
                        <span className="font-black text-slate-900">
                          {formatCOP(v.qrAmount || v.ocrAmount || op.amount)}
                        </span>
                      </div>
                      {(v.qrReference || op.reference) && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Referencia:</span>
                          <span className="font-bold text-slate-700 truncate max-w-[150px]">
                            {v.qrReference || op.reference}
                          </span>
                        </div>
                      )}
                      {(v.qrOperationNum || op.operationNumber) && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">N° Transacción:</span>
                          <span className="font-bold text-slate-700">
                            {v.qrOperationNum || op.operationNumber}
                          </span>
                        </div>
                      )}
                      {v.qrCommerce && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Comercio:</span>
                          <span className="font-bold text-slate-700">{v.qrCommerce}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedVoucher({ op, voucher: v })}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye size={14} />
                      <span>Ver Detalles Completos</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: PHYSICAL CASH ARQUEO BREAKDOWN */}
      {activeTab === 'ARQUEO' && latestArqueo && (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900">Conteo Físico Realizado en el Cierre</h3>
                <p className="text-xs text-slate-400">
                  Realizado por: {latestArqueo.user?.name || closing.user?.name} • {new Date(latestArqueo.createdAt).toLocaleTimeString('es-CO')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Efectivo Arqueado</span>
                <span className="text-lg font-black text-slate-900">{formatCOP(latestArqueo.countedCash)}</span>
              </div>
            </div>

            {latestArqueo.details && latestArqueo.details.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {latestArqueo.details
                  .filter((d) => d.quantity > 0)
                  .sort((a, b) => b.denomination - a.denomination)
                  .map((d, i) => (
                    <div key={i} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                      <div className="text-slate-400 font-bold">{formatCOP(d.denomination)}</div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-600">{d.quantity} {d.quantity === 1 ? 'unidad' : 'unidades'}</span>
                        <span className="font-black text-slate-900">{formatCOP(d.subtotal)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No se registró desglose detallado por billete en este arqueo.</p>
            )}

            {latestArqueo.notes && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <strong className="text-slate-700 block mb-0.5">Observaciones del Arqueo:</strong>
                <span className="text-slate-600">{latestArqueo.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: FULL VOUCHER INSPECTION */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Comprobante / Voucher Oficial</h3>
                  <p className="text-[10px] text-slate-400">Inspección de auditoría de la transacción</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* VOUCHER PHOTO PREVIEW */}
              {selectedVoucher.voucher.imageUrl ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-emerald-600" />
                      Foto Original del Voucher
                    </h4>
                    <a
                      href={selectedVoucher.voucher.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={12} />
                      Ver Tamaño Completo
                    </a>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-h-72 flex items-center justify-center shadow-inner">
                    <img
                      src={selectedVoucher.voucher.imageUrl}
                      alt="Foto original del voucher"
                      className="w-full h-full max-h-72 object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-800 text-[11px] font-medium">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span>Esta operación se registró de forma directa o manual (sin foto de cámara adjunta).</span>
                </div>
              )}

              {/* OPERATION SUMMARY CARD */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tipo de Operación:</span>
                  <span className="font-black text-slate-900">
                    {selectedVoucher.op.category?.name || selectedVoucher.op.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Valor de la Transacción:</span>
                  <span className="text-base font-black text-emerald-700">
                    {formatCOP(selectedVoucher.op.amount)}
                  </span>
                </div>
                {selectedVoucher.op.fee && selectedVoucher.op.fee > 0 ? (
                  <div className="flex justify-between items-center text-emerald-800 font-bold">
                    <span>Comisión / Ganancia del Punto:</span>
                    <span>+{formatCOP(selectedVoucher.op.fee)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Fecha y Hora:</span>
                  <span>{new Date(selectedVoucher.op.operatedAt).toLocaleString('es-CO')}</span>
                </div>
              </div>

              {/* VOUCHER / QR METADATA */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Datos Extraídos del Comprobante
                </h4>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Banco / Entidad:</span>
                    <span className="font-bold text-slate-900">
                      {selectedVoucher.voucher.qrEntity || selectedVoucher.voucher.ocrEntity || 'Corresponsal Bancario'}
                    </span>
                  </div>
                  {selectedVoucher.voucher.qrReference && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Referencia / Celular:</span>
                      <span className="font-bold text-slate-900">{selectedVoucher.voucher.qrReference}</span>
                    </div>
                  )}
                  {selectedVoucher.voucher.qrOperationNum && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">N° Aprobación / Operación:</span>
                      <span className="font-bold text-slate-900">{selectedVoucher.voucher.qrOperationNum}</span>
                    </div>
                  )}
                  {selectedVoucher.voucher.qrCommerce && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Punto / Comercio:</span>
                      <span className="font-bold text-slate-900">{selectedVoucher.voucher.qrCommerce}</span>
                    </div>
                  )}
                  {selectedVoucher.voucher.qrDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fecha del Voucher:</span>
                      <span className="font-bold text-slate-900">
                        {selectedVoucher.voucher.qrDate} {selectedVoucher.voucher.qrTime || ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* OCR TEXT IF AVAILABLE */}
              {selectedVoucher.voucher.ocrText && (
                <div className="space-y-1.5">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                    Lectura OCR de Texto
                  </h4>
                  <div className="p-3 bg-slate-100 rounded-2xl font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedVoucher.voucher.ocrText}
                  </div>
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* =======================================================
          PRINTABLE DOCUMENT (CONSOLIDATED FINANCIAL SUMMARY)
          Rendered exclusively during @media print (Clean & Professional)
          ======================================================= */}
      <div className="print-only text-slate-900 font-sans p-2">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className="w-14 h-14 rounded-2xl p-1 flex items-center justify-center shrink-0"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              <CorvixLogo size={50} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider text-slate-900 uppercase">
                CORVIX • CORRESPONSAL BANCARIO
              </h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Informe Diario de Cuadre de Caja y Resumen Operativo
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-slate-700">
              Jornada: {closing.date}
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Emisión: {new Date().toLocaleDateString('es-CO')} - {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </div>
          </div>
        </div>

        {/* General Information Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 grid grid-cols-4 gap-4 text-xs page-break-inside-avoid">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha Jornada</span>
            <span className="font-black text-slate-900 capitalize text-sm">{dateLabel}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Cajero / Operador</span>
            <span className="font-bold text-slate-900 text-sm">{closing.user?.name || 'Daniel'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Estado Cuadre</span>
            <span className={`font-black text-sm uppercase ${
              isCuadrado ? 'text-emerald-700' : isSobrante ? 'text-amber-700' : 'text-rose-700'
            }`}>
              {closing.status}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Hora de Cierre</span>
            <span className="font-bold text-slate-900 text-sm">{closingTimeStr}</span>
          </div>
        </div>

        {/* Financial Executive Summary Box */}
        <div className="mb-5 page-break-inside-avoid">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
            1. Balance y Flujo de Efectivo en Caja
          </h2>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-3 font-semibold text-slate-600">Base Apertura de Caja (Efectivo Inicial):</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCOP(closing.initialCash)}</td>
                <td className="py-2 px-3 font-semibold text-slate-600">Efectivo Teórico Esperado en Caja:</td>
                <td className="py-2 px-3 text-right font-black text-slate-900">{formatCOP(closing.expectedCash)}</td>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <td className="py-2 px-3 font-semibold text-emerald-800">(+) Total Ingresos Recibidos (Entradas):</td>
                <td className="py-2 px-3 text-right font-black text-emerald-700">+{formatCOP(closing.totalIncome)}</td>
                <td className="py-2 px-3 font-semibold text-slate-700">Efectivo Real Contado (Arqueo Físico):</td>
                <td className="py-2 px-3 text-right font-black text-slate-900">{formatCOP(closing.countedCash)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-3 font-semibold text-rose-800">(-) Total Egresos / Retiros (Salidas):</td>
                <td className="py-2 px-3 text-right font-black text-rose-700">-{formatCOP(closing.totalExpense)}</td>
                <td className="py-2 px-3 font-bold text-slate-800">Diferencia de Cuadre:</td>
                <td className={`py-2 px-3 text-right font-black ${
                  closing.difference === 0 ? 'text-emerald-700' : closing.difference > 0 ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {closing.difference >= 0 ? '+' : ''}{formatCOP(closing.difference)} ({closing.status})
                </td>
              </tr>
              <tr className="bg-emerald-50/50">
                <td className="py-2 px-3 font-black text-emerald-900">Total Ganancias Comisiones Corresponsal:</td>
                <td className="py-2 px-3 text-right font-black text-emerald-800 text-sm">+{formatCOP(closing.totalFees || 0)}</td>
                <td className="py-2 px-3 font-semibold text-slate-600">Total Transacciones Registradas:</td>
                <td className="py-2 px-3 text-right font-black text-slate-900">{operations.length}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Consolidado por Categoría */}
        {categoriesSummary.length > 0 && (
          <div className="mb-5 page-break-inside-avoid">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
              2. Consolidado por Tipo de Operación
            </h2>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="py-1.5 px-3 text-left">Concepto / Tipo</th>
                  <th className="py-1.5 px-3 text-center">Tipo Flujo</th>
                  <th className="py-1.5 px-3 text-center">Cant. Operaciones</th>
                  <th className="py-1.5 px-3 text-right">Monto Total</th>
                  <th className="py-1.5 px-3 text-right">Comisiones Ganadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoriesSummary.map((c) => (
                  <tr key={c.name} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 font-bold text-slate-900">{c.name}</td>
                    <td className="py-1.5 px-3 text-center font-bold text-[10px]">
                      <span className={c.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}>
                        {c.type}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-center font-semibold">{c.count}</td>
                    <td className={`py-1.5 px-3 text-right font-black ${c.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {c.type === 'INGRESO' ? '+' : '-'}{formatCOP(c.total)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-bold text-emerald-800">
                      +{formatCOP(c.fees)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detailed Operations Table */}
        <div className="mb-6">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
            3. Registro Cronológico de Transacciones ({operations.length})
          </h2>
          <table className="w-full text-[11px] border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
              <tr>
                <th className="py-1.5 px-2 text-center w-8">#</th>
                <th className="py-1.5 px-2 text-left">Hora</th>
                <th className="py-1.5 px-2 text-left">Tipo / Operación</th>
                <th className="py-1.5 px-2 text-left">Referencia / Op#</th>
                <th className="py-1.5 px-2 text-right">Monto</th>
                <th className="py-1.5 px-2 text-right">Comisión</th>
                <th className="py-1.5 px-2 text-center">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operations.map((op, idx) => (
                <tr key={op.id} className="page-break-inside-avoid">
                  <td className="py-1.5 px-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-1.5 px-2 text-slate-600 font-mono text-[10px]">
                    {new Date(op.operatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </td>
                  <td className="py-1.5 px-2 font-bold text-slate-900">
                    {op.category?.name || op.type}
                  </td>
                  <td className="py-1.5 px-2 text-slate-600 font-mono text-[10px]">
                    {op.reference || op.operationNumber || 'S/N'}
                  </td>
                  <td className={`py-1.5 px-2 text-right font-black ${
                    op.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {op.type === 'INGRESO' ? '+' : '-'}{formatCOP(op.amount)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-bold text-emerald-800">
                    +{formatCOP(op.fee || 0)}
                  </td>
                  <td className="py-1.5 px-2 text-center text-[10px] font-bold">
                    {op.voucher ? '✅ Registrado' : '⚠️ Sin Voucher'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Physical Cash Count Breakdown (If Available) */}
        {latestArqueo && latestArqueo.details && latestArqueo.details.length > 0 && (
          <div className="mb-6 page-break-inside-avoid">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2.5">
              4. Desglose de Billetes y Monedas (Arqueo Físico)
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {latestArqueo.details.map((d) => (
                <div key={d.denomination} className="p-2 border border-slate-200 rounded-lg flex justify-between text-xs">
                  <span className="font-semibold text-slate-600">{formatCOP(d.denomination)} x {d.quantity}</span>
                  <span className="font-bold text-slate-900">{formatCOP(d.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formal Signature Area & Audit Footer */}
        <div className="pt-8 mt-6 border-t-2 border-slate-300 page-break-inside-avoid">
          <div className="grid grid-cols-2 gap-16 mb-6">
            <div className="text-center">
              <div className="border-b border-slate-400 pb-12" />
              <p className="font-black text-xs text-slate-900 mt-2">Cajero / Operador Responsable</p>
              <p className="text-[10px] text-slate-500 font-mono">Nombre: {closing.user?.name || 'Daniel'}</p>
            </div>
            <div className="text-center">
              <div className="border-b border-slate-400 pb-12" />
              <p className="font-black text-xs text-slate-900 mt-2">Supervisor / Propietario</p>
              <p className="text-[10px] text-slate-500 font-mono">Firma y Sello de Aprobación</p>
            </div>
          </div>

          <div className="text-center border-t border-slate-100 pt-3">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">
              CORVIX • Software de Control Inteligente de Caja y Corresponsales Bancarios • Registro Inalterable
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
