/**
 * Smart QR parser for vouchers.
 * Does NOT invent data - only extracts what is present.
 */

export interface ParsedQRData {
  raw: string;
  operationNumber?: string;
  reference?: string;
  transactionId?: string;
  amount?: number;
  date?: string;
  time?: string;
  type?: string;
  status?: string;
  entity?: string;
  commerce?: string;
  authCode?: string;
  extra: Record<string, string>;
}

/**
 * Try to parse a QR string from common Colombian banking formats.
 * Returns only fields that are actually found in the QR.
 */
export function parseQRData(raw: string): ParsedQRData {
  const result: ParsedQRData = {
    raw,
    extra: {},
  };

  if (!raw || raw.trim() === "") return result;

  // Try JSON format
  try {
    const json = JSON.parse(raw);
    return extractFromJSON(json, raw);
  } catch {
    // Not JSON
  }

  // Try URL query params format
  if (raw.includes("=") && (raw.includes("&") || raw.includes("?"))) {
    try {
      const url = raw.startsWith("http") ? raw : `https://x.com/?${raw}`;
      const params = new URL(url).searchParams;
      return extractFromParams(params, raw);
    } catch {
      // Not URL params
    }
  }

  // Try pipe-separated or semicolon-separated
  if (raw.includes("|") || raw.includes(";")) {
    const separator = raw.includes("|") ? "|" : ";";
    const parts = raw.split(separator);
    return extractFromParts(parts, raw);
  }

  // Try key:value lines
  if (raw.includes("\n") || raw.includes(":")) {
    return extractFromKeyValue(raw);
  }

  // Plain string - try regex extraction
  return extractFromPlainText(raw);
}

function extractFromJSON(json: Record<string, unknown>, raw: string): ParsedQRData {
  const result: ParsedQRData = { raw, extra: {} };
  const knownFields: Record<string, (keyof ParsedQRData)[]> = {
    operacion: ["operationNumber"],
    operation: ["operationNumber"],
    numeroOperacion: ["operationNumber"],
    num_operacion: ["operationNumber"],
    referencia: ["reference"],
    reference: ["reference"],
    ref: ["reference"],
    transaccion: ["transactionId"],
    transaction: ["transactionId"],
    transactionId: ["transactionId"],
    id: ["transactionId"],
    valor: ["amount"],
    value: ["amount"],
    monto: ["amount"],
    amount: ["amount"],
    fecha: ["date"],
    date: ["date"],
    hora: ["time"],
    time: ["time"],
    tipo: ["type"],
    type: ["type"],
    estado: ["status"],
    status: ["status"],
    entidad: ["entity"],
    entity: ["entity"],
    banco: ["entity"],
    comercio: ["commerce"],
    commerce: ["commerce"],
    autorizacion: ["authCode"],
    auth: ["authCode"],
    authCode: ["authCode"],
    codigoAutorizacion: ["authCode"],
  };

  for (const [jsonKey, targets] of Object.entries(knownFields)) {
    const value = json[jsonKey] ?? json[jsonKey.toLowerCase()] ?? json[jsonKey.toUpperCase()];
    if (value !== undefined && value !== null) {
      const target = targets[0] as keyof ParsedQRData;
      if (target === "amount") {
        const numVal = parseFloat(String(value).replace(/[^0-9.]/g, ""));
        if (!isNaN(numVal)) result.amount = Math.round(numVal);
      } else if (target !== "extra" && target !== "raw") {
        (result as unknown as Record<string, unknown>)[target] = String(value);
      }
    }
  }

  // Store unrecognized fields in extra
  for (const [key, value] of Object.entries(json)) {
    const isKnown = Object.keys(knownFields).some(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    if (!isKnown && value !== null && value !== undefined) {
      result.extra[key] = String(value);
    }
  }

  return result;
}

function extractFromParams(params: URLSearchParams, raw: string): ParsedQRData {
  const json: Record<string, string> = {};
  params.forEach((value, key) => {
    json[key] = value;
  });
  return extractFromJSON(json as Record<string, unknown>, raw);
}

function extractFromParts(parts: string[], raw: string): ParsedQRData {
  const result: ParsedQRData = { raw, extra: {} };
  // Common order in Colombian banking QR: operation|reference|amount|date|time|status
  const amountPattern = /^\$?[\d.,]+$/;
  const datePattern = /^\d{2}[/-]\d{2}[/-]\d{4}$|^\d{4}-\d{2}-\d{2}$/;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (datePattern.test(part)) {
      if (!result.date) result.date = part;
    } else if (amountPattern.test(part)) {
      if (!result.amount) {
        const num = parseFloat(part.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) result.amount = Math.round(num);
      }
    } else if (part.length > 4 && /^[A-Z0-9]+$/i.test(part)) {
      if (!result.operationNumber) result.operationNumber = part;
      else if (!result.reference) result.reference = part;
      else result.extra[`campo${i}`] = part;
    } else {
      result.extra[`campo${i}`] = part;
    }
  }

  return result;
}

function extractFromKeyValue(raw: string): ParsedQRData {
  const result: ParsedQRData = { raw, extra: {} };
  const lines = raw.split(/[\n\r]+/);

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim().toLowerCase();
    const value = line.substring(colonIdx + 1).trim();
    if (!value) continue;

    if (key.includes("oper")) result.operationNumber = value;
    else if (key.includes("ref")) result.reference = value;
    else if (key.includes("trans")) result.transactionId = value;
    else if (key.includes("valor") || key.includes("monto") || key.includes("amount")) {
      const num = parseFloat(value.replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) result.amount = Math.round(num);
    } else if (key.includes("fecha") || key.includes("date")) result.date = value;
    else if (key.includes("hora") || key.includes("time")) result.time = value;
    else if (key.includes("tipo") || key.includes("type")) result.type = value;
    else if (key.includes("estado") || key.includes("status")) result.status = value;
    else if (key.includes("entidad") || key.includes("banco") || key.includes("entity")) result.entity = value;
    else if (key.includes("comercio") || key.includes("commerce")) result.commerce = value;
    else if (key.includes("auth") || key.includes("autori")) result.authCode = value;
    else result.extra[key] = value;
  }

  return result;
}

function extractFromPlainText(raw: string): ParsedQRData {
  const result: ParsedQRData = { raw, extra: {} };

  // Amount: look for $XX.XXX or XXXX patterns
  const amountMatch = raw.match(/\$\s*([\d.,]+)/);
  if (amountMatch) {
    const num = parseFloat(amountMatch[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(num)) result.amount = Math.round(num);
  }

  // Date: DD/MM/YYYY or YYYY-MM-DD
  const dateMatch = raw.match(/\d{2}[/-]\d{2}[/-]\d{4}|\d{4}-\d{2}-\d{2}/);
  if (dateMatch) result.date = dateMatch[0];

  // Time: HH:MM or HH:MM AM/PM
  const timeMatch = raw.match(/\d{1,2}:\d{2}(?:\s?[AaPp][Mm])?/);
  if (timeMatch) result.time = timeMatch[0];

  // Reference/operation number: alphanumeric 6+ chars
  const refMatches = raw.match(/\b[A-Z0-9]{6,20}\b/g);
  if (refMatches && refMatches.length > 0) {
    result.operationNumber = refMatches[0];
    if (refMatches.length > 1) result.reference = refMatches[1];
  }

  return result;
}

/**
 * Compare QR data with OCR data to detect discrepancies.
 */
export interface ComparisonResult {
  field: string;
  label: string;
  qrValue?: string;
  ocrValue?: string;
  match: boolean;
  status: "VALIDADO" | "DIFERENCIA" | "SOLO_QR" | "SOLO_OCR" | "NO_DISPONIBLE";
}

export function compareQROCR(
  qrData: ParsedQRData,
  ocrData: {
    amount?: number;
    date?: string;
    time?: string;
    reference?: string;
    operationNum?: string;
    status?: string;
    entity?: string;
    type?: string;
  }
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const comparisons: Array<{
    field: string;
    label: string;
    qrVal?: string | number;
    ocrVal?: string | number;
  }> = [
    { field: "amount", label: "Valor", qrVal: qrData.amount, ocrVal: ocrData.amount },
    { field: "date", label: "Fecha", qrVal: qrData.date, ocrVal: ocrData.date },
    { field: "time", label: "Hora", qrVal: qrData.time, ocrVal: ocrData.time },
    { field: "reference", label: "Referencia", qrVal: qrData.reference, ocrVal: ocrData.reference },
    { field: "operationNumber", label: "N° Operación", qrVal: qrData.operationNumber, ocrVal: ocrData.operationNum },
    { field: "status", label: "Estado", qrVal: qrData.status, ocrVal: ocrData.status },
    { field: "entity", label: "Entidad", qrVal: qrData.entity, ocrVal: ocrData.entity },
  ];

  for (const comp of comparisons) {
    const hasQR = comp.qrVal !== undefined && comp.qrVal !== null && comp.qrVal !== "";
    const hasOCR = comp.ocrVal !== undefined && comp.ocrVal !== null && comp.ocrVal !== "";

    if (!hasQR && !hasOCR) {
      results.push({
        field: comp.field,
        label: comp.label,
        match: true,
        status: "NO_DISPONIBLE",
      });
    } else if (hasQR && !hasOCR) {
      results.push({
        field: comp.field,
        label: comp.label,
        qrValue: String(comp.qrVal),
        match: true,
        status: "SOLO_QR",
      });
    } else if (!hasQR && hasOCR) {
      results.push({
        field: comp.field,
        label: comp.label,
        ocrValue: String(comp.ocrVal),
        match: true,
        status: "SOLO_OCR",
      });
    } else {
      const qrStr = String(comp.qrVal).trim().toLowerCase();
      const ocrStr = String(comp.ocrVal).trim().toLowerCase();
      const match = qrStr === ocrStr;
      results.push({
        field: comp.field,
        label: comp.label,
        qrValue: String(comp.qrVal),
        ocrValue: String(comp.ocrVal),
        match,
        status: match ? "VALIDADO" : "DIFERENCIA",
      });
    }
  }

  return results;
}
