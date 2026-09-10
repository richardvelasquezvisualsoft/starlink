import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  Search,
  MapPin,
  Compass,
  Anchor,
  Activity,
  RefreshCw
} from 'lucide-react';
import client from '../api/client';
import { AccountSearchSelect } from '../components/AccountSearchSelect';

declare const L: any; // Leaflet global from index.html

interface GeolocationItem {
  dispositivo_id: number;
  device_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  estado: string;
  location_name: string;
  distrito: string;
  tipo: 'Terrestre' | 'Marítimo';
  heading: number;
  speed: number;
  cuenta_id?: number;
  last_reading?: string;
  es_demo?: boolean;
}

const LIMA_DISTRICTS_DEMO = [
  { distrito: 'San Isidro', location_name: 'Sede Corporativa - San Isidro, Lima', lat: -12.0976, lon: -77.0365 },
  { distrito: 'San Miguel', location_name: 'Centro Logístico - San Miguel, Lima', lat: -12.0776, lon: -77.0935 },
  { distrito: 'San Borja', location_name: 'Planta de Operaciones - San Borja, Lima', lat: -12.1019, lon: -76.9953 },
  { distrito: 'Miraflores', location_name: 'Sucursal Financiera - Miraflores, Lima', lat: -12.1211, lon: -77.0297 }
];

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

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: number]: any }>({});

  const fetchGeoData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Accounts
      const accRes = await client.get('/cuentas');
      setAccounts(accRes.data || []);

      // 2. Fetch Geolocations
      const geoRes = await client.get('/dashboard/geolocations');
      
      // 3. Fetch Service Lines
      const linesRes = await client.get('/lineas-servicio');

      const rawGeoList = geoRes.data || [];
      const linesList = linesRes.data || [];

      // Compile points mapping to San Isidro, San Miguel, San Borja, Miraflores
      const compiledPoints: GeolocationItem[] = rawGeoList.map((g: any, idx: number) => {
        const line = linesList.find((l: any) => l.dispositivo_id === g.dispositivo_id);
        const demoDist = LIMA_DISTRICTS_DEMO[idx % LIMA_DISTRICTS_DEMO.length];

        return {
          dispositivo_id: g.dispositivo_id,
          device_id: g.device_id,
          nombre: g.nombre || g.device_id,
          latitud: demoDist.lat,
          longitud: demoDist.lon,
          estado: (g.estado || 'OPERATIVO').toUpperCase(),
          location_name: demoDist.location_name,
          distrito: demoDist.distrito,
          tipo: 'Terrestre',
          heading: 0,
          speed: 0,
          cuenta_id: line?.cuenta_id,
          last_reading: g.last_reading || new Date().toISOString().replace('T', ' ').slice(0, 16),
          es_demo: true
        };
      });

      // Filter by selected account if needed
      let filtered = compiledPoints;
      if (selectedAccount) {
        const accountId = parseInt(selectedAccount);
        filtered = filtered.filter((p: any) => p.cuenta_id === accountId);
      }

      setGeoPoints(filtered);
      if (filtered.length > 0 && !selectedPoint) {
        setSelectedPoint(filtered[0]);
      }
    } catch (err) {
      console.error('Error fetching geolocation data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeoData();
  }, [selectedAccount]);

  // Leaflet Map Initialization and Marker Updates
  useEffect(() => {
    if (loading || !mapContainerRef.current) return;
    if (typeof L === 'undefined') return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-12.1000, -77.0400],
        zoom: 13,
        zoomControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      {/* CartoDB Dark Matter Fastly Tiles */}
      L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
    markersRef.current = {};

    if (geoPoints.length === 0) return;

    const bounds = L.latLngBounds([]);

    geoPoints.forEach(pt => {
      const isSelected = selectedPoint?.dispositivo_id === pt.dispositivo_id;
      const isOnline = pt.estado === 'ONLINE' || pt.estado === 'OPERATIVO';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-geofence-marker',
        html: `
          <div class="relative cursor-pointer transition-all ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
            <div class="w-8 h-8 rounded-full ${isOnline ? 'bg-emerald-500/20 border-emerald-500' : 'bg-red-500/20 border-red-500'} border-2 flex items-center justify-center shadow-lg backdrop-blur-md">
              <div class="w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse"></div>
            </div>
            <div class="absolute left-9 top-1/2 -translate-y-1/2 bg-st-surface border border-st-border px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-md">
              ${pt.nombre}
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([pt.latitud, pt.longitud], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div class="p-3 bg-st-bg border border-st-border rounded-xl text-white font-sans min-w-[220px]">
          <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-st-border">
            <span class="font-bold text-sm text-white">${pt.nombre}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}">
              ${pt.estado}
            </span>
          </div>
          <div class="space-y-1 text-xs text-st-muted mb-2">
            <div><strong class="text-white">ID:</strong> ${pt.device_id}</div>
            <div><strong class="text-white">Distrito:</strong> ${pt.distrito}</div>
            <div><strong class="text-white">Ubicación:</strong> ${pt.location_name}</div>
            <div><strong class="text-white">Coordenadas:</strong> ${pt.latitud.toFixed(4)}, ${pt.longitud.toFixed(4)}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'dark-leaflet-popup' });

      marker.on('click', () => {
        setSelectedPoint(pt);
      });

      markersRef.current[pt.dispositivo_id] = marker;
      bounds.extend([pt.latitud, pt.longitud]);
    });

    if (geoPoints.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [loading, geoPoints, selectedPoint]);

  const handleFocusPoint = (pt: GeolocationItem) => {
    setSelectedPoint(pt);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([pt.latitud, pt.longitud], 14, { duration: 1.0 });
      const marker = markersRef.current[pt.dispositivo_id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Apply search query filter
  const filteredPoints = geoPoints.filter((p) =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.distrito.toLowerCase().includes(searchQuery.toLowerCase())
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
  const onlineCount = geoPoints.filter((p) => p.estado === 'ONLINE' || p.estado === 'OPERATIVO').length;
  const terrestrialCount = geoPoints.filter((p) => p.tipo === 'Terrestre').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Navigation className="w-6 h-6 text-st-accent rotate-45" />
            Geolocalización y Geocercas
          </h1>
          <p className="text-xs text-st-muted">
            Monitoreo geográfico en tiempo real de terminales satelitales en distritos de Lima.
          </p>
        </div>

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-3">
          <AccountSearchSelect
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={(accId) => {
              setSelectedAccount(accId);
              setCurrentPage(1);
            }}
          />

          <button
            onClick={fetchGeoData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-st-surface border border-st-border text-white text-xs font-semibold rounded-lg hover:bg-white/5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Terminales Localizadas</p>
            <p className="text-2xl font-bold text-white">
              {totalCount} <span className="text-xs font-semibold text-st-muted">UTs</span>
            </p>
            <p className="text-[9px] text-emerald-400 font-semibold uppercase">{onlineCount} de ellas activas (Online)</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Instalaciones Terrestres</p>
            <p className="text-2xl font-bold text-white">
              {terrestrialCount} <span className="text-xs font-semibold text-st-muted">Sitios</span>
            </p>
            <p className="text-[9px] text-st-accent font-semibold uppercase">Lima Metropolitana</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-st-accent/15 text-st-accent flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Distritos de Cobertura</p>
            <p className="text-2xl font-bold text-white">
              4 <span className="text-xs font-semibold text-st-muted">Zonas</span>
            </p>
            <p className="text-[9px] text-cyan-400 font-semibold uppercase">San Isidro, San Miguel, San Borja, Miraflores</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
            <Anchor className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-st-surface border border-st-border rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-st-muted uppercase tracking-wider">Estado de Frecuencias</p>
            <p className="text-2xl font-bold text-white">
              100 <span className="text-xs font-semibold text-st-muted">%</span>
            </p>
            <p className="text-[9px] text-emerald-400 font-semibold uppercase">Cobertura Satelital OK</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Interactive Map and Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Leaflet Interactive Map Container */}
        <div className="lg:col-span-2 bg-st-surface border border-st-border rounded-xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Visualizador Geográfico de Cobertura</h2>
              <p className="text-[11px] text-st-muted">Posicionamiento en tiempo real en San Isidro, San Miguel, San Borja y Miraflores.</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <div className="w-2 h-2 rounded-full bg-emerald-400" /> Online
              </span>
              <span className="flex items-center gap-1 text-red-400 font-semibold">
                <div className="w-2 h-2 rounded-full bg-red-400" /> Offline
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[400px] relative bg-[#0d1117] border border-st-border rounded-xl overflow-hidden">
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />
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
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-st-muted uppercase">Terminal de Flota</p>
                  <p className="text-lg font-bold text-white">{selectedPoint.nombre}</p>
                  <p className="text-xs font-mono text-st-accent font-semibold">{selectedPoint.device_id}</p>
                </div>

                <div className="flex justify-between items-center bg-st-bg border border-st-border rounded-lg px-3 py-2 text-xs">
                  <span className="text-st-muted font-medium">Estado Conexión</span>
                  <span className={`inline-flex items-center gap-1 font-bold uppercase ${selectedPoint.estado === 'ONLINE' || selectedPoint.estado === 'OPERATIVO' ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedPoint.estado === 'ONLINE' || selectedPoint.estado === 'OPERATIVO' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    {selectedPoint.estado}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between border-b border-st-border/40 pb-1.5">
                    <span className="text-st-muted">Distrito</span>
                    <span className="text-white font-bold">{selectedPoint.distrito}</span>
                  </div>
                  <div className="flex justify-between border-b border-st-border/40 pb-1.5">
                    <span className="text-st-muted">Instalación / Sitio</span>
                    <span className="text-white font-medium text-right max-w-[170px] truncate">{selectedPoint.location_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-st-border/40 pb-1.5 font-mono">
                    <span className="text-st-muted">Latitud</span>
                    <span className="text-white">{selectedPoint.latitud.toFixed(4)}° S</span>
                  </div>
                  <div className="flex justify-between border-b border-st-border/40 pb-1.5 font-mono">
                    <span className="text-st-muted">Longitud</span>
                    <span className="text-white">{selectedPoint.longitud.toFixed(4)}° O</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-st-muted">Última Conexión</span>
                    <span className="text-st-muted">{selectedPoint.last_reading}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-st-border">
                <button
                  onClick={() => handleFocusPoint(selectedPoint)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-st-accent text-st-bg text-xs font-bold uppercase rounded-lg hover:bg-st-accent/90 transition-all cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  Centrar en Mapa
                </button>
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
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ID, nombre, distrito..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-1.5 bg-st-bg border border-st-border rounded-lg text-xs text-white placeholder-st-muted/50 focus:outline-none focus:border-st-accent"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-st-border text-[10px] font-bold text-st-muted uppercase tracking-wider bg-st-bg">
                <th className="py-3 px-4">Terminal Alias</th>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4">Distrito</th>
                <th className="py-3 px-4">Sitio de Enlace</th>
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
                    No se encontraron terminales.
                  </td>
                </tr>
              ) : (
                pagedPoints.map((pt) => {
                  const isSelected = selectedPoint?.dispositivo_id === pt.dispositivo_id;
                  const isOnline = pt.estado === 'ONLINE' || pt.estado === 'OPERATIVO';

                  return (
                    <tr
                      key={pt.dispositivo_id}
                      className={`transition-all hover:bg-white/[0.04] cursor-pointer ${isSelected ? 'bg-st-accent/10 border-l-2 border-st-accent' : ''}`}
                      onClick={() => handleFocusPoint(pt)}
                    >
                      <td className="py-3 px-4 font-bold text-white">{pt.nombre}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-st-muted">{pt.device_id}</td>
                      <td className="py-3 px-4 text-st-accent font-semibold">{pt.distrito}</td>
                      <td className="py-3 px-4 text-white font-medium">{pt.location_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          {pt.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-st-muted">{pt.latitud.toFixed(4)}° S</td>
                      <td className="py-3 px-4 text-right font-mono text-st-muted">{pt.longitud.toFixed(4)}° O</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFocusPoint(pt); }}
                          className={`px-2.5 py-1 border text-[10px] font-bold uppercase rounded transition-all cursor-pointer ${isSelected ? 'bg-st-accent text-st-bg border-st-accent' : 'border-st-border text-white hover:bg-white/10'}`}
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
