import React, { useState } from 'react';
import { FileText, Download, Search, Calendar } from 'lucide-react';

export const ClienteMisComprobantes: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');

  // Simulated invoice data for the client
  const mockInvoices = [
    { id: 'INV-2026-08', date: '2026-08-01', amount: 1250.00, status: 'Pagado' },
    { id: 'INV-2026-07', date: '2026-07-01', amount: 1100.50, status: 'Pagado' },
    { id: 'INV-2026-06', date: '2026-06-01', amount: 1340.25, status: 'Pagado' },
    { id: 'INV-2026-05', date: '2026-05-01', amount: 1250.00, status: 'Pagado' },
    { id: 'INV-2026-04', date: '2026-04-01', amount: 1250.00, status: 'Pagado' },
  ];

  const filteredInvoices = mockInvoices.filter(inv => 
    inv.id.toLowerCase().includes(searchQuery.toLowerCase()) && 
    inv.date.startsWith(selectedYear)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">Mis Comprobantes</h1>
          <p className="text-xs text-st-muted mt-0.5">Historial de facturación y comprobantes de pago.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-st-surface border border-st-border rounded-lg p-1.5">
          <div className="flex items-center pl-2 pr-1 border-r border-st-border">
            <Calendar className="w-4 h-4 text-st-accent" />
          </div>
          <select 
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none px-2"
          >
            <option value="2026" className="bg-st-surface">2026</option>
            <option value="2025" className="bg-st-surface">2025</option>
          </select>
        </div>
      </div>

      <div className="bg-st-surface border border-st-border rounded-xl flex flex-col min-h-[400px]">
        <div className="p-4 border-b border-st-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-st-muted" />
            <input
              type="text"
              placeholder="Buscar por N° Factura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-st-accent outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-st-bg/80 text-st-muted uppercase tracking-wider font-semibold border-b border-st-border">
                <th className="py-3 px-4">Comprobante</th>
                <th className="py-3 px-4">Fecha Emisión</th>
                <th className="py-3 px-4">Monto ($)</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="border-b border-st-border/50 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-white font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-st-accent" />
                    {inv.id}
                  </td>
                  <td className="py-3 px-4 text-st-muted">{inv.date}</td>
                  <td className="py-3 px-4 text-white font-mono">${inv.amount.toFixed(2)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400">
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1.5 hover:bg-white/10 rounded text-st-muted hover:text-white transition-colors" title="Descargar PDF">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-st-muted text-sm">
                    No se encontraron comprobantes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClienteMisComprobantes;
