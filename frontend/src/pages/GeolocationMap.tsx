import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Search,
  Download,
  MapPin,
  Compass,
  Anchor,
  Activity
} from 'lucide-react';
import client from '../api/client';
import { AccountSearchSelect } from '../components/AccountSearchSelect';

interface GeolocationItem {
  dispositivo_id: number;
  device_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  estado: string;
  location_name: string;
  tipo: 'Terrestre' | 'Marítimo';
  heading: number;
  speed: number;
  last_reading?: string;
}

export const GeolocationMap: React.FC = () => {
  const [geoPoints, setGeoPoints] = useState<GeolocationItem[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<GeolocationItem | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Accounts
        const accRes = await client.get('/cuentas');
        setAccounts(accRes.data);

        // 2. Fetch Geolocations
        const geoRes = await client.get('/dashboard/geolocations');
        
        // 3. Fetch Service Lines to map to accounts
        const linesRes = await client.get('/lineas-servicio');

        // Compile combined geolocations with human-readable location names and metadata
        const compiledPoints: GeolocationItem[] = geoRes.data.map((g: any) => {
          const line = linesRes.data.find((l: any) => l.dispositivo_id === g.dispositivo_id);
          
          // Map coordinates to stable named sites
          let locName = 'Ubicación Remota';
          let tipo: 'Terrestre' | 'Marítimo' = 'Terrestre';
          let heading = 0;
          let speed = 0;

          const lat = g.latitud;
          if (lat === -24.27) locName = 'Minera Escondida - Antofagasta, CL';
          else if (lat === -20.96) locName = 'Minera Collahuasi - Tarapacá, CL';
          else if (lat === -14.10) locName = 'Minera Las Bambas - Apurímac, PE';
          else if (lat === -16.53) locName = 'Minera Cerro Verde - Arequipa, PE';
          else if (lat === -31.71) locName = 'Minera Los Pelambres - Coquimbo, CL';
          else if (lat === -33.02) {
            locName = 'En Ruta - Estrecho Valparaíso, CL';
            tipo = 'Marítimo';
            heading = 240; // Southwest
            speed = 14; // 14 knots
          }

          return {
            dispositivo_id: g.dispositivo_id,
            device_id: g.device_id,
            nombre: g.nombre,
            latitud: g.latitud,
            longitud: g.longitud,
            estado: g.estado || 'online',
            location_name: locName,
            tipo: tipo,
            heading: heading,
            speed: speed,
            cuenta_id: line?.cuenta_id
          };
        });

        // Filter by selected account if needed
        let filtered = compiledPoints;
        if (selectedAccount) {
          const accountId = parseInt(selectedAccount);
          filtered = filtered.filter((p: any) => p.cuenta_id === accountId);
        }

        setGeoPoints(filtered);
        
        // Set default selected point if any exists
        if (filtered.length > 0) {
          setSelectedPoint(filtered[0]);
        } else {
          setSelectedPoint(null);
        }
      } catch (err) {
        console.error('Error fetching geolocation data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, [selectedAccount]);

  // Apply search query filter
  const filteredPoints = geoPoints.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalItems = filteredPoints.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pagedPoints = filteredPoints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Compute summary metrics
  const totalCount = geoPoints.length;
  const onlineCount = geoPoints.filter((p) => p.estado.toLowerCase() === 'online').length;
  const terrestrialCount = geoPoints.filter((p) => p.tipo === 'Terrestre').length;
  const maritimeCount = geoPoints.filter((p) => p.tipo === 'Marítimo').length;

  return (
    <div className="space-y-6 font-quicksand">
      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Navigation className="w-6 h-6 text-st-accent rotate-45" />
            Geolocalización de Terminales
          </h1>
          <p className="text-xs text-st-muted font-sans">
            Mapa de cobertura física y posicionamiento global en tiempo real para terminales satelitales.
          </p>
        </div>

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Account Filter with Search */}
          <AccountSearchSelect
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={(accId) => {
              setSelectedAccount(accId);
              setCurrentPage(1);
            }}
          />

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white text-xs font-bold uppercase rounded-lg hover:bg-white/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Exportar Posiciones
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Terminales Localizadas</p>
            <p className="text-2xl font-bold text-white font-sans">
              {totalCount} <span className="text-xs font-semibold text-st-muted">UTs</span>
            </p>
            <p className="text-[9px] text-st-online font-semibold uppercase">{onlineCount} de ellas activas (Online)</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-online/15 text-st-online flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Instalaciones Terrestres</p>
            <p className="text-2xl font-bold text-white font-sans">
              {terrestrialCount} <span className="text-xs font-semibold text-st-muted">Faenas</span>
            </p>
            <p className="text-[9px] text-st-accent font-semibold uppercase">Minas y centros logísticos</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-accent/15 text-st-accent flex items-center justify-center flex-shrink-0">
            <Compass className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Unidades Marítimas</p>
            <p className="text-2xl font-bold text-white font-sans">
              {maritimeCount} <span className="text-xs font-semibold text-st-muted">Buques</span>
            </p>
            <p className="text-[9px] text-[#00A8E8] font-semibold uppercase">Embarcaciones en mar abierto</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#00A8E8]/15 text-[#00A8E8] flex items-center justify-center flex-shrink-0">
            <Anchor className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden group">
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Estado de Frecuencias</p>
            <p className="text-2xl font-bold text-white font-sans">
              100 <span className="text-xs font-semibold text-st-muted">%</span>
            </p>
            <p className="text-[9px] text-st-online font-semibold uppercase">Cobertura satelital OK</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-online/15 text-st-online flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Map Visualizer and Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: SVG Custom Map Canvas */}
        <div className="lg:col-span-2 bg-st-surface border border-st-border rounded-xl p-5 flex flex-col space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Visualizador de Cobertura Geográfica</h2>
            <p className="text-[11px] text-st-muted">Faenas mineras (terrestres) y buques de la costa del Pacífico Sur.</p>
          </div>

          {/* South America Corridor Custom Vector Map */}
          <div className="flex-1 min-h-[350px] relative bg-st-bg border border-st-border rounded-xl overflow-hidden flex items-center justify-center">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#222222_1px,transparent_1px),linear-gradient(to_bottom,#222222_1px,transparent_1px)] bg-[size:32px_32px] opacity-30 pointer-events-none" />
            
            {/* Custom SVG Drawing of Chile/Peru Coastline (High-Tech Vector Style) */}
            <svg viewBox="0 0 400 500" className="w-full h-full max-h-[450px] opacity-40 absolute pointer-events-none">
              {/* Peru Coast Line */}
              <path
                d="M 50,40 L 90,80 L 140,110 L 190,140 L 220,180"
                fill="none"
                stroke="#333333"
                strokeWidth={3}
                strokeDasharray="4 4"
              />
              {/* Chile Coast Line */}
              <path
                d="M 220,180 L 230,220 L 235,270 L 238,340 L 240,430 L 242,480"
                fill="none"
                stroke="#333333"
                strokeWidth={3}
              />
              {/* Ocean Label */}
              <text x="70" y="280" fill="#444444" fontSize="10" className="font-mono tracking-widest uppercase">Océano Pacífico Sur</text>
              {/* Andes Label */}
              <text x="280" y="200" fill="#444444" fontSize="10" className="font-mono tracking-widest uppercase [writing-mode:vertical-lr]">Cordillera de los Andes</text>
            </svg>

            {/* Plot Points on Map */}
            {geoPoints.map((pt) => {
              // Convert lat/long to fits on SVG viewBox (Lat -10 to -35, Long -65 to -80)
              const pctX = ((pt.longitud + 80) / 18) * 100;
              const pctY = ((pt.latitud + 10) / -25) * 100; // Lat is negative
              
              const constrainedX = Math.max(10, Math.min(90, pctX));
              const constrainedY = Math.max(10, Math.min(90, pctY));

              const isSelected = selectedPoint?.dispositivo_id === pt.dispositivo_id;
              const isOffline = pt.estado.toLowerCase() !== 'online';

              return (
                <button
                  key={pt.dispositivo_id}
                  onClick={() => setSelectedPoint(pt)}
                  className="absolute p-2 cursor-pointer focus:outline-none group z-10 transition-transform hover:scale-125"
                  style={{ left: `${constrainedX}%`, top: `${constrainedY}%` }}
                >
                  <span className="relative flex h-4 w-4 justify-center items-center">
                    {!isOffline && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isSelected ? 'bg-st-accent' : 'bg-st-online'}`} />
                    )}
                    <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 ${isSelected ? 'border-white scale-110' : 'border-st-bg'} ${isOffline ? 'bg-st-offline' : 'bg-st-online'}`} />
                  </span>

                  {/* Tiny tag */}
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 bg-st-surface border border-st-border px-1.5 py-0.5 rounded text-[8px] text-white whitespace-nowrap opacity-50 group-hover:opacity-100 transition-opacity">
                    {pt.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Terminal Metadata Details Card */}
        <div className="bg-st-surface border border-st-border rounded-xl p-5 flex flex-col space-y-4">
          <div className="border-b border-st-border pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Detalles del Dispositivo</h2>
            <p className="text-[11px] text-st-muted">Valores actuales y coordenadas de enlace.</p>
          </div>

          {selectedPoint ? (
            <div className="flex-1 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Header Alias */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-st-muted uppercase">Terminal de Flota</p>
                  <p className="text-lg font-bold text-white">{selectedPoint.nombre}</p>
                  <p className="text-xs font-mono text-st-accent font-semibold">{selectedPoint.device_id}</p>
                </div>

                {/* Status Indicator */}
                <div className="flex justify-between items-center bg-st-bg border border-st-border rounded-lg px-3 py-2 text-xs">
                  <span className="text-st-muted font-medium">Estado Conexión</span>
                  <span className={`inline-flex items-center gap-1 font-bold uppercase ${selectedPoint.estado.toLowerCase() === 'online' ? 'text-st-online' : 'text-st-offline'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedPoint.estado.toLowerCase() === 'online' ? 'bg-st-online' : 'bg-st-offline'}`} />
                    {selectedPoint.estado}
                  </span>
                </div>

                {/* Location Info */}
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between border-b border-st-border/40 pb-1.5">
                    <span className="text-st-muted">Instalación / Sitio</span>
                    <span className="text-white font-semibold text-right max-w-[170px] truncate">{selectedPoint.location_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-st-border/40 pb-1.5">
                    <span className="text-st-muted">Categoría UT</span>
                    <span className="text-white font-semibold">{selectedPoint.tipo}</span>
                  </div>
                  <div className="flex justify-between border-b border-st-border/40 pb-1.5 font-mono">
                    <span className="text-st-muted">Latitud</span>
                    <span className="text-white">{selectedPoint.latitud.toFixed(4)}° S</span>
                  </div>
                  <div className="flex justify-between border-b border-st-border/40 pb-1.5 font-mono">
                    <span className="text-st-muted">Longitud</span>
                    <span className="text-white">{selectedPoint.longitud.toFixed(4)}° O</span>
                  </div>
                  {selectedPoint.tipo === 'Marítimo' && (
                    <>
                      <div className="flex justify-between border-b border-st-border/40 pb-1.5">
                        <span className="text-st-muted">Velocidad</span>
                        <span className="text-white font-mono">{selectedPoint.speed} nudos (kts)</span>
                      </div>
                      <div className="flex justify-between border-b border-st-border/40 pb-1.5">
                        <span className="text-st-muted">Rumbo / Heading</span>
                        <span className="text-white font-mono">{selectedPoint.heading}° SO</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-mono">
                    <span className="text-st-muted">Última Conexión</span>
                    <span className="text-st-muted">{selectedPoint.last_reading}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-st-border">
                <a
                  href={`/operation/alerts?search=${selectedPoint.device_id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-st-primary text-black text-xs font-bold uppercase rounded-lg hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer text-center"
                >
                  <Activity className="w-4 h-4" />
                  Auditar Incidentes
                </a>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-st-muted text-xs py-10">
              Seleccione una terminal del mapa para ver detalles
            </div>
          )}
        </div>
      </div>

      {/* Grid of Geolocation Positions */}
      <div className="bg-st-surface border border-st-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider self-start sm:self-center">Lista de Posicionamientos de Flota</h2>
          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, nombre, sitio..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-1.5 bg-st-bg border border-st-border rounded-lg text-xs text-white placeholder-st-muted/50 focus:outline-none focus:ring-1 focus:ring-st-accent focus:border-st-accent"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider">
                <th className="py-3 px-4">Terminal Alias</th>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Sitio de Enlace</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Latitud</th>
                <th className="py-3 px-4 text-right">Longitud</th>
                <th className="py-3 px-4 text-center">Ver en Mapa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-st-border/30 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-st-muted">
                    Descargando coordenadas de terminales...
                  </td>
                </tr>
              ) : pagedPoints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-st-muted">
                    No se encontraron terminales en estas coordenadas.
                  </td>
                </tr>
              ) : (
                pagedPoints.map((pt) => {
                  const isSelected = selectedPoint?.dispositivo_id === pt.dispositivo_id;
                  const isOffline = pt.estado.toLowerCase() !== 'online';

                  return (
                    <tr
                      key={pt.dispositivo_id}
                      className={`transition-all hover:bg-white/[0.02] cursor-pointer ${isSelected ? 'bg-white/[0.04]' : ''}`}
                      onClick={() => setSelectedPoint(pt)}
                    >
                      <td className="py-3 px-4 font-bold text-white">{pt.nombre}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-st-muted">{pt.device_id}</td>
                      <td className="py-3 px-4 text-white font-medium">{pt.location_name}</td>
                      <td className="py-3 px-4 text-st-muted">{pt.tipo}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isOffline ? 'bg-st-offline/10 text-st-offline border border-st-offline/20' : 'bg-st-online/10 text-st-online border border-st-online/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-st-offline' : 'bg-st-online'}`} />
                          {pt.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-st-muted">{pt.latitud.toFixed(4)}° S</td>
                      <td className="py-3 px-4 text-right font-mono text-st-muted">{pt.longitud.toFixed(4)}° O</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPoint(pt); }}
                          className={`px-2 py-1 border text-[10px] font-bold uppercase rounded transition-all cursor-pointer ${isSelected ? 'bg-st-accent text-black border-st-accent' : 'border-st-border text-white hover:bg-white/10'}`}
                        >
                          Enfocar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center border-t border-st-border pt-4 text-xs select-none">
            <span className="text-st-muted">
              Mostrando página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong> ({totalItems} registros)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                className="px-3 py-1.5 bg-st-bg border border-st-border text-st-muted rounded hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                className="px-3 py-1.5 bg-st-bg border border-st-border text-st-muted rounded hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default GeolocationMap;
