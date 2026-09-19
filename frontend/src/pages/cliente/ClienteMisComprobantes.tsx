import React, { useState } from 'react';
import { FileText, Download, Search, Calendar } from 'lucide-react';
import { useTableSort } from '../../hooks/useTableSort';
import { SortableHeader } from '../../components/ui/SortableHeader';

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

  const { sortedData, sortColumn, sortDirection, handleSort } = useTableSort(filteredInvoices, {
    initialSortColumn: 'date',
    initialSortDirection: 'desc'
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-client-text-primary font-sans uppercase">Mis Comprobantes</h1>
          <p className="text-xs text-client-text-secondary mt-0.5">Historial de facturación y comprobantes de pago.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-[#111111] border border-[#222222] rounded-xl px-3 py-1.5">
          <Calendar className="w-4 h-4 text-[#00A8E8]" />
          <select 
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
          >
            <option value="2026" className="bg-[#111111] text-white">2026</option>
            <option value="2025" className="bg-[#111111] text-white">2025</option>
          </select>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#222222] rounded-xl flex flex-col min-h-[400px] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111111]">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Buscar por N° Factura..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black border border-[#222222] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#94A3B8]/50 focus:border-[#00A8E8] outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-[#1E293B] border-b border-[#222222]">
                <SortableHeader label="Comprobante" column="id" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                <SortableHeader label="Fecha Emisión" column="date" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                <SortableHeader label="Monto ($)" column="amount" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                <SortableHeader label="Estado" column="status" currentSortColumn={sortColumn as string} currentSortDirection={sortDirection} onSort={handleSort as any} />
                <th className="py-3 px-4 text-right text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222222]/40 bg-[#111111]">
              {sortedData.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/5 transition-colors group">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#00A8E8]" />
                      <span className="font-mono font-bold text-[13px] text-[#00A8E8] group-hover:text-[#38BDF8] transition-colors">
                        {inv.id}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#94A3B8] text-[13px] font-medium">{inv.date}</td>
                  <td className="py-3.5 px-4 text-white font-mono font-bold text-[13px]">${inv.amount.toFixed(2)}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-xs font-bold uppercase tracking-wide bg-emerald-500/10 text-[#4ADE80] border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="p-1.5 hover:bg-white/10 rounded-lg text-[#94A3B8] hover:text-white transition-colors" title="Descargar PDF">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#94A3B8] text-sm">
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
