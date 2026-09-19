import React, { useState } from 'react';
import { Calendar, Activity, SlidersHorizontal, RefreshCw } from 'lucide-react';

export type RealTimeWindow = '30min' | '1h' | '3h' | '1d' | '7d' | '30d';

export interface DashboardFilterState {
  modo: 'historico' | 'tiempo_real';
  year: string;
  month: string;
  rango: 'ALL' | '6m' | '12m';
  incluyeMesEnCurso: boolean;
  tiempoRealWindow?: RealTimeWindow;
}

interface DashboardFilterBarProps {
  initialState?: Partial<DashboardFilterState>;
  onFilterChange?: (filters: DashboardFilterState) => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export const DashboardFilterBar: React.FC<DashboardFilterBarProps> = ({
  initialState,
  onFilterChange,
  onRefresh,
  loading = false,
  className = ''
}) => {
  const [filters, setFilters] = useState<DashboardFilterState>({
    modo: initialState?.modo || 'historico',
    year: initialState?.year || 'ALL',
    month: initialState?.month || 'ALL',
    rango: initialState?.rango || '12m',
    incluyeMesEnCurso: initialState?.incluyeMesEnCurso ?? true,
    tiempoRealWindow: initialState?.tiempoRealWindow || '30d',
  });

  const updateFilter = (updates: Partial<DashboardFilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const handleModeChange = (modo: 'historico' | 'tiempo_real') => {
    updateFilter({ modo });
  };

  const handleRangeChange = (rango: 'ALL' | '6m' | '12m') => {
    updateFilter({ rango, year: 'ALL', month: 'ALL' });
  };

  const handleRealTimeWindowChange = (tiempoRealWindow: RealTimeWindow) => {
    updateFilter({ tiempoRealWindow });
  };

  return (
    <div className={`bg-client-bg-surface border border-client-border rounded-2xl p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm ${className}`}>
      {/* Left / Center Controls */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Mode Segmented Switch */}
        <div className="inline-flex p-1 bg-client-bg-subtle border border-client-border rounded-xl">
          <button
            type="button"
            onClick={() => handleModeChange('historico')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filters.modo === 'historico'
                ? 'bg-client-primary text-white shadow-xs'
                : 'text-client-text-secondary hover:text-client-text-primary'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Histórico mensual</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('tiempo_real')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filters.modo === 'tiempo_real'
                ? 'bg-client-primary text-white shadow-xs'
                : 'text-client-text-secondary hover:text-client-text-primary'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Operativo / Tiempo Real</span>
          </button>
        </div>

        {/* Dynamic Controls depending on Mode */}
        {filters.modo === 'historico' ? (
          <>
            {/* Year Dropdown */}
            <select
              value={filters.year}
              onChange={(e) => updateFilter({ year: e.target.value, rango: 'ALL' })}
              className="bg-client-bg-subtle border border-client-border rounded-xl px-3 py-2 text-xs font-semibold text-client-text-primary focus:border-client-primary outline-none cursor-pointer"
            >
              <option value="ALL">Todos los años</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            {/* Month Dropdown */}
            <select
              value={filters.month}
              onChange={(e) => updateFilter({ month: e.target.value, rango: 'ALL' })}
              className="bg-client-bg-subtle border border-client-border rounded-xl px-3 py-2 text-xs font-semibold text-client-text-primary focus:border-client-primary outline-none cursor-pointer"
            >
              <option value="ALL">Todos los meses</option>
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>

            {/* Preset Range Segmented Pills */}
            <div className="inline-flex p-1 bg-client-bg-subtle border border-client-border rounded-xl">
              <button
                type="button"
                onClick={() => handleRangeChange('6m')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filters.rango === '6m'
                    ? 'bg-client-primary text-white shadow-xs'
                    : 'text-client-text-secondary hover:text-client-text-primary'
                }`}
              >
                Últimos 6 meses
              </button>
              <button
                type="button"
                onClick={() => handleRangeChange('12m')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filters.rango === '12m'
                    ? 'bg-client-primary text-white shadow-xs'
                    : 'text-client-text-secondary hover:text-client-text-primary'
                }`}
              >
                Últimos 12 meses
              </button>
            </div>

            {/* Toggle Current Month */}
            <button
              type="button"
              onClick={() => updateFilter({ incluyeMesEnCurso: !filters.incluyeMesEnCurso })}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filters.incluyeMesEnCurso
                  ? 'bg-client-primary/10 border-client-primary text-client-primary'
                  : 'bg-client-bg-subtle border-client-border text-client-text-secondary hover:text-client-text-primary'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Incluye mes en curso</span>
            </button>
          </>
        ) : (
          /* Mode 2: Operativo / Tiempo Real - Time Window Segmented Control */
          <div className="inline-flex p-1 bg-client-bg-subtle border border-client-border rounded-xl">
            {(['30min', '1h', '3h', '1d', '7d', '30d'] as RealTimeWindow[]).map((win) => {
              const label = win === '1d' ? '1d (24h)' : win;
              const isActive = filters.tiempoRealWindow === win;
              return (
                <button
                  key={win}
                  type="button"
                  onClick={() => handleRealTimeWindowChange(win)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-client-primary text-white shadow-xs'
                      : 'text-client-text-secondary hover:text-client-text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right / Refresh Button */}
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Actualizar datos"
          className="p-2.5 bg-client-bg-subtle border border-client-border hover:bg-client-border text-client-text-primary rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default DashboardFilterBar;
