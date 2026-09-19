import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Search, 
  Activity, 
  Navigation, 
  RefreshCw, 
  Radio, 
  AlertTriangle, 
  ShieldAlert, 
  Wifi
} from 'lucide-react';
import client from '../../api/client';

declare const L: any; // Leaflet global from CDN

interface DispositivoItem {
  id: number;
  device_id: string;
  nombre: string;
  numero_linea?: string | null;
  plan_contratado?: string | null;
  estado_operativo: string;
  conectado: boolean;
  latencia_ms: number;
  ping_drop_rate: number;
  alertas_activas: number;
  geozona_estado: string;
  latitud: number;
  longitud: number;
  distrito: string;
  es_ubicacion_demo: boolean;
  ultima_actualizacion?: string | null;
}

interface KPIs {
  equipos_totales: number;
  equipos_online: number;
  equipos_con_alerta: number;
  equipos_fuera_geozona: number;
  latencia_promedio_ms: number;
  packet_loss_promedio_pct: number;
}

interface ResponseData {
  kpis: KPIs;
  ubicacion_demo_global: boolean;
  dispositivos: DispositivoItem[];
}

export const ClienteEstadoUbicacion: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [dispositivos, setDispositivos] = useState<DispositivoItem[]>([]);
  const [_isDemoGlobal, setIsDemoGlobal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [geofenceFilter, setGeofenceFilter] = useState<string>('ALL');
  const [alertFilter, setAlertFilter] = useState<string>('ALL');

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: number]: any }>({});
  const cardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get<ResponseData>('/dispositivos/estado-ubicacion');
      if (res.data) {
        setKpis(res.data.kpis);
        setIsDemoGlobal(res.data.ubicacion_demo_global);
        const list = res.data.dispositivos || [];
        setDispositivos(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching estado y ubicacion:', err);
      setError(err.response?.data?.detail || 'No se pudo cargar el estado y ubicación de los dispositivos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered devices list
  const filteredDispositivos = dispositivos.filter(item => {
    const matchesSearch = 
      item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.device_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.numero_linea && item.numero_linea.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.distrito.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'ALL' || 
      item.estado_operativo.toUpperCase() === statusFilter.toUpperCase();

    const matchesDistrict = 
      districtFilter === 'ALL' || 
      item.distrito === districtFilter;

    const matchesGeofence = 
      geofenceFilter === 'ALL' || 
      (geofenceFilter === 'DENTRO' && item.geozona_estado.toUpperCase() === 'DENTRO') ||
      (geofenceFilter === 'FUERA' && item.geozona_estado.toUpperCase().includes('FUERA'));

    const matchesAlert = 
      alertFilter === 'ALL' || 
      (alertFilter === 'SI' && item.alertas_activas > 0) ||
      (alertFilter === 'NO' && item.alertas_activas === 0);

    return matchesSearch && matchesStatus && matchesDistrict && matchesGeofence && matchesAlert;
  });

  // Unique districts for filter dropdown
  const uniqueDistricts = Array.from(new Set(dispositivos.map(d => d.distrito))).filter(Boolean);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (loading || error || !mapContainerRef.current) return;
    if (typeof L === 'undefined') return; // If Leaflet script isn't loaded

    // Create map instance if not existing
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-12.0976, -77.0365],
        zoom: 12,
        zoomControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Google Maps style tile layer (crisp vector map without watermark requirements)
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Maps',
        maxZoom: 20
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
    markersRef.current = {};

    if (filteredDispositivos.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredDispositivos.forEach(item => {
      const isSelected = item.id === selectedId;
      const isFuera = item.geozona_estado.toUpperCase().includes('FUERA');
      const isCritical = item.estado_operativo === 'DESCONECTADO' || isFuera;
      const isWarning = item.estado_operativo === 'INCIDENCIA' || item.alertas_activas > 0;

      const borderClass = isSelected ? 'ring-4 ring-st-accent scale-125 z-50' : 'hover:scale-110';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="relative group cursor-pointer transition-all ${borderClass}">
            <div class="w-7 h-7 rounded-full ${isCritical ? 'bg-client-danger-soft' : isWarning ? 'bg-client-warning-soft' : 'bg-client-success-soft'} border-2 ${isCritical ? 'border-red-500' : isWarning ? 'border-amber-500' : 'border-emerald-500'} flex items-center justify-center shadow-lg backdrop-blur-md">
              <div class="w-2.5 h-2.5 rounded-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse"></div>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([item.latitud, item.longitud], { icon: customIcon }).addTo(map);

      const popupContent = `
        <div class="p-3 bg-client-bg-subtle border border-client-border rounded-xl text-client-text-primary font-sans min-w-[220px]">
          <div class="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-client-border">
            <span class="font-bold text-sm text-client-text-primary">${item.nombre}</span>
            <span class="px-2 py-0.5 rounded text-xs font-bold ${isCritical ? 'bg-client-danger-soft text-client-danger border border-client-danger' : isWarning ? 'bg-client-warning-soft text-client-warning border border-client-warning' : 'bg-client-success-soft text-client-success border border-client-success'}">
              ${item.estado_operativo}
            </span>
          </div>
          <div class="space-y-1 text-xs text-client-text-secondary mb-2">
            <div><strong class="text-client-text-primary">ID:</strong> ${item.device_id}</div>
            <div><strong class="text-client-text-primary">Ubicación:</strong> ${item.distrito}</div>
            ${item.numero_linea ? `<div><strong class="text-client-text-primary">Línea:</strong> ${item.numero_linea}</div>` : ''}
            ${item.plan_contratado ? `<div><strong class="text-client-text-primary">Plan:</strong> ${item.plan_contratado}</div>` : ''}
            <div><strong class="text-client-text-primary">Latencia:</strong> ${item.latencia_ms} ms</div>
            <div><strong class="text-client-text-primary">Packet Loss:</strong> ${item.ping_drop_rate}%</div>
            <div><strong class="text-client-text-primary">Geozona:</strong> <span class="${isFuera ? 'text-client-danger font-bold' : 'text-client-success'}">${item.geozona_estado}</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'dark-leaflet-popup' });

      marker.on('click', () => {
        setSelectedId(item.id);
        const cardEl = cardRefs.current[item.id];
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      markersRef.current[item.id] = marker;
      bounds.extend([item.latitud, item.longitud]);
    });

    // Only fit bounds on initial search/filter change if no specific device is selected
    if (filteredDispositivos.length > 0 && !selectedId) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

  }, [loading, error, filteredDispositivos]);

  // Center map and zoom into selected device when selectedId changes
  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current) return;
    const selectedItem = filteredDispositivos.find(d => d.id === selectedId);
    if (selectedItem) {
      mapInstanceRef.current.flyTo([selectedItem.latitud, selectedItem.longitud], 15, { animate: true, duration: 1.2 });
      const marker = markersRef.current[selectedItem.id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedId, filteredDispositivos]);

  // Center map on selected device
  const handleSelectDevice = (item: DispositivoItem) => {
    setSelectedId(item.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-client-text-primary font-sans uppercase">ESTADO Y UBICACIÓN</h1>
          <p className="text-xs text-client-text-secondary mt-0.5">Monitoreo geográfico y estado operativo de terminales.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 bg-client-bg-surface border border-client-border hover:bg-white/5 text-xs text-client-text-primary rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>



      {/* Loading State */}
      {loading && !kpis && (
        <div className="flex h-96 items-center justify-center bg-client-bg-surface border border-client-border rounded-xl">
          <Activity className="w-8 h-8 animate-spin text-client-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 bg-client-bg-surface border border-client-danger rounded-xl text-center space-y-4">
          <div className="p-3 bg-client-danger-soft border border-client-danger rounded-full text-red-500">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-client-text-primary">No se pudo cargar el estado y ubicación</h3>
            <p className="text-sm text-client-text-secondary mt-1 max-w-md">{error}</p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-st-accent text-st-bg font-medium text-sm rounded-lg hover:bg-st-accent/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* Content when loaded */}
      {!loading && kpis && (
        <>
          {/* Top KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-sm font-semibold text-client-text-secondary uppercase tracking-wider mb-1">Equipos Totales</div>
              <div className="text-xl font-bold text-client-text-primary">{kpis.equipos_totales}</div>
              <div className="text-xs text-client-text-secondary mt-1">Terminales contratadas</div>
            </div>

            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-sm font-semibold text-client-text-secondary uppercase tracking-wider mb-1">Equipos Online</div>
              <div className="text-xl font-bold text-client-success flex items-center gap-1.5">
                <Wifi className="w-4 h-4" />
                <span>{kpis.equipos_online}</span>
              </div>
              <div className="text-xs text-client-text-secondary mt-1">Operativo y conectado</div>
            </div>

            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-sm font-semibold text-client-text-secondary uppercase tracking-wider mb-1">Equipos con Alerta</div>
              <div className="text-xl font-bold text-client-warning flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{kpis.equipos_con_alerta}</span>
              </div>
              <div className="text-xs text-client-text-secondary mt-1">Incidencias o cortes</div>
            </div>

            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-sm font-semibold text-client-text-secondary uppercase tracking-wider mb-1">Fuera de Geozona</div>
              <div className="text-xl font-bold text-client-danger flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>{kpis.equipos_fuera_geozona}</span>
              </div>
              <div className="text-xs text-client-text-secondary mt-1">Fuera del perímetro</div>
            </div>

            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-sm font-semibold text-client-text-secondary uppercase tracking-wider mb-1">Latencia Promedio</div>
              <div className="text-xl font-bold text-client-info">{kpis.latencia_promedio_ms} ms</div>
              <div className="text-xs text-client-text-secondary mt-1">Ping promedio</div>
            </div>

            <div className="bg-client-bg-surface border border-client-border rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-xs font-bold text-client-text-secondary uppercase tracking-wider mb-1">Packet Loss</div>
              <div className="text-xl font-bold text-purple-400">{kpis.packet_loss_promedio_pct}%</div>
              <div className="text-xs text-client-text-secondary mt-1">Pérdida de paquetes</div>
            </div>
          </div>

          {/* Main 2-Column Split View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-16rem)] min-h-[600px]">
            {/* Left Column: Device List & Filters (5 cols) */}
            <div className="lg:col-span-5 bg-client-bg-surface border border-client-border rounded-xl flex flex-col h-full overflow-hidden">
              {/* Search & Filter Bar */}
              <div className="p-3.5 border-b border-client-border space-y-2.5 bg-client-bg-subtle/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-client-text-secondary" />
                  <input
                    type="text"
                    placeholder="Buscar por terminal, ID, línea o distrito..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-client-bg-subtle border border-client-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-client-text-primary focus:border-st-accent outline-none"
                  />
                </div>

                {/* Dropdown Filters */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-client-bg-subtle border border-client-border rounded-md px-2 py-1 text-sm text-client-text-secondary focus:text-client-text-primary outline-none cursor-pointer"
                    >
                      <option value="ALL">Estado: Todos</option>
                      <option value="OPERATIVO">Estado: Operativo</option>
                      <option value="INCIDENCIA">Estado: Incidencia</option>
                      <option value="DESCONECTADO">Estado: Desconectado</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                      className="w-full bg-client-bg-subtle border border-client-border rounded-md px-2 py-1 text-sm text-client-text-secondary focus:text-client-text-primary outline-none cursor-pointer"
                    >
                      <option value="ALL">Distrito: Todos</option>
                      {uniqueDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={geofenceFilter}
                      onChange={(e) => setGeofenceFilter(e.target.value)}
                      className="w-full bg-client-bg-subtle border border-client-border rounded-md px-2 py-1 text-sm text-client-text-secondary focus:text-client-text-primary outline-none cursor-pointer"
                    >
                      <option value="ALL">Geozona: Todos</option>
                      <option value="DENTRO">Geozona: Dentro</option>
                      <option value="FUERA">Geozona: Fuera</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={alertFilter}
                      onChange={(e) => setAlertFilter(e.target.value)}
                      className="w-full bg-client-bg-subtle border border-client-border rounded-md px-2 py-1 text-sm text-client-text-secondary focus:text-client-text-primary outline-none cursor-pointer"
                    >
                      <option value="ALL">Alertas: Todos</option>
                      <option value="SI">Con Alertas</option>
                      <option value="NO">Sin Alertas</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-client-text-secondary pt-1">
                  <span>Equipos encontrados: <strong className="text-client-text-primary">{filteredDispositivos.length}</strong></span>
                  {(searchQuery || statusFilter !== 'ALL' || districtFilter !== 'ALL' || geofenceFilter !== 'ALL' || alertFilter !== 'ALL') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('ALL');
                        setDistrictFilter('ALL');
                        setGeofenceFilter('ALL');
                        setAlertFilter('ALL');
                      }}
                      className="text-client-primary hover:underline text-xs"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Devices List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {filteredDispositivos.length > 0 ? (
                  filteredDispositivos.map(item => {
                    const isSelected = item.id === selectedId;
                    const isFuera = item.geozona_estado.toUpperCase().includes('FUERA');
                    const isCritical = item.estado_operativo === 'DESCONECTADO' || isFuera;
                    const isWarning = item.estado_operativo === 'INCIDENCIA' || item.alertas_activas > 0;

                    return (
                      <div
                        key={item.id}
                        ref={(el) => (cardRefs.current[item.id] = el)}
                        onClick={() => handleSelectDevice(item)}
                        className={`p-3 bg-client-bg-subtle border rounded-xl transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-st-accent bg-st-accent/5 ring-1 ring-st-accent/50 shadow-md' 
                            : 'border-client-border hover:border-white/20'
                        }`}
                      >
                        {/* Title & Status */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="font-bold text-xs text-client-text-primary flex items-center gap-1.5">
                              <span>{item.nombre}</span>
                            </div>
                            <div className="text-xs text-client-text-secondary">{item.device_id}</div>
                          </div>

                          <span className={`inline-flex items-center gap-1 text-xs uppercase font-bold px-2 py-0.5 rounded ${
                            isCritical ? 'bg-client-danger-soft text-client-danger border border-client-danger' :
                            isWarning ? 'bg-client-warning-soft text-client-warning border border-client-warning' :
                            'bg-client-success-soft text-client-success border border-client-success'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              isCritical ? 'bg-red-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                            }`} />
                            {item.estado_operativo}
                          </span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center justify-between text-xs text-client-text-secondary mb-2">
                          <div className="flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-client-primary" />
                            <span className="font-medium text-client-text-primary">{item.distrito}</span>
                          </div>
                          {item.numero_linea && (
                            <span className="text-xs text-client-text-secondary">{item.numero_linea}</span>
                          )}
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-client-border/50 text-center">
                          <div className="bg-client-bg-surface/50 rounded-lg p-1.5 border border-client-border/30">
                            <div className="text-xs text-client-text-secondary uppercase">Latencia</div>
                            <div className="text-xs text-client-info font-bold">{item.latencia_ms} ms</div>
                          </div>

                          <div className="bg-client-bg-surface/50 rounded-lg p-1.5 border border-client-border/30">
                            <div className="text-xs text-client-text-secondary uppercase">Packet Loss</div>
                            <div className="text-xs text-purple-700 font-bold">{item.ping_drop_rate}%</div>
                          </div>

                          <div className="bg-client-bg-surface/50 rounded-lg p-1.5 border border-client-border/30">
                            <div className="text-xs text-client-text-secondary uppercase">Geozona</div>
                            <div className={`text-xs font-bold ${isFuera ? 'text-client-danger' : 'text-client-success'}`}>
                              {isFuera ? 'Fuera' : 'Dentro'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-client-text-secondary py-12">
                    No se encontraron terminales con los filtros aplicados.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Interactive Leaflet Map (7 cols) */}
            <div className="lg:col-span-7 bg-client-bg-surface border border-client-border rounded-xl flex flex-col h-full overflow-hidden relative">
              {/* Map Header Toolbar */}
              <div className="p-3 border-b border-client-border flex items-center justify-between bg-client-bg-subtle/60 z-10">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-client-primary" />
                  <span className="font-bold text-xs text-client-text-primary uppercase tracking-wider">Mapa Geográfico de Flota</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-client-success font-semibold">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" /> Online
                  </span>
                  <span className="flex items-center gap-1 text-client-warning font-semibold">
                    <div className="w-2 h-2 rounded-full bg-amber-400" /> Incidencia
                  </span>
                  <span className="flex items-center gap-1 text-client-danger font-semibold">
                    <div className="w-2 h-2 rounded-full bg-red-400" /> Desconectado / Fuera
                  </span>
                </div>
              </div>

              {/* Map Container */}
              <div className="flex-1 relative bg-[#0d1117]">
                <div ref={mapContainerRef} className="absolute inset-0 z-0" />
              </div>

              {/* Bottom Context Banner of Selected Item */}
              {selectedId && (
                <div className="p-3 border-t border-client-border bg-client-bg-subtle/90 backdrop-blur-md flex items-center justify-between gap-4 z-10">
                  {(() => {
                    const sel = dispositivos.find(d => d.id === selectedId);
                    if (!sel) return null;
                    return (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-client-bg-surface border border-client-border rounded-lg">
                            <Radio className="w-4 h-4 text-client-primary" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-client-text-primary flex items-center gap-2">
                              <span>{sel.nombre}</span>
                              <span className="text-xs text-client-text-secondary">({sel.device_id})</span>
                            </div>
                            <div className="text-sm text-client-text-secondary flex items-center gap-3 mt-0.5">
                              <span>📍 {sel.distrito}</span>
                              <span>📶 Latencia: {sel.latencia_ms} ms</span>
                              <span>📉 Drop: {sel.ping_drop_rate}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            sel.geozona_estado.toUpperCase().includes('FUERA') 
                              ? 'bg-client-danger-soft text-client-danger border border-client-danger' 
                              : 'bg-client-success-soft text-client-success border border-client-success'
                          }`}>
                            Geozona: {sel.geozona_estado}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
