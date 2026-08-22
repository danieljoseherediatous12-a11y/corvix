'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  formatCOP, parseCOP, calculateChange, calculateChangeBreakdown,
  calculateCommission, OFFICIAL_COMMISSION_BRACKETS
} from '@/lib/calculations';
import {
  ArrowLeft, Plus, Minus, DollarSign, Calculator,
  FileText, CheckCircle2, AlertCircle, ArrowRight,
  Sparkles, Hash, Building2, ChevronDown, Wallet, ShieldCheck,
  ArrowDownRight, ArrowUpRight, Coins, Percent, Info
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  type: 'INGRESO' | 'EGRESO';
  requiresVoucher: boolean;
  color?: string;
}

interface Denomination {
  id: string;
  value: number;
  label: string;
  type: string;
}

export default function NewOperationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form states
  const [opType, setOpType] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [categories, setCategories] = useState<Category[]>([]);
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [chargeFee, setChargeFee] = useState(true);
  const [fee, setFee] = useState<number>(0);
  const [isCustomFee, setIsCustomFee] = useState(false);
  const [reference, setReference] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [description, setDescription] = useState('');
  const [voucherData, setVoucherData] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.categories || []);
        setDenominations(data.denominations || []);
      })
      .catch((err) => console.error(err));

    const paramAmount = searchParams.get('amount');
    const paramRef = searchParams.get('ref');
    const paramOp = searchParams.get('op');
    const paramType = searchParams.get('type') as 'INGRESO' | 'EGRESO' | null;
    const paramVoucher = searchParams.get('voucherData');

    if (paramAmount) setAmount(paramAmount);
    if (paramRef) setReference(paramRef);
    if (paramOp) setOperationNumber(paramOp);
    if (paramType) setOpType(paramType);
    if (paramVoucher) setVoucherData(paramVoucher);
  }, [searchParams]);

  const filteredCategories = categories.filter((c) => c.type === opType);
  const amountValue = parseCOP(amount);
  const receivedValue = parseCOP(receivedAmount);

  // Auto-calculate official correspondent fee when amount changes
  useEffect(() => {
    if (opType === 'INGRESO' && chargeFee && !isCustomFee) {
      const calculated = calculateCommission(amountValue);
      setFee(calculated);
    } else if (!chargeFee || opType === 'EGRESO') {
      setFee(0);
    }
  }, [amountValue, opType, chargeFee, isCustomFee]);

  const effectiveFee = opType === 'INGRESO' && chargeFee ? fee : 0;
  const totalToPay = amountValue + effectiveFee;

  const changeResult = opType === 'INGRESO' && amountValue > 0 && receivedValue > 0
    ? calculateChange(amountValue, receivedValue, effectiveFee)
    : null;

  const changeBreakdown = changeResult && changeResult.status === 'CAMBIO'
    ? calculateChangeBreakdown(changeResult.change, denominations)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (amountValue <= 0) {
      setError('El valor de la operación debe ser mayor a cero');
      return;
    }

    if (opType === 'INGRESO' && receivedValue > 0 && receivedValue < totalToPay) {
      setError(`El dinero recibido (${formatCOP(receivedValue)}) es menor que el total a pagar (${formatCOP(totalToPay)})`);
      return;
    }

    setLoading(true);

    try {
      let parsedVoucherObj = undefined;
      if (voucherData) {
        try {
          parsedVoucherObj = JSON.parse(voucherData);
        } catch {}
      }

      const body = {
        type: opType,
        categoryId: categoryId || undefined,
        amount: amountValue,
        fee: effectiveFee,
        receivedAmount: receivedValue > 0 ? receivedValue : undefined,
        changeAmount: changeResult ? changeResult.change : undefined,
        reference: reference || undefined,
        operationNumber: operationNumber || undefined,
        description: description || undefined,
        voucherData: parsedVoucherObj,
      };

      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al registrar la operación');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1200);
    } catch {
      setError('Error de conexión con el servidor');
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-24 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nueva Operación</h1>
            <p className="text-xs text-slate-500 font-medium">Registro de transacción, comisiones y cálculo de cambio en tiempo real</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-3 shadow-2xs">
          <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
          <span>¡Operación y ganancia registradas exitosamente! Actualizando caja...</span>
        </div>
      )}

      {/* Main Form Formats */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Main Transaction Data */}
        <div className="lg:col-span-7 space-y-5">
          {/* Operation Type Switcher */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setOpType('INGRESO')}
              className={`py-3 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                opType === 'INGRESO'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight size={16} />
              <span>INGRESO (Depósito / Enviar / Pago)</span>
            </button>

            <button
              type="button"
              onClick={() => setOpType('EGRESO')}
              className={`py-3 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                opType === 'EGRESO'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight size={16} />
              <span>RETIRO / EGRESO (Salida de Efectivo)</span>
            </button>
          </div>

          {/* Amount & Category Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Categoría del Movimiento
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 focus:bg-white transition"
              >
                <option value="">Seleccionar categoría...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Valor de la Transacción ($ COP)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">$</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-3xl font-black text-right focus:outline-none focus:border-slate-900 focus:bg-white transition"
                  autoFocus
                />
              </div>
              {amountValue > 0 && (
                <p className="text-right text-xs text-slate-600 font-bold">
                  {formatCOP(amountValue)}
                </p>
              )}
            </div>

            {/* Official Correspondent Fee / Profit Section (Image Table Integration) */}
            {opType === 'INGRESO' && amountValue > 0 && (
              <div className="bg-linear-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200/90 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins size={18} className="text-emerald-700" />
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Tarifa de Corresponsal / Ganancia del Punto
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chargeFee}
                      onChange={(e) => setChargeFee(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Cobrar Tarifa</span>
                  </label>
                </div>

                {chargeFee && (
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-emerald-200/60">
                    <div className="space-y-0.5">
                      <div className="text-xl font-black text-emerald-800 flex items-center gap-1.5">
                        <span>+{formatCOP(effectiveFee)}</span>
                        <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                          Ganancia Neta
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700/90 font-medium">
                        Tabla oficial: {amountValue <= 500000 ? 'Hasta $500.000 ($1.000)' : amountValue <= 1000000 ? '$501k a $1M ($2.000)' : amountValue <= 1500000 ? '$1M a $1.5M ($3.000)' : amountValue <= 2000000 ? '$1.5M a $2M ($4.000)' : amountValue <= 2500000 ? '$2M a $2.5M ($5.000)' : 'Más de $2.5M ($6.000+)'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCustomFee(!isCustomFee)}
                      className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      {isCustomFee ? 'Usar Auto' : 'Modificar'}
                    </button>
                  </div>
                )}

                {isCustomFee && chargeFee && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      Monto de tarifa personalizado:
                    </label>
                    <input
                      type="number"
                      value={fee}
                      onChange={(e) => setFee(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-right"
                    />
                  </div>
                )}

                {chargeFee && (
                  <div className="bg-emerald-100/70 rounded-xl p-2.5 flex items-center justify-between text-xs font-black text-emerald-950">
                    <span>Total a Cobrar al Cliente:</span>
                    <span className="text-base text-emerald-900">{formatCOP(totalToPay)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reference & Audit Data Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText size={16} className="text-slate-400" />
              Datos de Referencia y Auditoría
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Número de Operación
                </label>
                <input
                  type="text"
                  value={operationNumber}
                  onChange={(e) => setOperationNumber(e.target.value)}
                  placeholder="Ej: 004859"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Número de Referencia
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ej: 3001234567"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase">
                Descripción u Observaciones (Opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Notas adicionales de la transacción..."
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-slate-900 focus:bg-white transition"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column (5 Cols): POS Cash & Change Calculator */}
        <div className="lg:col-span-5 space-y-5">
          {opType === 'INGRESO' ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-slate-500" />
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    Calculadora de Cambio
                  </h3>
                </div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  Auto-Desglose
                </span>
              </div>

              {/* Received Cash Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Efectivo Recibido del Cliente
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">$</span>
                  <input
                    type="text"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-3xl font-black text-right focus:outline-none focus:border-slate-900 focus:bg-white transition"
                  />
                </div>
                {receivedValue > 0 && (
                  <p className="text-right text-xs text-slate-600 font-bold">
                    {formatCOP(receivedValue)}
                  </p>
                )}
              </div>

              {/* Change Output Screen */}
              {changeResult && (
                <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-inner space-y-3 animate-fade-in-up">
                  <div className="text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {changeResult.status === 'EXACTO'
                        ? 'PAGO EXACTO'
                        : changeResult.status === 'CAMBIO'
                        ? 'CAMBIO A ENTREGAR'
                        : 'DINERO INSUFICIENTE'}
                    </span>
                    <div className={`text-3xl font-black mt-1 ${
                      changeResult.status === 'CAMBIO'
                        ? 'text-emerald-400'
                        : changeResult.status === 'EXACTO'
                        ? 'text-white'
                        : 'text-rose-400'
                    }`}>
                      {changeResult.status === 'INSUFICIENTE'
                        ? `- ${formatCOP(changeResult.missing || 0)}`
                        : formatCOP(changeResult.change)}
                    </div>
                  </div>

                  {/* Bill Breakdown */}
                  {changeBreakdown.length > 0 && (
                    <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Desglose sugerido de billetes:</div>
                      {changeBreakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 text-slate-300">
                          <span>{item.label} × {item.quantity}</span>
                          <span className="font-mono font-bold text-white">{formatCOP(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Wallet size={18} className="text-rose-600" />
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  Entrega de Efectivo (Retiro)
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Esta transacción entregará <strong>{formatCOP(amountValue)}</strong> del efectivo físico de la caja al cliente.
              </p>
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold">
                Asegúrate de verificar la identidad del cliente y solicitar su firma en el comprobante físico si aplica.
              </div>
            </div>
          )}

          {/* Submit Action Card */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || amountValue <= 0}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4.5 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                'Registrando operación...'
              ) : (
                <>
                  <span>Confirmar y Guardar Operación</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <Link
              href="/"
              className="block text-center text-xs font-bold text-slate-500 hover:text-slate-800 py-2 transition"
            >
              Cancelar y Volver al Registro
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
