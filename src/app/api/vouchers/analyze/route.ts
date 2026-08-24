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
  engine: "AI_VISION" | "HEURISTIC_OCR";
  confidence: number;
}

// Clean and parse numbers with Colombian currency format (1.000.000 or 1,000,000 or 1000000)
function parseColombianAmount(text: string): number | undefined {
  if (!text) return undefined;
  const clean = text.replace(/[$\s]/g, "").replace(/\./g, "").replace(/,/g, ".");
  const num = parseFloat(clean);
  if (!isNaN(num) && num > 0 && num < 500000000) {
    return Math.round(num);
  }
  return undefined;
}

// High-precision regex heuristic parser for Colombian vouchers
export function parseColombianVoucherText(rawText: string): VoucherAnalysisResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = rawText.toUpperCase();

  const result: VoucherAnalysisResult = {
    engine: "HEURISTIC_OCR",
    confidence: 0.85,
    rawText,
  };

  // 1. Detect Bank / Entity
  if (fullText.includes("BANCOLOMBIA") || fullText.includes("CORRESPONSAL BANCOLOMBIA") || fullText.includes("SANCOLOMBIA")) {
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
  } else if (fullText.includes("REDEBAN") || fullText.includes("RBM")) {
    result.entity = "REDEBAN";
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

  // 3. Detect Amount (Look specifically for VALOR, TOTAL, PAGADO, COP, $)
  let extractedAmount: number | undefined;

  // Search line by line for keywords
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (
      upper.includes("VALOR") ||
      upper.includes("TOTAL") ||
      upper.includes("MONTO") ||
      upper.includes("IMPORTE") ||
      upper.includes("PAGADO") ||
      upper.includes("EFECTIVO")
    ) {
      // Find numbers in this line
      const match = line.match(/(?:\$|COP|:\s*)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})?|[0-9]{4,9})/);
      if (match) {
        const parsed = parseColombianAmount(match[1]);
        if (parsed && parsed >= 1000) {
          extractedAmount = parsed;
          break;
        }
      }
    }
  }

  // Fallback: match any $ amount in text
  if (!extractedAmount) {
    const allMatches = rawText.match(/\$\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]{4,9})/g);
    if (allMatches && allMatches.length > 0) {
      for (const m of allMatches) {
        const parsed = parseColombianAmount(m);
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

  // 4. Detect Operation Number / Comprobante / Aprobación
  // Exclude common header words like SANCOLOMBIA, BANCOLOMBIA, CORRESPONSAL, PAGAPAGTI
  const excludedWords = ["BANCOLOMBIA", "SANCOLOMBIA", "CORRESPONSAL", "ORRESPONSA", "PAGAPAGTI", "REDEBAN", "CREDIBANCO", "CLIENTE", "DUPLICADO"];

  for (const line of lines) {
    const upper = line.toUpperCase();
    const compMatch = line.match(/(?:COMPROBANTE|APROBACION|APROBACIÓN|AUTORIZACION|AUTORIZACIÓN|AUT|OP|NUMERO|NRO|NO)[.:\s#]*([0-9A-Z]{3,12})/i);
    if (compMatch && compMatch[1]) {
      const candidate = compMatch[1].trim().toUpperCase();
      if (!excludedWords.some((w) => candidate.includes(w)) && /^[0-9A-Z]+$/.test(candidate)) {
        result.operationNumber = candidate;
        break;
      }
    }
  }

  // 5. Detect Reference Number (REF, CONVENIO, CUENTA, PIN, CELULAR)
  for (const line of lines) {
    const refMatch = line.match(/(?:REF|REFERENCIA|CONVENIO|CUENTA|CELULAR|DOCUMENTO|PIN)[.:\s#]*([0-9]{4,25})/i);
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

    // Check for AI Vision Key (Gemini API)
    const geminiKeySetting = await prisma.setting.findUnique({ where: { key: "GEMINI_API_KEY" } });
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || geminiKeySetting?.value;

    if (apiKey && imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        const prompt = `Analiza este comprobante / voucher de corresponsal bancario en Colombia (Redeban, Credibanco, Bancolombia, Nequi, Daviplata, Efecty, Davivienda, etc.).
Extrae con 100% de precisión y fidelidad la información en formato JSON estricto:
{
  "entity": "Nombre del banco o red (ej: Bancolombia, Nequi, Daviplata, Davivienda, Efecty, Redeban, etc.)",
  "type": "INGRESO si es depósito/consignación/recaudo/pago, o EGRESO si es retiro/entrega de dinero",
  "categoryName": "Recaudo, Consignación, Retiro, Pago factura o Recarga",
  "amount": valor_numerico_sin_puntos_ni_signos (ej: 1000000 para $ 1.000.000),
  "operationNumber": "Numero de comprobante, aprobacion o transaccion (solo el codigo/numero, sin palabras de encabezado)",
  "reference": "Numero de referencia, convenio, cuenta o celular (solo el numero)",
  "authCode": "Codigo de autorizacion si existe",
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS",
  "status": "EXITOSA o RECHAZADA"
}
Responde UNICAMENTE con el objeto JSON válido.`;

        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inlineData: {
                        mimeType: "image/jpeg",
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsedJson = JSON.parse(candidateText);
            return NextResponse.json({
              result: {
                ...parsedJson,
                engine: "AI_VISION",
                confidence: 0.99,
              },
            });
          }
        }
      } catch (aiErr) {
        console.warn("AI Vision fallback to Heuristic OCR:", aiErr);
      }
    }

    // Fallback: Robust Colombian Heuristic Regex Parser
    const heuristicResult = parseColombianVoucherText(rawText || "");
    return NextResponse.json({ result: heuristicResult });
  } catch (error) {
    console.error("Voucher analysis error:", error);
    return NextResponse.json({ error: "Error analizando comprobante" }, { status: 500 });
  }
}
