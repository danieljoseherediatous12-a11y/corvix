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

// High-precision regex heuristic parser for Colombian vouchers
export function parseColombianVoucherText(rawText: string): VoucherAnalysisResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = rawText.toUpperCase();

  const result: VoucherAnalysisResult = {
    engine: "HEURISTIC_OCR",
    confidence: 0.80,
    rawText,
  };

  // 1. Detect Bank / Entity (Redeban/Credibanco is the NETWORK, not the bank)
  if (fullText.includes("BANCOLOMBIA") || fullText.includes("SANCOLOMBIA") || fullText.includes("CORRESPONSAL")) {
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
    // Redeban/Credibanco is the card network — detect underlying bank if visible
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

  // 3. Detect Amount — Multi-strategy approach
  let extractedAmount: number | undefined;

  // Strategy A: Look for labeled amount lines (VALOR, TOTAL, PAGADO, MONTO, etc.)
  const amountKeywords = /^(VALOR|TOTAL|MONTO|IMPORTE|PAGADO|EFECTIVO|PAGO|RECAUDO|COBRO|PRECIO)[\s:$]*/i;
  for (const line of lines) {
    if (amountKeywords.test(line)) {
      // Extract the number from this line
      const nums = line.match(/([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{5,9})/g);
      if (nums) {
        for (const n of nums) {
          const parsed = parseColombianAmount(n);
          if (parsed && parsed >= 1000) {
            extractedAmount = parsed;
            break;
          }
        }
      }
      if (extractedAmount) break;
    }
  }

  // Strategy B: Find $ followed by a number on its own line or after label
  if (!extractedAmount) {
    for (const line of lines) {
      const match = line.match(/\$\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{5,9})/);
      if (match) {
        const parsed = parseColombianAmount(match[1]);
        if (parsed && parsed >= 1000) {
          extractedAmount = parsed;
          break;
        }
      }
    }
  }

  // Strategy C: Find any large number (5+ digits) that looks like a COP amount
  if (!extractedAmount) {
    const allNums = rawText.match(/\b([0-9]{1,3}(?:\.[0-9]{3})+)\b/g);
    if (allNums) {
      for (const n of allNums) {
        const parsed = parseColombianAmount(n);
        if (parsed && parsed >= 1000) {
          extractedAmount = parsed;
          break;
        }
      }
    }
  }

  if (extractedAmount) {
    result.amount = extractedAmount;
  }

  // 4. Detect Operation Number (only pure digits or short alphanumeric codes — NOT words)
  for (const line of lines) {
    const compMatch = line.match(/(?:COMPROBANTE|APROBACION|APROBACIÓN|AUTORIZACION|AUTORIZACIÓN|AUT\.?|NRO\.?|NO\.?)\s*[:#]?\s*([0-9]{3,12})/i);
    if (compMatch && compMatch[1]) {
      const candidate = compMatch[1].trim();
      if (/^[0-9]+$/.test(candidate)) {
        result.operationNumber = candidate;
        break;
      }
    }
  }

  // Fallback: any line that is ONLY a short number (4-8 digits) after a label
  if (!result.operationNumber) {
    for (const line of lines) {
      const upper = line.toUpperCase().trim();
      if (EXCLUDED_WORDS.has(upper)) continue;
      // Pure number line, 4-8 digits
      if (/^[0-9]{4,8}$/.test(line.trim())) {
        result.operationNumber = line.trim();
        break;
      }
    }
  }

  // 5. Detect Reference Number (REF, CONVENIO, CUENTA, PIN, CELULAR, DOCUMENTO)
  for (const line of lines) {
    const refMatch = line.match(/(?:REF|REFERENCIA|CONVENIO|CUENTA|CELULAR|DOCUMENTO|PIN|NUM\.?|NUMERO DE REFERENCIA)[.:\s#]*([0-9]{4,25})/i);
    if (refMatch && refMatch[1]) {
      const candidate = refMatch[1].trim();
      if (/^[0-9]+$/.test(candidate) && candidate.length >= 4) {
        result.reference = candidate;
        break;
      }
    }
  }

  // 6. Detect Date and Time
  const dateMatch = rawText.match(/(\d{2}[/-]\d{2}[/-]\d{2,4}|\d{4}[/-]\d{2}[/-]\d{2})/);
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

    const prompt = `Analiza este comprobante / voucher de corresponsal bancario en Colombia (Redeban, Credibanco, Bancolombia, Nequi, Daviplata, Efecty, Davivienda, etc.).
Extrae con 100% de precisión y fidelidad la información en formato JSON estricto:
{
  "entity": "Nombre del banco o red (ej: Bancolombia, Nequi, Daviplata, Davivienda, Efecty, Redeban, Credibanco, etc.)",
  "type": "INGRESO si es depósito/consignación/recaudo/pago, o EGRESO si es retiro/entrega de dinero",
  "categoryName": "Recaudo, Consignación, Retiro, Pago factura o Recarga",
  "amount": valor_numerico_entero_sin_puntos_ni_signos (ej: 1000000 para $ 1.000.000 o 50000 para $ 50.000),
  "operationNumber": "Solo el numero/codigo de comprobante, aprobacion o transaccion. NO incluyas palabras como BANCOLOMBIA, CORRESPONSAL, SANCOLOMBIA, REDEBAN, CREDIBANCO ni el nombre del banco.",
  "reference": "Solo el numero de referencia, convenio, cuenta, celular o documento (solo digitos, sin texto)",
  "authCode": "Codigo de autorizacion si existe, sino null",
  "date": "YYYY-MM-DD o null",
  "time": "HH:MM:SS o null",
  "status": "EXITOSA o RECHAZADA"
}
Responde UNICAMENTE con el objeto JSON válido, sin texto adicional.`;

    // === LAYER 1: GROQ VISION (Qwen2.5-VL) - Fastest & Free ===
    const groqKeySetting = await prisma.setting.findUnique({ where: { key: "GROQ_API_KEY" } });
    const groqApiKey = process.env.GROQ_API_KEY || groqKeySetting?.value;

    if (groqApiKey && imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        const mimeMatch = imageBase64.match(/^data:(image\/[a-z]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${cleanBase64}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.05,
            max_tokens: 512,
            response_format: { type: "json_object" },
          }),
        });

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const content = groqData?.choices?.[0]?.message?.content;
          if (content) {
            const parsedJson = JSON.parse(content);
            return NextResponse.json({
              result: {
                ...parsedJson,
                engine: "AI_VISION_GROQ",
                confidence: 0.99,
              },
            });
          }
        }
      } catch (groqErr) {
        console.warn("Groq Vision fallback:", groqErr);
      }
    }

    // === LAYER 2: GEMINI VISION (Google AI) - Fallback ===
    const geminiKeySetting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || geminiKeySetting?.value;

    if (geminiApiKey && imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                  ],
                },
              ],
              generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsedJson = JSON.parse(candidateText);
            return NextResponse.json({
              result: { ...parsedJson, engine: "AI_VISION_GEMINI", confidence: 0.99 },
            });
          }
        }
      } catch (aiErr) {
        console.warn("Gemini Vision fallback to Heuristic OCR:", aiErr);
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
