'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { parseQRData, ParsedQRData } from '@/lib/qr-parser';
import { formatCOP } from '@/lib/calculations';
import {
  Camera, X, CheckCircle2, Edit3, RotateCcw, ArrowRight,
  Building2, Hash, DollarSign, FileText, ArrowDownRight, ArrowUpRight,
  Upload, Sparkles, Loader2, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

type ScanStep = 'scanning' | 'ocr' | 'review';

interface OCRResult {
  text: string;
  amount?: number;
  date?: string;
  time?: string;
  reference?: string;
  operationNum?: string;
  status?: string;
  entity?: string;
  type?: string;
}

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [step, setStep] = useState<ScanStep>('scanning');
  const [qrData, setQrData] = useState<ParsedQRData | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Editable fields
  const [opType, setOpType] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [entity, setEntity] = useState('');

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (err: unknown) {
          if ((err as Error)?.name !== 'AbortError') {
            console.warn('Camera play exception:', err);
          }
        }
      }
      setError('');
    } catch (err) {
      setError('No se pudo acceder a la cámara o no se otorgaron permisos.');
      console.error(err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  const processImageForQRAndOCR = async (imageDataUrl: string) => {
    // Create an image element to get dimensions
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });

        let parsedQR: ParsedQRData | undefined = undefined;
        if (code) {
          parsedQR = parseQRData(code.data);
          setQrData(parsedQR);
          if (/retiro|salida|entrega/i.test(code.data)) setOpType('EGRESO');
          else setOpType('INGRESO');

          if (parsedQR.amount) setAmount(String(parsedQR.amount));
          if (parsedQR.reference && parsedQR.reference !== 'NO DISPONIBLE') setReference(parsedQR.reference);
          if (parsedQR.operationNumber && parsedQR.operationNumber !== 'NO DISPONIBLE') setOperationNumber(parsedQR.operationNumber);
          if (parsedQR.entity && parsedQR.entity !== 'NO DISPONIBLE') setEntity(parsedQR.entity);
        }

        setCapturedImage(imageDataUrl);
        stopCamera();
        runOCR(imageDataUrl, parsedQR);
      }
    };
  };

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    if (step !== 'scanning') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code) {
        const parsed = parseQRData(code.data);
        setQrData(parsed);

        if (/retiro|salida|entrega/i.test(code.data)) {
          setOpType('EGRESO');
        } else {
          setOpType('INGRESO');
        }

        if (parsed.amount) setAmount(String(parsed.amount));
        if (parsed.reference && parsed.reference !== 'NO DISPONIBLE') setReference(parsed.reference);
        if (parsed.operationNumber && parsed.operationNumber !== 'NO DISPONIBLE') setOperationNumber(parsed.operationNumber);
        if (parsed.entity && parsed.entity !== 'NO DISPONIBLE') setEntity(parsed.entity);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);

        stopCamera();
        runOCR(dataUrl, parsed);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [step, stopCamera]);

  useEffect(() => {
    if (step === 'scanning') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step]);

  useEffect(() => {
    if (step === 'scanning' && videoRef.current) {
      const v = videoRef.current;
      const onPlay = () => {
        animFrameRef.current = requestAnimationFrame(scanFrame);
      };
      v.addEventListener('playing', onPlay);
      return () => v.removeEventListener('playing', onPlay);
    }
  }, [step, scanFrame]);

  const runOCR = async (imageDataUrl: string, existingQR?: ParsedQRData) => {
    setStep('ocr');
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(imageDataUrl, 'spa+eng', {
        logger: () => {},
      });

      const text = data.text;
      const ocr = extractOCRData(text);
      setOcrResult(ocr);

      if (/retiro|salida/i.test(text)) {
        setOpType('EGRESO');
      }

      if (!amount && ocr.amount) setAmount(String(ocr.amount));
      if (!reference && ocr.reference) setReference(ocr.reference);
      if (!operationNumber && ocr.operationNum) setOperationNumber(ocr.operationNum);
      if (!entity && ocr.entity) setEntity(ocr.entity);
    } catch (err) {
      console.error('OCR failed:', err);
      setOcrResult({ text: '' });
    } finally {
      setStep('review');
    }
  };

  function extractOCRData(text: string): OCRResult {
    const result: OCRResult = { text };

    const amountMatch = text.match(/\$\s*([\d.,]+)/);
    if (amountMatch) {
      const num = parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(num)) result.amount = Math.round(num);
    }

    const dateMatch = text.match(/\d{2}[/-]\d{2}[/-]\d{2,4}/);
    if (dateMatch) result.date = dateMatch[0];

    const timeMatch = text.match(/\d{1,2}:\d{2}(?:\s?[AaPp][Mm])?/);
    if (timeMatch) result.time = timeMatch[0];

    const refMatches = text.match(/\b[A-Z0-9]{6,20}\b/g);
    if (refMatches) {
      result.reference = refMatches[0];
      if (refMatches.length > 1) result.operationNum = refMatches[1];
    }

    if (/exitosa|aprobada|aprobado|exitoso|completada/i.test(text)) result.status = 'EXITOSA';
    else if (/rechazada|fallida|error|cancelada/i.test(text)) result.status = 'RECHAZADA';
    else if (/pendiente/i.test(text)) result.status = 'PENDIENTE';

    const bankMatch = text.match(/bancolombia|nequi|daviplata|davivienda|bbva|itaú|bancamía|movii|rappipay/i);
    if (bankMatch) result.entity = bankMatch[0].toUpperCase();

    return result;
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
    runOCR(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        processImageForQRAndOCR(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualEntry = () => {
    stopCamera();
    setStep('review');
  };

  const handleConfirm = () => {
    const numAmount = parseInt(amount) || 0;

    const voucherData = {
      qrData: qrData || undefined,
      ocrData: ocrResult || undefined,
    };

    const params = new URLSearchParams();
    if (numAmount > 0) params.set('amount', String(numAmount));
    if (reference) params.set('ref', reference);
    if (operationNumber) params.set('op', operationNumber);
    params.set('type', opType);
    params.set('voucherData', JSON.stringify(voucherData));

    router.push(`/operations/new?${params.toString()}`);
  };

  const resetScanner = () => {
    setStep('scanning');
    setQrData(null);
    setOcrResult(null);
    setCapturedImage(null);
    setAmount('');
    setReference('');
    setOperationNumber('');
    setEntity('');
    setError('');
  };

  const numAmount = parseInt(amount) || 0;

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Escáner de Comprobantes</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lector QR en tiempo real y análisis OCR inteligente de vouchers
          </p>
        </div>
        <Link
          href="/"
          className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs"
        >
          <X size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Camera / Scanner View */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-slate-900 aspect-4/3 flex items-center justify-center border border-slate-800 shadow-lg">
            {step === 'scanning' && (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scan Finder Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-emerald-400 rounded-3xl relative animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl -mt-1 -ml-1" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl -mt-1 -mr-1" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl -mb-1 -ml-1" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl -mb-1 -mr-1" />
                  </div>
                </div>

                <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
                  <span className="bg-slate-900/80 backdrop-blur-xs text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-slate-700">
                    Apunta la cámara al código QR o comprobante
                  </span>
                </div>
              </>
            )}

            {step === 'ocr' && (
              <div className="text-center text-white p-6 space-y-3">
                <Loader2 size={48} className="animate-spin text-emerald-400 mx-auto" />
                <div className="font-black text-lg">Analizando Comprobante con IA (OCR)...</div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Extrayendo monto, entidad bancaria, número de operación y fecha...
                </p>
              </div>
            )}

            {step === 'review' && capturedImage && (
              <img
                src={capturedImage}
                alt="Comprobante capturado"
                className="w-full h-full object-contain bg-slate-950"
              />
            )}

            {step === 'review' && !capturedImage && (
              <div className="text-center text-slate-400 p-8 space-y-2">
                <Edit3 size={48} className="mx-auto text-emerald-500 opacity-80" />
                <p className="font-bold text-white text-sm">Entrada Manual de Transacción</p>
                <p className="text-xs text-slate-400">Digita los datos directamente en el panel lateral</p>
              </div>
            )}
          </div>

          {/* Action Buttons Below Camera */}
          {step === 'scanning' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleCapture}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition shadow-sm cursor-pointer"
              >
                <Camera size={16} />
                <span>Capturar Foto / OCR</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3.5 px-4 rounded-2xl text-xs transition shadow-2xs cursor-pointer"
              >
                <Upload size={16} className="text-slate-500" />
                <span>Subir Foto Voucher</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleManualEntry}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl text-xs transition shadow-sm cursor-pointer"
              >
                <Edit3 size={16} />
                <span>Ingresar Manual</span>
              </button>
            </div>
          )}

          {step === 'review' && (
            <button
              type="button"
              onClick={resetScanner}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-3.5 rounded-2xl text-xs transition shadow-2xs cursor-pointer"
            >
              <RotateCcw size={16} />
              <span>Volver a Escanear Otra Transacción</span>
            </button>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Analyzed Data & Verification Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Datos Verificados de la Operación
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                100% Real
              </span>
            </div>

            {/* Type Switcher */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Tipo de Transacción
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOpType('INGRESO')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    opType === 'INGRESO'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ArrowDownRight size={16} />
                  <span>INGRESO (Depósito)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpType('EGRESO')}
                  className={`py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    opType === 'EGRESO'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  <span>RETIRO (Entrega)</span>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Monto de la Transacción ($ COP)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black text-right focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>
              {numAmount > 0 && (
                <p className="text-right text-xs font-bold text-slate-600">{formatCOP(numAmount)}</p>
              )}
            </div>

            {/* Operation Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Número de Operación
              </label>
              <input
                type="text"
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                placeholder="Ej: 849203"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Número de Referencia
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: REF-928472"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* Entity / Bank */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Entidad o Banco
              </label>
              <input
                type="text"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder="Ej: Bancolombia, Nequi, Daviplata, Efecty..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* Confirm & Proceed Button */}
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold py-4 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Continuar con esta Operación</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
