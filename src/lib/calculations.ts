/**
 * Centralized financial calculations for the correspondent cash management system.
 * Uses integer arithmetic (COP has no cents) to avoid floating point errors.
 */

// =====================================================
// FORMATTING
// =====================================================
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function parseCOP(value: string): number {
  const cleaned = value.replace(/[$\s.]/g, "").replace(/,/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

// =====================================================
// OFFICIAL COMMISSION & PROFIT BRACKETS (CORVIX)
// =====================================================
export interface CommissionBracket {
  min: number;
  max: number;
  fee: number;
  label: string;
}

/**
 * Tabla oficial de ganancias por consignaciones y recargas:
 * Menos de $500.000               -> $1.000
 * DE $500.000 A $999.999           -> $2.000  (ej: 500.000 paga 2.000)
 * DE $1.000.000 A $1.499.999       -> $3.000  (ej: 1.000.000 paga 3.000)
 * DE $1.500.000 A $1.999.999       -> $4.000  (ej: 1.500.000 paga 4.000)
 * DE $2.000.000 A $2.499.999       -> $5.000  (ej: 2.000.000 paga 5.000)
 * DE $2.500.000 A $2.999.999       -> $6.000  (ej: 2.500.000 paga 6.000)
 * DE $3.000.000 en adelante        -> +$1.000 por cada $500.000 adicionales
 */
export const OFFICIAL_COMMISSION_BRACKETS: CommissionBracket[] = [
  { min: 1, max: 499999, fee: 1000, label: "Hasta $499.999" },
  { min: 500000, max: 999999, fee: 2000, label: "De $500.000 a $999.999" },
  { min: 1000000, max: 1499999, fee: 3000, label: "De $1.000.000 a $1.499.999" },
  { min: 1500000, max: 1999999, fee: 4000, label: "De $1.500.000 a $1.999.999" },
  { min: 2000000, max: 2499999, fee: 5000, label: "De $2.000.000 a $2.499.999" },
  { min: 2500000, max: 2999999, fee: 6000, label: "De $2.500.000 a $2.999.999" },
];

/**
 * Calcula automáticamente la comisión/ganancia del corresponsal según el monto exacto
 */
export function calculateCommission(amount: number): number {
  if (amount <= 0) return 0;

  for (const bracket of OFFICIAL_COMMISSION_BRACKETS) {
    if (amount >= bracket.min && amount <= bracket.max) {
      return bracket.fee;
    }
  }

  // A partir de $3.000.000: escala +$1.000 por cada tramo de $500.000
  if (amount >= 3000000) {
    const extraBlocks = Math.floor((amount - 2500000) / 500000);
    return 5000 + extraBlocks * 1000;
  }

  return 1000;
}

// =====================================================
// CORE CALCULATIONS
// =====================================================

/**
 * Calculate the expected cash balance.
 * SALDO_ESPERADO = efectivoInicial + Σ(netCashFlow por operación)
 */
export function calculateExpectedCash(
  initialCash: number,
  operations: Array<{ netCashFlow: number }>
): number {
  const totalNetFlow = operations.reduce((sum, op) => sum + op.netCashFlow, 0);
  return initialCash + totalNetFlow;
}

/**
 * Calculate change to return to client.
 * Total a pagar por el cliente = operationAmount + fee
 * CAMBIO = dineroRecibido - (operationAmount + fee)
 */
export function calculateChange(
  operationAmount: number,
  receivedAmount: number,
  fee: number = 0
): {
  totalToPay: number;
  change: number;
  status: "EXACTO" | "CAMBIO" | "INSUFICIENTE";
  missing?: number;
} {
  const totalToPay = operationAmount + fee;
  const change = receivedAmount - totalToPay;
  if (change === 0) return { totalToPay, change: 0, status: "EXACTO" };
  if (change > 0) return { totalToPay, change, status: "CAMBIO" };
  return { totalToPay, change: 0, status: "INSUFICIENTE", missing: Math.abs(change) };
}

/**
 * Calculate net cash flow for an operation.
 * Para un INGRESO (consignación/recarga): Entra a caja (amount + fee).
 * Si el cliente dio efectivo exacto o billetes mayores y se le devolvió cambio:
 *   netCashFlow = receivedAmount - changeAmount (= amount + fee).
 * Para un EGRESO (retiro): Sale de caja amount.
 */
export function calculateNetCashFlow(
  type: "INGRESO" | "EGRESO",
  amount: number,
  fee: number = 0,
  receivedAmount?: number,
  changeAmount?: number
): number {
  if (type === "INGRESO") {
    if (receivedAmount !== undefined && changeAmount !== undefined) {
      return receivedAmount - changeAmount;
    }
    return amount + fee;
  }
  // Para retiros
  return -amount;
}

/**
 * Calculate total income from operations.
 */
export function calculateTotalIncome(
  operations: Array<{ type: string; netCashFlow: number }>
): number {
  return operations
    .filter((op) => op.type === "INGRESO")
    .reduce((sum, op) => sum + op.netCashFlow, 0);
}

/**
 * Calculate total expense from operations.
 */
export function calculateTotalExpense(
  operations: Array<{ type: string; netCashFlow: number }>
): number {
  return operations
    .filter((op) => op.type === "EGRESO")
    .reduce((sum, op) => sum + Math.abs(op.netCashFlow), 0);
}

/**
 * Calculate total fees / commissions (Ganancias del corresponsal)
 */
export function calculateTotalFees(
  operations: Array<{ fee?: number | null; status?: string }>
): number {
  return operations
    .filter((op) => op.status !== "CANCELADA")
    .reduce((sum, op) => sum + (op.fee || 0), 0);
}

/**
 * Calculate cash difference.
 * DIFERENCIA = efectivoContado - saldoEsperado
 */
export function calculateDifference(
  countedCash: number,
  expectedCash: number
): {
  difference: number;
  status: "CUADRADO" | "SOBRANTE" | "FALTANTE";
} {
  const diff = countedCash - expectedCash;
  if (diff === 0) return { difference: 0, status: "CUADRADO" };
  if (diff > 0) return { difference: diff, status: "SOBRANTE" };
  return { difference: diff, status: "FALTANTE" };
}

// =====================================================
// CHANGE BREAKDOWN
// =====================================================
export interface DenominationBreakdown {
  denomination: number;
  label: string;
  quantity: number;
  subtotal: number;
}

export function calculateChangeBreakdown(
  changeAmount: number,
  denominations: Array<{ value: number; label: string }>
): DenominationBreakdown[] {
  const sorted = [...denominations].sort((a, b) => b.value - a.value);
  const result: DenominationBreakdown[] = [];
  let remaining = changeAmount;

  for (const denom of sorted) {
    if (remaining <= 0) break;
    const quantity = Math.floor(remaining / denom.value);
    if (quantity > 0) {
      result.push({
        denomination: denom.value,
        label: denom.label,
        quantity,
        subtotal: denom.value * quantity,
      });
      remaining -= denom.value * quantity;
    }
  }

  return result;
}

export function calculateCountTotal(
  details: Array<{ denomination: number; quantity: number }>
): number {
  return details.reduce((sum, d) => sum + d.denomination * d.quantity, 0);
}

// =====================================================
// DATE HELPERS
// =====================================================
export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}
