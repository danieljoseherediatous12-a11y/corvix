'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  Sparkles,
  Building2
} from 'lucide-react';
import { CorvixLogo } from '@/components/ui/CorvixLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Error de conexión. Intenta nuevamente.');
      setLoading(false);
    }
  };

  const handleQuickLogin = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative flex items-center justify-center p-4 overflow-hidden antialiased font-sans">
      {/* Dynamic Animated Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-400/15 rounded-full blur-3xl pointer-events-none animate-float-1" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[550px] h-[550px] bg-slate-400/15 rounded-full blur-3xl pointer-events-none animate-float-2" />
      <div className="absolute top-[40%] right-[15%] w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-2xl pointer-events-none animate-pulse-glow" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 animate-fade-in-up space-y-4">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden">
          {/* Header with High-Contrast White Background */}
          <div className="pt-10 pb-6 px-8 text-center space-y-3 bg-linear-to-b from-slate-50/80 to-white border-b border-slate-100">
            {/* Logo Mark Container with Ambient Emerald Glow */}
            <div className="relative inline-block">
              <div className="absolute -inset-1.5 bg-emerald-500/20 rounded-3xl blur-md animate-pulse-glow" />
              <div className="relative w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 p-2 transform hover:scale-105 transition duration-300">
                <CorvixLogo size={52} />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-wider text-slate-900">
                CORVIX
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Control Inteligente de Caja y Operaciones
              </p>
            </div>
          </div>

          {/* Form Area */}
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2 animate-fade-in-up">
                <ShieldCheck size={16} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@corresponsal.com"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:bg-slate-300 text-white font-bold py-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-emerald-400" />
                  <span>Verificando acceso...</span>
                </>
              ) : (
                <>
                  <span>Ingresar a Corvix</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* APK Download Shortcut */}
            <div className="pt-2">
              <a
                href="/corvix.apk"
                download="Corvix.apk"
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200/80 py-3 rounded-xl text-xs font-bold transition-all shadow-2xs group"
              >
                <Smartphone size={16} className="text-emerald-700 group-hover:scale-110 transition-transform" />
                <span>Descargar App Android (.APK)</span>
              </a>
            </div>


          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400 font-medium">
          Corvix • Sistema Seguro de Control de Caja
        </p>
      </div>
    </div>
  );
}
