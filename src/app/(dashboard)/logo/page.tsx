'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Sparkles, Shield, Layers, Gem } from 'lucide-react';

const logoOptions = [
  {
    id: 'opt1',
    title: 'Propuesta 1: Diamond Vault',
    desc: 'Bóveda geométrica en rombo con facetas entrelazadas en esmeralda y obsidiana.',
    src: '/logos/corvix-opt1.svg',
  },
  {
    id: 'opt2',
    title: 'Propuesta 2: Dynamic Hex Flow',
    desc: 'Estructura hexagonal modular de flujo continuo y precisión financiera.',
    src: '/logos/corvix-opt2.svg',
  },
  {
    id: 'opt3',
    title: 'Propuesta 3: Precision Shield',
    desc: 'Escudo minimalista de seguridad, control estricto y exactitud de caja.',
    src: '/logos/corvix-opt3.svg',
  },
  {
    id: 'opt4',
    title: 'Propuesta 4: Geometric Fusion',
    desc: 'Prismas angulares convergentes de alta gama fintech y tecnología moderna.',
    src: '/logos/corvix-opt4.svg',
  },
];

export default function LogoShowcasePage() {
  const [selected, setSelected] = useState<string>('opt1');
  const [copied, setCopied] = useState(false);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Propuestas de Logo — CORVIX</h1>
            <p className="text-xs text-slate-500">Diseños de isotipos puros (sin texto) para el software</p>
          </div>
        </div>
      </div>

      {/* Grid of Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {logoOptions.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <div
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`bg-white rounded-3xl border-2 p-6 cursor-pointer transition-all shadow-sm space-y-4 ${
                isSelected
                  ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-md'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Preview Cards: Light & Dark background */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex items-center justify-center aspect-square">
                  <img src={opt.src} alt={opt.title} className="w-24 h-24 object-contain" />
                </div>
                <div className="bg-slate-950 rounded-2xl p-6 flex items-center justify-center aspect-square">
                  <img src={opt.src} alt={opt.title} className="w-24 h-24 object-contain" />
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start justify-between gap-3 pt-1">
                <div>
                  <h3 className="font-black text-sm text-slate-900">{opt.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? 'bg-slate-900 text-white' : 'border border-slate-300'
                }`}>
                  {isSelected && <CheckCircle2 size={16} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Action Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Logo Seleccionado</div>
          <div className="text-base font-black text-white mt-0.5">
            {logoOptions.find((o) => o.id === selected)?.title}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            Confirmar y Volver
          </Link>
        </div>
      </div>
    </div>
  );
}
