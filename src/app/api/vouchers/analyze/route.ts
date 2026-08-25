import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface VoucherAnalysisResult {
  amount?: number;
  entity?: string;
  type?: "INGRESO" | "EGRESO";
  categoryName?: string;
  operationNumber?: string;
  reference?: string;
  authCode?: string;
  date?: string;
  time?: string;
  status?: string;
  rawText?: string;
  engine: "AI_VISION_GROQ" | "AI_VISION_GEMINI" | "AI_VISION" | "HEURISTIC_OCR";
  confidence: number;
}

// Clean and parse numbers with Colombian currency format (1.000.000 or 1,000,000 or 1000000)
function parseColombianAmount(text: string): number | undefined {
  if (!text) return undefined;
  // Remove currency symbols and spaces
  let clean = text.replace(/[$\s]/g, "");
  // Handle format 1.000.000 -> 1000000 (period as thousands separator)
  // vs 1000,50 -> 1000.50 (comma as decimal - not used in COP)
  // In COP there are no cents, so periods are always thousands separators
  clean = clean.replace(/\./g, "").replace(/,/g, "");
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num >= 1000 && num < 500000000) {
    return num;
  }
  return undefined;
}

// Words that are NEVER operation numbers
const EXCLUDED_WORDS = new Set([
  "BANCOLOMBIA","SANCOLOMBIA","CORRESPONSAL","ORRESPONSA","PAGAPAGTI",
  "REDEBAN","CREDIBANCO","CLIENTE","DUPLICADO","ORIGINAL","COMPROBANTE",
  "APROBACION","AUTORIZACION","NUMERO","EFECTY","DAVIPLATA","NEQUI","DEBE",
  "HABER","CARGO","ABONO","DEBIT","CREDIT","SALDO","FECHA","HORA","RECIBO",
  "TRANSACCION","VOUCHER","PAGARE","APLICA","FIRMA","TARJETA","PRODUCTO",
  "PAGAPAG","PAGA","RECAUD"
]);

// Words and labels that are NOT amounts
const NON_AMOUNT_LINE_PATTERN = /(?:RECIBO|APRO|RRN|CONVENIO|C\.?UNICO|TER|TEL|NIT|FECHA|HORA|AUT|REF|REFERENCIA|CUENTA|CELULAR|DOCUMENTO)/i;

// High-precision regex heuristic parser for Colombian vouchers
export function parseColombianVoucherText(rawText: string): VoucherAnalysisResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = rawText.toUpperCase();

  const result: VoucherAnalysisResult = {
    engine: "HEURISTIC_OCR",
    confidence: 0.90,
    rawText,
  };

  // 1. Detect Bank / Entity (Redeban/Credibanco is the NETWORK, not the bank)
  if (fullText.includes("BANCOLOMBIA") || fullText.includes("SANCOLOMBIA") || fullText.includes("CORRESPONSAL BANCOLOMBIA") || fullText.includes("PAGAFACIL")) {
    result.entity = "BANCOLOMBIA";
  } else if (fullText.includes("NEQUI")) {
    result.entity = "NEQUI";
  } else if (fullText.includes("DAVIPLATA")) {
    result.entity = "DAVIPLATA";
  } else if (fullText.includes("DAVIVIENDA")) {
    result.entity = "DAVIVIENDA";
  } else if (fullText.includes("EFECTY")) {
    result.entity = "EFECTY";
  } else if (fullText.includes("BBVA")) {
    result.entity = "BBVA";
  } else if (fullText.includes("BANCO AGRARIO") || fullText.includes("AGRARIO")) {
    result.entity = "BANCO AGRARIO";
  } else if (fullText.includes("BANCO DE BOGOTA") || fullText.includes("BOGOTA")) {
    result.entity = "BANCO DE BOGOTÁ";
  } else if (fullText.includes("SUPERGIROS") || fullText.includes("SURED")) {
    result.entity = "SUPERGIROS";
  } else if (fullText.includes("REDEBAN") || fullText.includes("RBM") || fullText.includes("CREDIBANCO")) {
    if (fullText.includes("BANCOLOMBIA")) result.entity = "BANCOLOMBIA";
    else result.entity = "REDEBAN / CREDIBANCO";
  } else if (fullText.includes("MOVII") || fullText.includes("DALE")) {
    result.entity = "BILLETERA DIGITAL";
  }

  // 2. Detect Operation Type & Category
  if (
    fullText.includes("RETIRO") ||
    fullText.includes("ENTREGA") ||
    fullText.includes("SUBSIDIO") ||
    fullText.includes("PAGO GIRO") ||
    fullText.includes("SALIDA")
  ) {
    result.type = "EGRESO";
    result.categoryName = "Retiro";
  } else if (
    fullText.includes("RECAUDO") ||
    fullText.includes("PAGO SERVICIO") ||
    fullText.includes("FACTURA") ||
    fullText.includes("CONVENIO")
  ) {
    result.type = "INGRESO";
    result.categoryName = "Recaudo";
  } else if (
    fullText.includes("CONSIGNACION") ||
    fullText.includes("CONSIGNACIÓN") ||
    fullText.includes("DEPOSITO") ||
    fullText.includes("DEPÓSITO")
  ) {
    result.type = "INGRESO";
    result.categoryName = "Consignación";
  } else if (fullText.includes("RECARGA")) {
    result.type = "INGRESO";
    result.categoryName = "Recarga";
  } else {
    result.type = "INGRESO";
  }

  // 3. Detect Operation Number / Comprobante / Aprobación
  // Check in order of specificity for Redeban / Bancolombia / Credibanco
  const reciboMatch = rawText.match(/RECIBO\s*[:#.]*\s*([0-9]{3,12})/i);
  const aproMatch = rawText.match(/APRO(?:BACION|B)?\s*[:#.]*\s*([0-9]{3,12})/i);
  const rrnMatch = rawText.match(/RRN\s*[:#.]*\s*([0-9]{3,12})/i);
  const compMatch = rawText.match(/(?:COMPROBANTE|AUTORIZACION|AUT\.?|OP\.?|TRANSACCION|NRO\.?)\s*[:#.]*\s*([0-9]{3,12})/i);

  if (reciboMatch && reciboMatch[1]) {
    result.operationNumber = reciboMatch[1].trim();
  } else if (aproMatch && aproMatch[1]) {
    result.operationNumber = aproMatch[1].trim();
  } else if (rrnMatch && rrnMatch[1]) {
    result.operationNumber = rrnMatch[1].trim();
  } else if (compMatch && compMatch[1]) {
    result.operationNumber = compMatch[1].trim();
  }

  // 4. Detect Reference Number (CONVENIO, REF, CUENTA, PIN, CELULAR, DOCUMENTO)
  const convenioMatch = rawText.match(/CONVENIO\s*[:#.]*\s*([0-9]{4,25})/i);
  const refMatch = rawText.match(/(?:REF|REFERENCIA)\s*[:#.]*\s*([0-9]{4,25})/i);
  const cuentaMatch = rawText.match(/(?:CUENTA|CELULAR|DOCUMENTO|PIN)\s*[:#.]*\s*([0-9]{4,25})/i);

  if (convenioMatch && convenioMatch[1]) {
    result.reference = convenioMatch[1].trim();
  } else if (refMatch && refMatch[1]) {
    // If ref is a long zero-padded string like 000000000000000077032, trim leading zeroes or keep
    const cleanRef = refMatch[1].replace(/^0+/, "") || refMatch[1];
    result.reference = cleanRef;
  } else if (cuentaMatch && cuentaMatch[1]) {
    result.reference = cuentaMatch[1].trim();
  }

  // 5. Detect Amount — Strictly from VALOR / TOTAL / PAGADO lines or explicit currency symbols
  let extractedAmount: number | undefined;

  // Strategy A: Lines containing "VALOR", "TOTAL", "PAGADO", "MONTO"
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.includes("VALOR") || upper.includes("TOTAL") || upper.includes("PAGADO") || upper.includes("MONTO")) {
      // Avoid legal text like "NO DEBE COBRARTE"
      if (upper.includes("NO DEBE") || upper.includes("RESPONSABLE")) continue;

      // Extract after VALOR / TOTAL
      // Remove spaces between digits and dots: "3 . 000 . 000" -> "3.000.000"
      const normalizedLine = line.replace(/(\d)\s*([.,])\s*(\d)/g, "$1$2$3");
      const match = normalizedLine.match(/(?:\$|COP|:\s*)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})/);
      if (match) {
        const parsed = parseColombianAmount(match[1]);
        if (parsed && parsed >= 1000) {
          extractedAmount = parsed;
          break;
        }
      }
    }
  }

  // Strategy B: Lines with $ that are NOT metadata lines (APRO, RECIBO, etc.)
  if (!extractedAmount) {
    for (const line of lines) {
      if (NON_AMOUNT_LINE_PATTERN.test(line)) continue;
      const normalizedLine = line.replace(/(\d)\s*([.,])\s*(\d)/g, "$1$2$3");
      const match = normalizedLine.match(/\$\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{5,9})/);
      if (match) {
        const parsed = parseColombianAmount(match[1]);
        if (parsed && parsed >= 1000) {
          extractedAmount = parsed;
          break;
        }
      }
    }
  }

  // Strategy C: Any dotted number (e.g. 3.000.000 or 50.000) in non-metadata lines
  if (!extractedAmount) {
    for (const line of lines) {
      if (NON_AMOUNT_LINE_PATTERN.test(line)) continue;
      const dottedMatches = line.match(/\b([0-9]{1,3}(?:\.[0-9]{3})+)\b/g);
      if (dottedMatches) {
        for (const m of dottedMatches) {
          const parsed = parseColombianAmount(m);
          if (parsed && parsed >= 1000) {
            extractedAmount = parsed;
            break;
          }
        }
      }
      if (extractedAmount) break;
    }
  }

  if (extractedAmount) {
    result.amount = extractedAmount;
  }

  // 6. Detect Date and Time
  const dateMatch = rawText.match(/(\d{2}[/-]\d{2}[/-]\d{2,4}|\d{4}[/-]\d{2}[/-]\d{2}|[A-Z]{3}\s+\d{1,2}\s+\d{4})/i);
  if (dateMatch) result.date = dateMatch[1];

  const timeMatch = rawText.match(/(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)/);
  if (timeMatch) result.time = timeMatch[1];

  // 7. Status
  if (/EXITOSA|APROBADA|APROBADO|EXITOSO|COMPLETADA/i.test(fullText)) {
    result.status = "EXITOSA";
  } else if (/RECHAZADA|FALLIDA|CANCELADA|ERROR/i.test(fullText)) {
    result.status = "RECHAZADA";
  } else {
    result.status = "EXITOSA";
  }

  return result;
}

// Sanitize and fix the AI result — especially the amount field
function sanitizeAIResult(raw: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...raw };

  // Fix amount: AI sometimes returns "3.000.000", "3,000,000", "$3.000.000", 3000.0, etc.
  if (sanitized.amount !== undefined && sanitized.amount !== null) {
    let amtStr = String(sanitized.amount);
    // Remove $ sign and spaces
    amtStr = amtStr.replace(/[$\s]/g, "");

    // If it looks like a Colombian formatted number with dots (e.g. "3.000.000")
    // count the dots — if multiple dots, they are thousands separators
    const dotCount = (amtStr.match(/\./g) || []).length;
    const commaCount = (amtStr.match(/,/g) || []).length;

    if (dotCount > 1) {
      // Multiple dots = thousands separators → remove all dots
      amtStr = amtStr.replace(/\./g, "");
    } else if (dotCount === 1 && commaCount === 0) {
      // Single dot — could be decimal OR thousands separator
      const parts = amtStr.split(".");
      if (parts[1] && parts[1].length === 3) {
        // e.g. "3.000" → thousands separator → remove dot
        amtStr = amtStr.replace(".", "");
      } else {
        // e.g. "3000.50" → decimal → take integer part
        amtStr = parts[0];
      }
    } else if (commaCount >= 1) {
      // Comma as decimal separator (European) e.g. "3.000,00" or "3000,00"
      amtStr = amtStr.replace(/\./g, "").split(",")[0];
    }

    const parsed = parseInt(amtStr.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 1000 && parsed < 500_000_000) {
      sanitized.amount = parsed;
    } else if (!isNaN(parsed) && parsed > 0 && parsed < 1000) {
      // Suspiciously small — could be misread thousands (e.g. AI returned 3296 for $3.000.000)
      // If rawText hint available, keep as 0 so user fills it manually
      sanitized.amount = 0;
    }
  }

  // Ensure operationNumber is clean digits only
  if (sanitized.operationNumber) {
    const opStr = String(sanitized.operationNumber).trim();
    // Remove if it contains bank name words
    const badWords = ["BANCOLOMBIA", "CORRESPONSAL", "REDEBAN", "CREDIBANCO", "SANCOLOMBIA", "CLIENTE", "DEBE"];
    if (badWords.some((w) => opStr.toUpperCase().includes(w))) {
      sanitized.operationNumber = null;
    }
  }

  return sanitized;
}

// POST /api/vouchers/analyze - High-precision AI Vision & Heuristic OCR Analysis
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { imageBase64, rawText } = body;

    if (!imageBase64 && !rawText) {
      return NextResponse.json({ error: "Se requiere imagen o texto OCR" }, { status: 400 });
    }

    const prompt = `Eres un experto en vouchers de corresponsal bancario colombiano. Analiza la imagen del comprobante y extrae los datos exactos.

REGLAS IMPORTANTES PARA COLOMBIA:
- Los números usan PUNTO como separador de miles: 3.000.000 = tres millones, 50.000 = cincuenta mil
- El campo "amount" debe ser un ENTERO SIN PUNTOS NI COMAS: 3000000 para tres millones, 50000 para cincuenta mil
- El monto está usualmente en la línea que dice "VALOR" o "TOTAL"
- El número de comprobante/aprobación son solo dígitos cortos (4-10 digitos), NO incluyas el nombre del banco

Responde SOLO con JSON válido, sin explicaciones:
{
  "entity": "nombre del banco o red: Bancolombia, Nequi, Daviplata, Davivienda, Efecty, Redeban, etc.",
  "type": "INGRESO para depósito/consignación/recaudo/pago, EGRESO para retiro/entrega",
  "categoryName": "Recaudo | Consignación | Retiro | Pago factura | Recarga",
  "amount": NUMERO_ENTERO_SIN_PUNTOS (ejemplo: si ves $3.000.000 escribe 3000000, si ves $50.000 escribe 50000),
  "operationNumber": "solo los digitos del número de comprobante o aprobación (sin palabras)",
  "reference": "numero de referencia, convenio, cuenta o celular (solo digitos)",
  "date": "YYYY-MM-DD o null",
  "time": "HH:MM o null",
  "status": "EXITOSA o RECHAZADA"
}`;

    // === LAYER 1: GEMINI VISION (Google AI Studio) - 100% Precision Vision ===
    const geminiKeySetting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || geminiKeySetting?.value;

    if (geminiApiKey && (imageBase64 || rawText)) {
      try {
        const parts: Array<Record<string, unknown>> = [{ text: prompt }];

        if (imageBase64) {
          const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
          const mimeMatch = imageBase64.match(/^data:(image\/[a-z]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
          parts.push({ inlineData: { mimeType, data: cleanBase64 } });
        } else if (rawText) {
          parts.push({ text: `Texto extraído del comprobante:\n${rawText}` });
        }

        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsedJson = sanitizeAIResult(JSON.parse(candidateText));
            // Calculate dynamic confidence score based on valid fields
            let fieldScore = 0.5;
            if (Number(parsedJson.amount) > 0) fieldScore += 0.25;
            if (parsedJson.operationNumber && parsedJson.operationNumber !== "NO DISPONIBLE") fieldScore += 0.15;
            if (parsedJson.entity && parsedJson.entity !== "NO DISPONIBLE") fieldScore += 0.09;

            return NextResponse.json({
              result: { ...parsedJson, engine: "AI_VISION_GEMINI", confidence: Math.min(0.99, fieldScore) },
            });
          }
        } else {
          console.warn("Gemini Vision error:", await aiResponse.text());
        }
      } catch (aiErr) {
        console.warn("Gemini Vision fallback to Groq / Heuristic OCR:", aiErr);
      }
    }

    // === LAYER 2: GROQ AI (Llama 3.3 70B / Meta) ===
    const groqKeySetting = await prisma.setting.findUnique({ where: { key: "GROQ_API_KEY" } });
    const groqApiKey = process.env.GROQ_API_KEY || groqKeySetting?.value;

    if (groqApiKey && rawText) {
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "user",
                content: `${prompt}\n\nTexto OCR del comprobante:\n${rawText}`,
              },
            ],
            temperature: 0.1,
            max_tokens: 512,
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const content = groqData?.choices?.[0]?.message?.content;
          if (content) {
            // Find JSON inside markdown or raw string
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsedJson = sanitizeAIResult(JSON.parse(jsonMatch[0]));
              let fieldScore = 0.5;
              if (Number(parsedJson.amount) > 0) fieldScore += 0.25;
              if (parsedJson.operationNumber && parsedJson.operationNumber !== "NO DISPONIBLE") fieldScore += 0.15;
              if (parsedJson.entity && parsedJson.entity !== "NO DISPONIBLE") fieldScore += 0.05;

              return NextResponse.json({
                result: { ...parsedJson, engine: "AI_VISION_GROQ", confidence: Math.min(0.95, fieldScore) },
              });
            }
          }
        }
      } catch (groqErr) {
        console.warn("Groq fallback to Heuristic OCR:", groqErr);
      }
    }

    // === LAYER 3: Colombian Heuristic OCR (Always available, no API needed) ===
    const heuristicResult = parseColombianVoucherText(rawText || "");
    return NextResponse.json({ result: heuristicResult });
  } catch (error) {
    console.error("Voucher analysis error:", error);
    return NextResponse.json({ error: "Error analizando comprobante" }, { status: 500 });
  }
}
