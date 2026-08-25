'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatCOP, formatDateTime } from '@/lib/calculations';
import {
  FileText, Search, Camera, QrCode, CheckCircle2, AlertTriangle,
  Clock, Eye, Image as ImageIcon, Sparkles, Filter, Receipt, RefreshCw
} from 'lucide-react';

interface Voucher {
  id: string;
  operationId: string;
  status: string;
  qrRaw?: string;
  qrOperationNum?: string;
  qrReference?: string;
  qrTransactionId?: string;
  qrAmount?: number;
  qrDate?: string;
  qrTime?: string;
  qrType?: string;
  qrStatus?: string;
  qrEntity?: string;
  qrCommerce?: string;
  qrAuthCode?: string;
  qrScanned: boolean;
  ocrText?: string;
  ocrAmount?: number;
  ocrDate?: string;
  ocrTime?: string;
  ocrReference?: string;
  ocrOperationNum?: string;
  ocrStatus?: string;
  ocrEntity?: string;
  ocrCompleted: boolean;
  imageUrl?: string;
  createdAt: string;
  operation: {
    id: string;
    type: 'INGRESO' | 'EGRESO';
    amount: number;
    receivedAmount?: number;
    changeAmount?: number;
    reference?: string;
    operationNumber?: string;
    operatedAt: string;
    category?: { name: string };
    user: { name: string };
  };
}

export default function VouchersPage() {
  const { data: session } = useSession();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      let url = '/api/vouchers?limit=100';
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;
      const res = await fetch(url);
      const data = await res.json();
      setVouchers(data.vouchers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, [filterStatus]);

  const filtered = vouchers.filter((v) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (v.qrReference && v.qrReference.toLowerCase().includes(term)) ||
      (v.qrOperationNum && v.qrOperationNum.toLowerCase().includes(term)) ||
      (v.operation?.reference && v.operation.reference.toLowerCase().includes(term)) ||
      (v.operation?.operationNumber && v.operation.operationNumber.toLowerCase().includes(term)) ||
      (v.qrEntity && v.qrEntity.toLowerCase().includes(term)) ||
      v.operation?.amount.toString().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REGISTRADO':
        return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md">Registrado</span>;
      case 'PENDIENTE':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md">Pendiente</span>;
      case 'FALTA':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md">Falta Voucher</span>;
      case 'REVISADO':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md">Revisado</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{status}</span>;
    }
  };

  return (
    <div className="w-full space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Comprobantes y Vouchers</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro y auditoría de comprobantes escaneados, códigos QR y capturas
          </p>
        </div>
        <button
          onClick={fetchVouchers}
          className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-3 shadow-2xs">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por referencia, n° de operación, entidad..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {['ALL', 'REGISTRADO', 'PENDIENTE', 'REVISADO', 'FALTA'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Todos los Vouchers' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Vouchers Responsive Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400 shadow-2xs">
          <Receipt size={44} className="mx-auto mb-2 opacity-30" />
          <p className="text-xs font-semibold text-slate-500">No hay comprobantes para mostrar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((voucher) => {
            const op = voucher.operation;
            return (
              <div
                key={voucher.id}
                onClick={() => setSelectedVoucher(voucher)}
                className="bg-white rounded-3xl border border-slate-200/90 p-5 hover:border-slate-300 hover:shadow-md cursor-pointer transition-all space-y-4 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">
                      Op #{voucher.qrOperationNum || op?.operationNumber || op?.reference || 'S/N'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(op?.operatedAt || voucher.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      {op?.category?.name && ` • ${op.category.name}`}
                    </div>
                  </div>
                  {getStatusBadge(voucher.status)}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="text-xl font-black text-slate-900">
                    {formatCOP(op?.amount || voucher.qrAmount || 0)}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    {voucher.qrScanned && <span className="bg-slate-100 px-2 py-0.5 rounded">QR</span>}
                    {voucher.ocrCompleted && <span className="bg-slate-100 px-2 py-0.5 rounded">OCR</span>}
                    {voucher.imageUrl && <span className="bg-slate-100 px-2 py-0.5 rounded">Foto</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in-up">
            {/* Image Preview if available */}
            {selectedVoucher.imageUrl && (
              <div className="space-y-1.5 pt-2">
                <span className="text-slate-500 font-bold text-[11px] flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-emerald-600" />
                  Foto / Captura del Voucher:
                </span>
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-h-64 flex items-center justify-center">
                  <img
                    src={selectedVoucher.imageUrl}
                    alt="Foto del comprobante"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full max-h-64 object-contain"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Valor de la Transacción:</span>
                <span className="font-black text-slate-900 text-sm">{formatCOP(selectedVoucher.operation?.amount || 0)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">N° de Operación:</span>
                <span className="font-bold font-mono">{selectedVoucher.qrOperationNum || selectedVoucher.ocrOperationNum || selectedVoucher.operation?.operationNumber || 'No disponible'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Referencia:</span>
                <span className="font-bold font-mono">{selectedVoucher.qrReference || selectedVoucher.ocrReference || selectedVoucher.operation?.reference || 'No disponible'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Entidad / Banco:</span>
                <span className="font-bold">{selectedVoucher.qrEntity || selectedVoucher.ocrEntity || 'No disponible'}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedVoucher(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-xs transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
