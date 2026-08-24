'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { formatCOP } from '@/lib/calculations';
import { BarChart3, TrendingUp, TrendingDown, Calendar, Download, ArrowDownRight, ArrowUpRight, FileText, Layers, Wallet, RefreshCw } from 'lucide-react';

import ExcelJS from 'exceljs';

interface ReportData {
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
  byCategory: Array<{ name: string; type: string; total: number; count: number }>;
  closings: Array<{
    date: string;
    totalIncome: number;
    totalExpense: number;
    difference: number;
    status: string;
    operationsCount: number;
  }>;
  operations?: Array<{
    id: string;
    date: string;
    operatedAt: string;
    type: string;
    category: string;
    amount: number;
    fee: number;
    reference: string;
    userName: string;
  }>;
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const typeLabels = { daily: 'Hoy', weekly: 'Esta Semana', monthly: 'Este Mes' };

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${type}`);
      const data = await res.json();
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [type]);

  const exportExcel = async () => {
    if (!report) return;
    setExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CORVIX Control de Caja';
      workbook.lastModifiedBy = 'CORVIX Intelligence';
      workbook.created = new Date();

      const primaryDark = 'FF0F172A';
      const emeraldPrimary = 'FF047857';
      const emeraldHeader = 'FF059669';
      const emeraldLight = 'FFECFDF5';
      const roseLight = 'FFFFF1F2';
      const slateLight = 'FFF8FAFC';
      const white = 'FFFFFFFF';
      const grayBorder = 'FFE2E8F0';

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: grayBorder } },
        left: { style: 'thin', color: { argb: grayBorder } },
        bottom: { style: 'thin', color: { argb: grayBorder } },
        right: { style: 'thin', color: { argb: grayBorder } },
      };

      // =========================================================================
      // HOJA 1: RESUMEN EJECUTIVO
      // =========================================================================
      const ws1 = workbook.addWorksheet('Resumen Ejecutivo', {
        views: [{ showGridLines: true }],
      });

      ws1.mergeCells('A1:E2');
      const titleCell = ws1.getCell('A1');
      titleCell.value = 'CORVIX • CONTROL INTELIGENTE DE CAJA';
      titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: white } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryDark } };

      ws1.mergeCells('A3:E3');
      const subCell = ws1.getCell('A3');
      subCell.value = `INFORME FINANCIERO CONSOLIDADO — Período: ${typeLabels[type]} (Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })})`;
      subCell.font = { name: 'Calibri', size: 10, italic: true, bold: true, color: { argb: white } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emeraldPrimary } };

      ws1.addRow([]);

      ws1.mergeCells('A5:E5');
      const kpiTitle = ws1.getCell('A5');
      kpiTitle.value = 'INDICADORES CLAVE DE RENDIMIENTO (KPI)';
      kpiTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: primaryDark } };
      kpiTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: slateLight } };
      kpiTitle.border = thinBorder;

      const kpiData: Array<[string, number, string, string]> = [
        ['Total Ingresos Recibidos (+Entró)', report.summary.totalIncome, 'Entradas de dinero por recaudos y depósitos', emeraldLight],
        ['Total Egresos Entregados (-Salió)', report.summary.totalExpense, 'Salidas de dinero por retiros y pagos', roseLight],
        ['Diferencia Neta de Caja', report.summary.totalIncome - report.summary.totalExpense, 'Flujo neto registrado en el período', slateLight],
        ['Total Transacciones Procesadas', report.summary.totalOperations, 'Cantidad total de operaciones registradas', slateLight],
        ['Días con Movimientos', report.summary.daysWithData, 'Jornadas activas en el rango seleccionado', slateLight],
      ];

      kpiData.forEach(([label, val, desc, bgColor]) => {
        const row = ws1.addRow([label, val, desc]);
        const cellA = row.getCell(1);
        const cellB = row.getCell(2);
        const cellC = row.getCell(3);

        cellA.font = { name: 'Calibri', size: 11, bold: true };
        cellA.border = thinBorder;

        cellB.font = { name: 'Calibri', size: 12, bold: true };
        cellB.border = thinBorder;
        cellB.alignment = { horizontal: 'right' };
        if (typeof val === 'number' && label !== 'Total Transacciones Procesadas' && label !== 'Días con Movimientos') {
          cellB.numFmt = '$ #,##0';
        }

        cellC.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
        cellC.border = thinBorder;

        if (bgColor) {
          cellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        }
      });

      ws1.addRow([]);

      const catHeaderRow = ws1.addRow(['DESGLOSE POR CATEGORÍA Y CONCEPTO', '', '', '', '']);
      ws1.mergeCells(`A${catHeaderRow.number}:E${catHeaderRow.number}`);
      const catTitle = catHeaderRow.getCell(1);
      catTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: white } };
      catTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emeraldHeader } };
      catTitle.alignment = { horizontal: 'left', vertical: 'middle' };

      const catSubRow = ws1.addRow(['Concepto / Categoría', 'Tipo Flujo', 'No. Operaciones', 'Total Operado (COP)', '% Participación']);
      catSubRow.font = { name: 'Calibri', size: 10, bold: true, color: { argb: white } };
      catSubRow.alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = 1; c <= 5; c++) {
        const cell = catSubRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryDark } };
        cell.border = thinBorder;
      }

      const grandTotalOps = report.byCategory.reduce((acc, curr) => acc + curr.total, 0) || 1;

      report.byCategory.forEach((cat) => {
        const row = ws1.addRow([
          cat.name,
          cat.type,
          cat.count,
          cat.total,
          cat.total / grandTotalOps,
        ]);

        row.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
        row.getCell(1).border = thinBorder;

        const typeCell = row.getCell(2);
        typeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: cat.type === 'INGRESO' ? 'FF047857' : 'FFE11D48' } };
        typeCell.alignment = { horizontal: 'center' };
        typeCell.border = thinBorder;

        const countCell = row.getCell(3);
        countCell.alignment = { horizontal: 'center' };
        countCell.border = thinBorder;

        const amountCell = row.getCell(4);
        amountCell.numFmt = '$ #,##0';
        amountCell.font = { name: 'Calibri', size: 10, bold: true };
        amountCell.alignment = { horizontal: 'right' };
        amountCell.border = thinBorder;

        const pctCell = row.getCell(5);
        pctCell.numFmt = '0.0%';
        pctCell.alignment = { horizontal: 'right' };
        pctCell.border = thinBorder;
      });

      ws1.getColumn(1).width = 38;
      ws1.getColumn(2).width = 22;
      ws1.getColumn(3).width = 20;
      ws1.getColumn(4).width = 24;
      ws1.getColumn(5).width = 18;

      // =========================================================================
      // HOJA 2: JORNADAS & CIERRES DIARIOS
      // =========================================================================
      const ws2 = workbook.addWorksheet('Cierres Diarios', {
        views: [{ showGridLines: true }],
      });

      ws2.mergeCells('A1:F2');
      const ws2Title = ws2.getCell('A1');
      ws2Title.value = 'HISTORIAL DIARIO DE JORNADAS Y CIERRES DE CAJA';
      ws2Title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: white } };
      ws2Title.alignment = { horizontal: 'center', vertical: 'middle' };
      ws2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryDark } };

      const h2Row = ws2.addRow(['Fecha Jornada', 'Estado de Cuadre', 'No. Transacciones', 'Total Ingresos (COP)', 'Total Egresos (COP)', 'Diferencia de Caja (COP)']);
      h2Row.font = { name: 'Calibri', size: 10, bold: true, color: { argb: white } };
      for (let c = 1; c <= 6; c++) {
        const cell = h2Row.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emeraldHeader } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;
      }

      report.closings.forEach((cl, index) => {
        const row = ws2.addRow([
          cl.date,
          cl.status,
          cl.operationsCount,
          cl.totalIncome,
          cl.totalExpense,
          cl.difference,
        ]);

        const isEven = index % 2 === 0;
        const rowBg = isEven ? white : slateLight;

        for (let c = 1; c <= 6; c++) {
          const cell = row.getCell(c);
          cell.border = thinBorder;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }

        row.getCell(1).alignment = { horizontal: 'center' };
        row.getCell(1).font = { name: 'Calibri', size: 10, bold: true };

        const statusCell = row.getCell(2);
        statusCell.alignment = { horizontal: 'center' };
        statusCell.font = { name: 'Calibri', size: 10, bold: true };
        if (cl.status === 'CUADRADO') statusCell.font.color = { argb: 'FF047857' };
        else if (cl.status.includes('ABIERTA') || cl.status.includes('EN CURSO')) statusCell.font.color = { argb: 'FFB45309' };
        else statusCell.font.color = { argb: 'FFE11D48' };

        row.getCell(3).alignment = { horizontal: 'center' };

        const incCell = row.getCell(4);
        incCell.numFmt = '$ #,##0';
        incCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
        incCell.alignment = { horizontal: 'right' };

        const expCell = row.getCell(5);
        expCell.numFmt = '$ #,##0';
        expCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFE11D48' } };
        expCell.alignment = { horizontal: 'right' };

        const difCell = row.getCell(6);
        difCell.numFmt = '$ #,##0';
        difCell.font = { name: 'Calibri', size: 10, bold: true };
        difCell.alignment = { horizontal: 'right' };
      });

      ws2.getColumn(1).width = 18;
      ws2.getColumn(2).width = 24;
      ws2.getColumn(3).width = 20;
      ws2.getColumn(4).width = 24;
      ws2.getColumn(5).width = 24;
      ws2.getColumn(6).width = 24;

      // =========================================================================
      // HOJA 3: DETALLE DE TRANSACCIONES
      // =========================================================================
      if (report.operations && report.operations.length > 0) {
        const ws3 = workbook.addWorksheet('Transacciones', {
          views: [{ showGridLines: true }],
        });

        ws3.mergeCells('A1:H2');
        const ws3Title = ws3.getCell('A1');
        ws3Title.value = 'REGISTRO DETALLADO DE TRANSACCIONES';
        ws3Title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: white } };
        ws3Title.alignment = { horizontal: 'center', vertical: 'middle' };
        ws3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryDark } };

        const h3Row = ws3.addRow(['#', 'Fecha & Hora', 'Tipo Flujo', 'Categoría / Concepto', 'Referencia / Op#', 'Monto Operación (COP)', 'Comisión Ganada (COP)', 'Cajero']);
        h3Row.font = { name: 'Calibri', size: 10, bold: true, color: { argb: white } };
        for (let c = 1; c <= 8; c++) {
          const cell = h3Row.getCell(c);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: emeraldHeader } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = thinBorder;
        }

        report.operations.forEach((op, idx) => {
          const row = ws3.addRow([
            idx + 1,
            new Date(op.operatedAt).toLocaleString('es-CO'),
            op.type,
            op.category,
            op.reference,
            op.amount,
            op.fee,
            op.userName,
          ]);

          const isEven = idx % 2 === 0;
          const rowBg = isEven ? white : slateLight;

          for (let c = 1; c <= 8; c++) {
            const cell = row.getCell(c);
            cell.border = thinBorder;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          }

          row.getCell(1).alignment = { horizontal: 'center' };
          row.getCell(2).alignment = { horizontal: 'center' };

          const typeCell = row.getCell(3);
          typeCell.alignment = { horizontal: 'center' };
          typeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: op.type === 'INGRESO' ? 'FF047857' : 'FFE11D48' } };

          row.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
          row.getCell(5).alignment = { horizontal: 'left' };

          const amtCell = row.getCell(6);
          amtCell.numFmt = '$ #,##0';
          amtCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: op.type === 'INGRESO' ? 'FF047857' : 'FFE11D48' } };
          amtCell.alignment = { horizontal: 'right' };

          const feeCell = row.getCell(7);
          feeCell.numFmt = '$ #,##0';
          feeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
          feeCell.alignment = { horizontal: 'right' };

          row.getCell(8).alignment = { horizontal: 'left' };
        });

        ws3.getColumn(1).width = 8;
        ws3.getColumn(2).width = 24;
        ws3.getColumn(3).width = 14;
        ws3.getColumn(4).width = 28;
        ws3.getColumn(5).width = 26;
        ws3.getColumn(6).width = 24;
        ws3.getColumn(7).width = 24;
        ws3.getColumn(8).width = 20;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-financiero-corvix-${type}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error generating Excel report:', e);
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ['Fecha', 'Ingresos', 'Egresos', 'Diferencia', 'Estado', 'Operaciones'],
      ...report.closings.map((c) => [
        c.date,
        c.totalIncome,
        c.totalExpense,
        c.difference,
        c.status,
        c.operationsCount,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-corvix-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reportes Financieros</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Consolidado de ingresos, egresos y balances de caja</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="flex gap-1 bg-slate-200/70 p-1 rounded-2xl border border-slate-200">
            {(['daily', 'weekly', 'monthly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  type === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {typeLabels[t]}
              </button>
            ))}
          </div>

          <button
            onClick={loadReport}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Styled Excel Export Button */}
          <button
            onClick={exportExcel}
            disabled={exporting || !report}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-black transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Descargar reporte en formato Excel (.xlsx)"
          >
            <Download size={14} className={exporting ? 'animate-bounce' : ''} />
            <span>{exporting ? 'Exportando...' : 'Exportar Excel (.xlsx)'}</span>
          </button>

          {/* Secondary CSV Export */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
            title="Exportar archivo CSV plano"
          >
            <FileText size={13} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ingresos Totales</span>
                <ArrowDownRight size={20} />
              </div>
              <div className="text-2xl font-black text-emerald-700">+{formatCOP(report.summary.totalIncome)}</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Retiros / Egresos</span>
                <ArrowUpRight size={20} />
              </div>
              <div className="text-2xl font-black text-rose-700">-{formatCOP(report.summary.totalExpense)}</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Transacciones</span>
                <Layers size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{report.summary.totalOperations}</div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Días Registrados</span>
                <Calendar size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{report.summary.daysWithData}</div>
            </div>
          </div>

          {/* 2-Column Grid: By Category + Daily Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By category */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider">
                Desglose por Categoría
              </div>
              {report.byCategory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  Sin operaciones por categoría
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {report.byCategory
                    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
                    .map((cat) => (
                      <div key={cat.name} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-slate-50/70 transition">
                        <div>
                          <div className="font-bold text-slate-900">{cat.name}</div>
                          <div className="text-xs text-slate-400">{cat.count} transacciones</div>
                        </div>
                        <div className={`font-black ${cat.type === 'INGRESO' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {cat.type === 'INGRESO' ? '+' : '-'}{formatCOP(Math.abs(cat.total))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Daily Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} /> Detalle Cronológico por Día
              </div>
              {report.closings.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No hay movimientos registrados para este período
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {report.closings.map((c) => (
                    <div key={c.date} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-slate-50/70 transition">
                      <div>
                        <div className="font-bold text-slate-900 capitalize">
                          {new Date(c.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span>{c.operationsCount} operaciones</span>
                          <span>•</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            c.status.includes('ABIERTA') || c.status.includes('EN CURSO')
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : c.status === 'CUADRADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-emerald-700 font-black">+{formatCOP(c.totalIncome)}</div>
                        {c.totalExpense > 0 && (
                          <div className="text-xs text-rose-700 font-black">-{formatCOP(c.totalExpense)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
