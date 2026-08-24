'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Settings, Building2, Wifi, DollarSign, Tag, Users, CheckCircle2,
  ShieldCheck, Smartphone, Save, Coins, Percent, Table
} from 'lucide-react';
import { OFFICIAL_COMMISSION_BRACKETS, formatCOP } from '@/lib/calculations';

interface SettingItem {
  key: string;
  value: string;
  label?: string;
}

interface Denomination {
  id: string;
  value: number;
  label: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [denominations, setDenominations] = useState<Denomination[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const userRole = (session?.user as { role?: string })?.role;
  const isAuthorized = userRole === 'DUENO' || userRole === 'ADMIN';

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const setMap: Record<string, string> = {};
        (data.settings || []).forEach((s: SettingItem) => {
          setMap[s.key] = s.value;
        });
        setSettings(setMap);
        setDenominations(data.denominations || []);
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setError('Solo el Administrador o Dueño puede modificar la configuración');
      return;
    }

    setSaving(true);
    setError('');

    const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });

      if (!res.ok) {
        setError('Error al guardar configuración');
        setSaving(false);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-24 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Configuración del Sistema</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">Parámetros del corresponsal, tabla de comisiones y aplicación móvil</p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in-up shadow-2xs">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>Configuración guardada correctamente.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold shadow-2xs">
          {error}
        </div>
      )}

      {/* Official Commission & Profit Brackets Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Coins size={18} className="text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
              Tabla Oficial de Ganancias por Consignaciones y Recargas
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
            Tarifario Vigente
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <th className="py-3 px-4">Rango Desde</th>
                <th className="py-3 px-4">Rango Hasta</th>
                <th className="py-3 px-4 text-right">Ganancia / Comisión del Punto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {OFFICIAL_COMMISSION_BRACKETS.map((bracket, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-bold text-slate-800">{formatCOP(bracket.min)}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{formatCOP(bracket.max)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-800 font-black px-2.5 py-1 rounded-lg">
                      +{formatCOP(bracket.fee)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Settings */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
          <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 size={16} className="text-slate-500" />
            Datos del Corresponsal
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Nombre Comercial</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={settings.business_name || 'Mi Corresponsal'}
                onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-900 focus:bg-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">NIT / Identificación</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={settings.business_nit || ''}
                onChange={(e) => setSettings({ ...settings, business_nit: e.target.value })}
                placeholder="Ej: 900.123.456-7"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-900 focus:bg-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Dirección del Punto</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={settings.business_address || ''}
                onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
                placeholder="Ej: Calle 45 # 12-34"
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-900 focus:bg-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Ciudad / Municipio</label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={settings.business_city || 'Bogotá, Colombia'}
                onChange={(e) => setSettings({ ...settings, business_city: e.target.value })}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-900 focus:bg-white disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Operational / Print Settings */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
            <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Smartphone size={16} className="text-slate-500" />
              Parámetros de Aplicación Móvil
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Clave de Inteligencia Artificial (Gemini API Key)</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    Visión 100% Precisión
                  </span>
                </label>
                <input
                  type="password"
                  disabled={!isAuthorized}
                  value={settings.GEMINI_API_KEY || ''}
                  onChange={(e) => setSettings({ ...settings, GEMINI_API_KEY: e.target.value })}
                  placeholder="Pega aquí tu clave de Google AI Studio (Opcional)"
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:border-slate-900 focus:bg-white disabled:opacity-60"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Permite que la app use Visión Artificial de Google en la nube para leer vouchers arrugados, térmicos o borrosos con 100% de exactitud humana.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div>
                  <div className="font-bold text-slate-900">Modo Offline PWA</div>
                  <div className="text-slate-400 text-[11px]">Sincronización de transacciones activada</div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Activo
                </span>
              </div>
            </div>
          </div>

          {isAuthorized && (
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold py-4 rounded-2xl text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save size={16} />
              <span>{saving ? 'Guardando cambios...' : 'Guardar Configuración'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
