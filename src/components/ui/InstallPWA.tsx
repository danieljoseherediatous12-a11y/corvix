'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, Sparkles } from 'lucide-react';
import { CorvixLogo } from '@/components/ui/CorvixLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already running as standalone app
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    if (standalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (ios && !standalone) {
      setShowBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isStandalone || (!showBanner && !showIOSModal)) return null;

  return (
    <>
      {showBanner && (
        <div className="bg-emerald-900 text-white px-4 py-3 border-b border-emerald-800 flex items-center justify-between gap-3 text-xs md:text-sm shadow-md animate-fade-in z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-emerald-700 rounded-xl text-white flex-shrink-0">
              <Smartphone size={18} />
            </div>
            <div className="truncate">
              <span className="font-bold">¿Instalar en este celular?</span>{' '}
              <span className="text-emerald-200 hidden sm:inline">Úsala en pantalla completa como una App nativa</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-white text-emerald-950 hover:bg-emerald-50 active:scale-95 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Download size={14} />
              INSTALAR
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-emerald-300 hover:text-white p-1 cursor-pointer transition"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* iOS STEP-BY-STEP INSTALLATION MODAL */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-900 space-y-5 shadow-2xl animate-fade-in-up border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-slate-200 flex items-center justify-center shadow-2xs">
                  <CorvixLogo size={32} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Instalar en iPhone</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">CORVIX Control de Caja</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    Toca el botón Compartir <Share size={14} className="text-blue-600 inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Está ubicado en la barra inferior de Safari (ícono de un cuadrado con flecha hacia arriba).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    Selecciona "Agregar al inicio" <PlusSquare size={14} className="text-slate-700 inline" />
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Desliza hacia abajo en el menú de Safari y presiona <strong>"Agregar al inicio"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200/60 text-emerald-900">
                <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium leading-relaxed">
                  ¡Listo! La app se abrirá en <strong>pantalla completa</strong> con icono en tu escritorio de iOS y acceso directo a la cámara.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-xs transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
