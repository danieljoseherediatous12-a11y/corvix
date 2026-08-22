'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already running as standalone app
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
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
      alert('Para instalar en iPhone/iPad:\n1. Toca el botón Compartir ⎋ (abajo)\n2. Selecciona "Agregar a la pantalla de inicio" ➕');
    }
  };

  if (isStandalone || !showBanner) return null;

  return (
    <div className="bg-emerald-900 text-white px-4 py-3 border-b border-emerald-800 flex items-center justify-between gap-3 text-xs md:text-sm">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 bg-emerald-700 rounded-lg text-white flex-shrink-0">
          <Smartphone size={18} />
        </div>
        <div className="truncate">
          <span className="font-bold">¿Instalar en este celular?</span>{' '}
          <span className="text-emerald-200 hidden sm:inline">Úsala como una app nativa con icono</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-white text-emerald-900 hover:bg-emerald-50 font-black px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition-colors"
        >
          <Download size={14} />
          INSTALAR
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-emerald-300 hover:text-white p-1"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
