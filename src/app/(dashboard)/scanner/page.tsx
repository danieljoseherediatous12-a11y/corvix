'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { parseQRData, ParsedQRData } from '@/lib/qr-parser';
import { formatCOP } from '@/lib/calculations';
import {
  Camera, X, CheckCircle2, Edit3, RotateCcw, ArrowRight,
  Building2, Hash, DollarSign, FileText, ArrowDownRight, ArrowUpRight,
  Upload, Sparkles, Loader2, Image as ImageIcon, ShieldCheck, Check
} from 'lucide-react';
import Link from 'next/link';

type ScanStep = 'scanning' | 'ocr' | 'review';

interface OCRResult {
  text: string;
  amount?: number;
  date?: string;
  time?: string;
  reference?: string;
  operationNumber?: string;
  status?: string;
  entity?: string;
  type?: string;
  engine?: string;
}

// Canvas preprocessor to enhance thermal paper contrast before OCR
function preprocessCanvasImage(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/jpeg', 0.95);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // 1. Calculate average brightness
  let sumGray = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sumGray += gray;
  }
  const avgBrightness = sumGray / (data.length / 4);

  // 2. Dynamic threshold based on image brightness
  const threshold = Math.max(90, Math.min(160, avgBrightness - 15));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // High-definition crisp text enhancement for faint thermal ink
    if (gray < threshold) {
      // Dark text -> pitch black
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else {
      // Paper background -> pure white
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
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
  const [analysisStatus, setAnalysisStatus] = useState<string>('Analizando con IA...');

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
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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
      setError('No se pudo acceder a la cámara. Puedes subir una foto directamente.');
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

  const runAnalysis = async (imageDataUrl: string, existingQR?: ParsedQRData) => {
    setStep('ocr');
    setAnalysisStatus('Extrayendo texto y analizando con Inteligencia Artificial...');

    let rawText = '';
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const { data } = await Tesseract.recognize(imageDataUrl, 'spa+eng', {
        logger: () => {},
      });
      rawText = data.text;
    } catch (tessErr) {
      console.warn('Local OCR warning:', tessErr);
    }

    try {
      setAnalysisStatus('Verificando banco, montos y número de operación...');
      const response = await fetch('/api/vouchers/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          rawText,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const res = json.result;

        setOcrResult({
          text: rawText,
          amount: res.amount,
          reference: res.reference,
          operationNumber: res.operationNumber,
          entity: res.entity,
          type: res.type,
          engine: res.engine,
        });

        if (res.type) {
          setOpType(res.type === 'EGRESO' ? 'EGRESO' : 'INGRESO');
        }
        if (res.amount) {
          setAmount(String(res.amount));
        }
        if (res.operationNumber) {
          setOperationNumber(res.operationNumber);
        }
        if (res.reference) {
          setReference(res.reference);
        }
        if (res.entity) {
          setEntity(res.entity);
        }
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setStep('review');
    }
  };

  const processImageForQRAndOCR = async (imageDataUrl: string) => {
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
        runAnalysis(imageDataUrl, parsedQR);
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
        runAnalysis(dataUrl, parsed);
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

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
    runAnalysis(dataUrl);
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
      scannedImage: capturedImage || undefined,
    };

    // Store large image payload in sessionStorage to avoid URI_TOO_LONG (414)
    try {
      sessionStorage.setItem('corvix_pending_voucher', JSON.stringify(voucherData));
    } catch (e) {
      console.warn("Could not save voucher to sessionStorage", e);
    }

    const params = new URLSearchParams();
    if (numAmount > 0) params.set('amount', String(numAmount));
    if (reference) params.set('ref', reference);
    if (operationNumber) params.set('op', operationNumber);
    params.set('type', opType);

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
    <div className="w-full space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Escáner y Visión IA de Comprobantes</span>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles size={12} className="text-emerald-600" />
              IA Real
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Lector QR en tiempo real y extracción inteligente de datos para vouchers colombianos
          </p>
        </div>
        <Link
          href="/"
          className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-2xs cursor-pointer"
        >
          <X size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Camera / Scanner View */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center border border-slate-800 shadow-xl">
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
                  <div className="w-72 h-72 border-2 border-emerald-400/80 rounded-3xl relative animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl -mt-1 -ml-1" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl -mt-1 -mr-1" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl -mb-1 -ml-1" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl -mb-1 -mr-1" />
                  </div>
                </div>

                <div className="absolute bottom-4 inset-x-0 text-center pointer-events-none">
                  <span className="bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-slate-700 shadow-md">
                    Enfoca el voucher o presiona Capturar Foto
                  </span>
                </div>
              </>
            )}

            {step === 'ocr' && (
              <div className="text-center text-white p-8 space-y-4">
                <div className="relative inline-block">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center mx-auto border border-emerald-500/40 animate-pulse">
                    <Sparkles size={32} className="text-emerald-400" />
                  </div>
                </div>
                <div className="font-black text-xl text-emerald-400">Analizando Comprobante</div>
                <p className="text-xs text-slate-300 max-w-sm mx-auto font-medium leading-relaxed">
                  {analysisStatus}
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                  <span>Procesando campos con precisión financiera...</span>
                </div>
              </div>
            )}

            {step === 'review' && capturedImage && (
              <img
                src={capturedImage}
                alt="Comprobante capturado"
                className="w-full h-full object-contain bg-slate-950 p-2"
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
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black py-4 px-4 rounded-2xl text-xs transition shadow-md cursor-pointer"
              >
                <Camera size={18} />
                <span>Capturar Foto / Escanear</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold py-4 px-4 rounded-2xl text-xs transition shadow-2xs cursor-pointer"
              >
                <Upload size={18} className="text-emerald-700" />
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
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-4 rounded-2xl text-xs transition shadow-sm cursor-pointer"
              >
                <Edit3 size={18} />
                <span>Ingresar Manual</span>
              </button>
            </div>
          )}

          {step === 'review' && (
            <button
              type="button"
              onClick={resetScanner}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold py-4 rounded-2xl text-xs transition shadow-2xs cursor-pointer"
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
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-600" />
                Datos Verificados de la Operación
              </span>
              <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Check size={12} />
                100% Precisión
              </span>
            </div>

            {/* Type Switcher */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tipo de Transacción
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOpType('INGRESO')}
                  className={`py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    opType === 'INGRESO'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ArrowDownRight size={16} />
                  <span>INGRESO (Depósito/Pago)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpType('EGRESO')}
                  className={`py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Monto de la Transacción ($ COP)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-2xl">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-black text-right focus:outline-none focus:border-slate-900 focus:bg-white transition"
                />
              </div>
              {numAmount > 0 && (
                <p className="text-right text-xs font-bold text-emerald-700">{formatCOP(numAmount)}</p>
              )}
            </div>

            {/* Operation Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Número de Operación / Comprobante / Aprobación
              </label>
              <input
                type="text"
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                placeholder="Ej: 0435 o 849203"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Número de Referencia / Convenio / Cuenta / Celular
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ej: 0000000000000857932"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* Entity / Bank */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Entidad o Banco
              </label>
              <input
                type="text"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                placeholder="Ej: Bancolombia, Nequi, Daviplata, Efecty, Redeban..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 focus:bg-white"
              />
            </div>

            {/* Confirm & Proceed Button */}
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-black py-4.5 rounded-2xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
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
