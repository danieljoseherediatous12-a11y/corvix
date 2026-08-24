'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatCOP } from '@/lib/calculations';
import {
  ShieldAlert, TrendingUp, TrendingDown, AlertTriangle, Users,
  FileText, BarChart3, DollarSign, Calendar, Clock, ShieldCheck,
  CheckCircle2, ArrowUpRight, ArrowDownRight, Layers, UserPlus,
  Key, Lock, UserCheck, UserX, Trash2, Mail, Shield, Check, X,
  AlertCircle, Sparkles, Loader2, RefreshCw
} from 'lucide-react';

interface OwnerStats {
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalOperations: number;
    daysWithData: number;
    squaredDays: number;
    surplusDays: number;
    deficitDays: number;
    totalDifference: number;
  };
  closings: Array<{
    date: string;
    status: string;
    totalIncome: number;
    totalExpense: number;
    difference: number;
    operationsCount: number;
    user: { name: string };
  }>;
  byCategory: Array<{ name: string; type: string; total: number; count: number }>;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  userName?: string;
  createdAt: string;
  newValue?: string;
}

interface TodaySummary {
  totalIncome?: number;
  totalExpense?: number;
  expectedCash?: number;
  difference?: number;
  cashStatus?: 'CUADRADO' | 'SOBRANTE' | 'FALTANTE' | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  _count?: {
    operations: number;
    sessions: number;
  };
}

export default function OwnerPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'team' | 'audit'>('overview');

  // Team management states
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<TeamMember | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<TeamMember | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  
  // New user form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'OPERADOR' | 'ADMIN' | 'DUENO'>('OPERADOR');
  const [savingUser, setSavingUser] = useState(false);
  
  // Reset password form
  const [resetPassValue, setResetPassValue] = useState('');
  const [resettingPass, setResettingPass] = useState(false);

  // Alerts feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const userRole = (session?.user as { role?: string })?.role;
  const currentUserId = (session?.user as { id?: string })?.id;

  const loadTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setTeam(data.users || []);
      }
    } catch (e) {
      console.error('Error loading team:', e);
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    if (userRole !== 'DUENO' && userRole !== 'ADMIN') return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [reportRes, dashRes, auditRes] = await Promise.all([
          fetch(`/api/reports?type=${period}`),
          fetch('/api/dashboard'),
          fetch('/api/audit?limit=50'),
        ]);

        const reportData = await reportRes.json();
        const dashData = await dashRes.json();
        const auditData = await auditRes.json();

        setStats(reportData);
        setTodaySummary(dashData.summary);
        setAuditLogs(auditData.logs || []);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period, userRole]);

  useEffect(() => {
    if (activeTab === 'team') {
      loadTeam();
    }
  }, [activeTab]);

  if (userRole !== 'DUENO' && userRole !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm">
          <ShieldAlert size={40} className="mx-auto mb-3 text-slate-400" />
          <h2 className="font-bold text-slate-800 text-sm">Acceso Restringido</h2>
          <p className="text-xs text-slate-500 mt-1">Esta sección es exclusiva para el perfil de Dueño / Administrador.</p>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    setSavingUser(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'Error al crear el usuario');
        setSavingUser(false);
        return;
      }

      setActionSuccess(`¡Usuario "${newName}" creado con éxito como ${newRole === 'OPERADOR' ? 'VENDEDOR / ASESOR' : newRole}!`);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('OPERADOR');
      setShowCreateModal(false);
      loadTeam();
    } catch (e) {
      console.error(e);
      setActionError('Error de conexión con el servidor');
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: TeamMember) => {
    setActionError(null);
    setActionSuccess(null);

    const nextState = !user.active;
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          active: nextState,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'Error al modificar estado');
        return;
      }

      setActionSuccess(`Usuario ${user.name} ${nextState ? 'activado' : 'desactivado'}`);
      loadTeam();
    } catch (e) {
      console.error(e);
      setActionError('Error de conexión');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal || !resetPassValue) return;

    setActionError(null);
    setActionSuccess(null);
    setResettingPass(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: showPasswordModal.id,
          password: resetPassValue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'Error al cambiar contraseña');
        setResettingPass(false);
        return;
      }

      setActionSuccess(`Contraseña de "${showPasswordModal.name}" actualizada correctamente`);
      setShowPasswordModal(null);
      setResetPassValue('');
    } catch (e) {
      console.error(e);
      setActionError('Error de conexión');
    } finally {
      setResettingPass(false);
    }
  };

  const handleDeleteUser = async (user: TeamMember) => {
    setActionError(null);
    setActionSuccess(null);
    setDeletingUser(true);

    try {
      const res = await fetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setActionError(data.error || 'Error al eliminar usuario');
        setDeletingUser(false);
        return;
      }

      setActionSuccess(data.message || `Usuario "${user.name}" eliminado correctamente`);
      setShowDeleteModal(null);
      loadTeam();
    } catch (e) {
      console.error(e);
      setActionError('Error de conexión con el servidor al eliminar usuario');
    } finally {
      setDeletingUser(false);
    }
  };

  const actionLabels: Record<string, string> = {
    LOGIN: 'Inicio de sesión',
    LOGOUT: 'Cierre de sesión',
    CREATE: 'Creación de registro',
    UPDATE: 'Modificación',
    DELETE: 'Cancelación',
    OPEN_SESSION: 'Apertura de caja',
    CLOSE_SESSION: 'Cierre de jornada',
    SCAN_QR: 'Escaneo de QR',
    OCR: 'Lectura OCR',
    CASH_COUNT: 'Arqueo de caja',
    DAILY_CLOSE: 'Cierre definitivo del día',
    EXPORT: 'Exportación de datos',
  };

  const entityLabels: Record<string, string> = {
    Operation: 'Operación',
    Voucher: 'Voucher',
    CashCount: 'Arqueo',
    DailyClosing: 'Cierre Diario',
    CashSession: 'Jornada de Caja',
    Settings: 'Configuración',
    User: 'Usuario',
  };

  return (
    <div className="w-full space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-2xl text-white shadow-sm">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">PANEL DEL DUEÑO</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Supervisión de caja, equipo de vendedores y auditoría total
            </p>
          </div>
        </div>

        {activeTab === 'team' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer self-start md:self-auto"
          >
            <UserPlus size={16} />
            <span>+ Crear Vendedor / Asesor</span>
          </button>
        )}
      </div>

      {/* Action Messages */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 hover:text-rose-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Resumen General
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'operations' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Historial de Días
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'team' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={14} />
          <span>Equipo & Vendedores</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 min-w-[120px] py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Registro de Auditoría
        </button>
      </div>

      {loading && activeTab !== 'team' && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {!loading && stats && activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex justify-end gap-1.5">
            {(['daily', 'weekly', 'monthly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPeriod(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  period === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'daily' ? 'Hoy' : t === 'weekly' ? 'Esta Semana' : 'Este Mes'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Ingresos</span>
                <ArrowDownRight size={18} />
              </div>
              <div className="text-xl font-black text-emerald-700">+{formatCOP(stats.summary.totalIncome)}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Egresos</span>
                <ArrowUpRight size={18} />
              </div>
              <div className="text-xl font-black text-rose-700">-{formatCOP(stats.summary.totalExpense)}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Operaciones</span>
              <div className="text-xl font-black text-slate-900">{stats.summary.totalOperations}</div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Diferencia Total</span>
              <div className={`text-xl font-black ${
                stats.summary.totalDifference === 0 ? 'text-emerald-700' :
                stats.summary.totalDifference > 0 ? 'text-amber-800' : 'text-rose-700'
              }`}>
                {stats.summary.totalDifference >= 0 ? '+' : ''}{formatCOP(stats.summary.totalDifference)}
              </div>
            </div>
          </div>

          {stats.byCategory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider">
                Movimientos por Tipo de Operación
              </div>
              <div className="divide-y divide-slate-100">
                {stats.byCategory.map((cat) => (
                  <div key={cat.name} className="px-6 py-3.5 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-bold text-slate-900">{cat.name}</div>
                      <div className="text-xs text-slate-400">{cat.count} operaciones registradas</div>
                    </div>
                    <div className={`font-black ${cat.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {cat.type === 'INGRESO' ? '+' : ''}{formatCOP(cat.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPERATIONS HISTORY */}
      {!loading && stats && activeTab === 'operations' && (
        <div className="space-y-3">
          {stats.closings.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Calendar size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold text-slate-500">No hay cierres en este período</p>
            </div>
          ) : (
            stats.closings.map((c) => (
              <div key={c.date} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 text-sm capitalize">
                    {new Date(c.date + 'T12:00:00').toLocaleDateString('es-CO', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {c.operationsCount} operaciones • Cerrado por {c.user?.name}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-emerald-700 font-bold">+{formatCOP(c.totalIncome)}</div>
                  <div className="text-xs text-rose-700 font-bold">-{formatCOP(c.totalExpense)}</div>
                  <div className={`text-xs font-black mt-1 ${
                    c.status === 'CUADRADO' ? 'text-emerald-700' :
                    c.status === 'SOBRANTE' ? 'text-amber-800' : 'text-rose-700'
                  }`}>
                    {c.status === 'CUADRADO' ? 'Cuadrado' : `${c.status}: ${formatCOP(c.difference)}`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: EQUIPO Y VENDEDORES */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <Sparkles size={20} className="text-yellow-400" />
              <h3 className="font-black text-sm uppercase tracking-wider text-emerald-400">
                ¿Cómo funciona el perfil del Vendedor / Operador?
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 pt-1">
              <div className="space-y-1.5 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400" />
                  Lo que el Vendedor PUEDE hacer:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>Escanear vouchers y tickets térmicos con IA</li>
                  <li>Usar el Modo Ráfaga (Auto-guardado en 3s)</li>
                  <li>Registrar ingresos, depósitos, pagos y retiros</li>
                  <li>Realizar el arqueo de billetes y monedas de su turno</li>
                </ul>
              </div>

              <div className="space-y-1.5 bg-white/5 p-3.5 rounded-2xl border border-white/10">
                <p className="font-bold text-rose-300 flex items-center gap-1.5">
                  <Lock size={14} className="text-rose-400" />
                  Lo que el Vendedor NO PUEDE ver:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  <li>No tiene acceso a este <strong>Panel del Dueño</strong></li>
                  <li>No puede modificar llaves API ni configuración del negocio</li>
                  <li>No puede eliminar usuarios ni alterar auditorías</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                <span>Miembros Registrados ({team.length})</span>
              </div>
              <button
                onClick={loadTeam}
                className="text-slate-400 hover:text-slate-700 text-xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={13} className={loadingTeam ? 'animate-spin' : ''} />
                <span>Actualizar</span>
              </button>
            </div>

            {loadingTeam && (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-emerald-600" />
              </div>
            )}

            {!loadingTeam && team.length === 0 && (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Users size={36} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No hay usuarios adicionales registrados</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm hover:bg-emerald-700 cursor-pointer"
                >
                  + Crear primer vendedor
                </button>
              </div>
            )}

            {!loadingTeam && team.length > 0 && (
              <div className="divide-y divide-slate-100">
                {team.map((member) => {
                  const isCurrent = member.id === currentUserId;
                  const isOwnerRole = member.role === 'DUENO' || member.role === 'ADMIN';

                  return (
                    <div
                      key={member.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs ${
                          isOwnerRole ? 'bg-slate-900 text-white' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900">{member.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                                Tú (Sesión actual)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-medium">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Mail size={12} className="text-slate-400" />
                              {member.email}
                            </span>
                            <span>•</span>
                            <span>{member._count?.operations || 0} operaciones</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${
                          member.role === 'DUENO' ? 'bg-slate-900 text-white' :
                          member.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {member.role === 'DUENO' ? 'DUEÑO' : member.role === 'ADMIN' ? 'ADMIN' : 'VENDEDOR / ASESOR'}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          member.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {member.active ? 'Activo' : 'Inactivo'}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordModal(member);
                            setResetPassValue('');
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                          title="Cambiar Contraseña"
                        >
                          <Key size={14} />
                        </button>

                        {!isCurrent && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(member)}
                              className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                                member.active
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              title={member.active ? 'Desactivar Usuario' : 'Activar Usuario'}
                            >
                              {member.active ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowDeleteModal(member)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition cursor-pointer"
                              title="Eliminar Usuario"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {!loading && activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} /> Registro Cronológico de Acciones
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">Sin registros de auditoría</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-6 py-3.5 flex items-center justify-between text-xs hover:bg-slate-50/70 transition">
                  <div>
                    <div className="font-bold text-slate-900">
                      {actionLabels[log.action] || log.action} • <span className="text-slate-500 font-normal">{entityLabels[log.entity] || log.entity}</span>
                    </div>
                    {log.userName && (
                      <div className="text-slate-400 mt-0.5">Usuario: <strong className="text-slate-600">{log.userName}</strong></div>
                    )}
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">
                    {new Date(log.createdAt).toLocaleString('es-CO', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE VENDOR / USER */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Crear Nuevo Miembro</h3>
                  <p className="text-[11px] text-slate-400">Acceso exclusivo para registrar y escanear</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Nombre del Vendedor / Asesor *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: María López o Carlos Caja 1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Correo o Usuario de Ingreso *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="vendedor@corvix.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Contraseña de Acceso *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres (ej: 123456)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Rol y Permisos
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('OPERADOR')}
                    className={`p-3 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                      newRole === 'OPERADOR'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-black text-emerald-800">VENDEDOR / OPERADOR</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Solo escaneo, vouchers y registro de caja</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRole('ADMIN')}
                    className={`p-3 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                      newRole === 'ADMIN'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-black text-purple-800">ADMINISTRADOR</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Acceso completo con panel del dueño</div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  {savingUser && <Loader2 size={14} className="animate-spin" />}
                  <span>{savingUser ? 'Guardando...' : 'Crear Usuario'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-800">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Cambiar Contraseña</h3>
                  <p className="text-[11px] text-slate-400">{showPasswordModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Nueva Contraseña para {showPasswordModal.name}
                </label>
                <input
                  type="password"
                  required
                  value={resetPassValue}
                  onChange={(e) => setResetPassValue(e.target.value)}
                  placeholder="Escribe la nueva clave..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resettingPass}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  {resettingPass && <Loader2 size={14} className="animate-spin" />}
                  <span>{resettingPass ? 'Cambiando...' : 'Guardar Nueva Clave'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 rounded-xl text-rose-700">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Eliminar Usuario</h3>
                  <p className="text-[11px] text-slate-400">Confirmación de seguridad</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                ¿Estás seguro de que deseas eliminar permanentemente a <strong className="text-slate-900 font-bold">{showDeleteModal.name}</strong> ({showDeleteModal.email})?
              </p>
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed">
                ⚠️ Si el usuario no tiene operaciones financieras, se eliminará por completo del sistema.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingUser}
                onClick={() => handleDeleteUser(showDeleteModal)}
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                {deletingUser ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{deletingUser ? 'Eliminando...' : 'Sí, Eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
