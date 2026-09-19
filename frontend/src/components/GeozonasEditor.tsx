import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Plus, Edit, Trash2, Search, Crosshair, Check, X, Circle, Hexagon, Filter } from 'lucide-react';
import client from '../api/client';

declare const L: any;

interface GeocercaData {
  id: number;
  nombre: string;
  tipo_geozona: 'CIRCULAR' | 'POLIGONAL';
  tolerancia_borde_metros: number;
  centro_latitud?: number;
  centro_longitud?: number;
  radio_metros?: number;
  geometria_geojson?: any;
  pais?: string;
  departamento?: string;
  provincia?: string;
  direccion?: string;
}

interface DeviceItem {
  id: number;
  device_id: string;
  nombre: string;
  nivel1: string;
  nivel2: string;
  nivel3: string;
  centro_costo: string;
  estado: string;
  geocerca?: GeocercaData;
}

export const GeozonasEditor: React.FC = () => {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterGeocerca, setFilterGeocerca] = useState<'ALL'|'WITH'|'WITHOUT'>('ALL');

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editorMode, setEditorMode] = useState<'CIRCULAR' | 'POLIGONAL'>('CIRCULAR');
  const [tolerancia, setTolerancia] = useState(50);
  const [geocercaNombre, setGeocercaNombre] = useState('');
  
  // Address Fields
  const [pais, setPais] = useState('Perú');
  const [departamento, setDepartamento] = useState('');
  const [provincia, setProvincia] = useState('');
  const [direccion, setDireccion] = useState('');

  // Map Refs
  const mapRef = useRef<any>(null);
  const mapInstance = useRef<any>(null);
  const featureGroup = useRef<any>(null);
  const drawControl = useRef<any>(null);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await client.get('/operation/devices');
      setDevices(res.data || []);
      
      // Update selected device if it exists
      if (selectedDevice) {
        const updated = res.data.find((d: DeviceItem) => d.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current && typeof L !== 'undefined') {
      mapInstance.current = L.map(mapRef.current).setView([-12.0464, -77.0428], 12);
      L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        attribution: 'Map data &copy; Google'
      }).addTo(mapInstance.current);

      featureGroup.current = new L.FeatureGroup();
      mapInstance.current.addLayer(featureGroup.current);
      
      mapInstance.current.on(L.Draw.Event.CREATED, (e: any) => {
        featureGroup.current.clearLayers();
        featureGroup.current.addLayer(e.layer);
      });
    }
  }, []);

  const enableDrawing = (mode: 'CIRCULAR'|'POLIGONAL') => {
    if (!mapInstance.current) return;
    
    // Remove previous draw control if exists
    if (drawControl.current) {
      mapInstance.current.removeControl(drawControl.current);
    }
    
    drawControl.current = new L.Control.Draw({
      draw: {
        polyline: false,
        polygon: mode === 'POLIGONAL' ? { allowIntersection: false } : false,
        circle: mode === 'CIRCULAR',
        rectangle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: featureGroup.current,
        remove: true
      }
    });
    mapInstance.current.addControl(drawControl.current);
  };
  
  const disableDrawing = () => {
    if (mapInstance.current && drawControl.current) {
      mapInstance.current.removeControl(drawControl.current);
      drawControl.current = null;
    }
  };

  const renderExistingGeocerca = (geo: GeocercaData) => {
    if (!featureGroup.current || !mapInstance.current) return;
    featureGroup.current.clearLayers();
    
    if (geo.tipo_geozona === 'CIRCULAR' && geo.centro_latitud && geo.centro_longitud && geo.radio_metros) {
      const circle = L.circle([geo.centro_latitud, geo.centro_longitud], { radius: geo.radio_metros });
      featureGroup.current.addLayer(circle);
      mapInstance.current.fitBounds(circle.getBounds());
    } else if (geo.tipo_geozona === 'POLIGONAL' && geo.geometria_geojson) {
      const polygon = L.geoJSON(geo.geometria_geojson);
      polygon.eachLayer((layer: any) => featureGroup.current.addLayer(layer));
      mapInstance.current.fitBounds(polygon.getBounds());
    }
  };

  useEffect(() => {
    if (selectedDevice && selectedDevice.geocerca) {
      renderExistingGeocerca(selectedDevice.geocerca);
    } else {
      if (featureGroup.current) featureGroup.current.clearLayers();
    }
  }, [selectedDevice]);

  const handleLocateAddress = async () => {
    if (!mapInstance.current) return;
    const query = `${direccion}, ${provincia}, ${departamento}, ${pais}`;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        mapInstance.current.setView([lat, lon], 15);
      } else {
        alert('Ubicación no encontrada.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGeozona = async () => {
    if (!selectedDevice) return alert("Seleccione un dispositivo.");
    if (!geocercaNombre) return alert("Ingrese un nombre.");

    let layers = featureGroup.current.getLayers();
    if (layers.length === 0) return alert("Debe dibujar una geozona en el mapa.");
    
    let layer = layers[0];
    let payload: any = {
      nombre: geocercaNombre,
      tipo_geozona: editorMode,
      tolerancia_borde_metros: tolerancia,
      pais, departamento, provincia, direccion
    };

    if (editorMode === 'CIRCULAR' && layer instanceof L.Circle) {
      const center = layer.getLatLng();
      payload.centro_latitud = center.lat;
      payload.centro_longitud = center.lng;
      payload.radio_metros = layer.getRadius();
    } else if (editorMode === 'POLIGONAL' && (layer instanceof L.Polygon || layer.toGeoJSON)) {
      payload.geometria_geojson = layer.toGeoJSON ? layer.toGeoJSON() : L.polygon(layer.getLatLngs()).toGeoJSON();
    } else {
      return alert("La forma dibujada no coincide con el modo seleccionado (Círculo o Polígono).");
    }

    try {
      if (selectedDevice.geocerca) {
        await client.put(`/geozonas/dispositivo/${selectedDevice.id}`, payload);
      } else {
        await client.post(`/geozonas/dispositivo/${selectedDevice.id}`, payload);
      }
      setIsEditing(false);
      disableDrawing();
      fetchDevices();
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || "Error al guardar geozona.");
    }
  };

  const handleDeleteGeozona = async () => {
    if (!selectedDevice || !selectedDevice.geocerca) return;
    if (window.confirm(`¿Deseas eliminar la geocerca asociada al equipo ${selectedDevice.nombre}?`)) {
      try {
        await client.delete(`/geozonas/dispositivo/${selectedDevice.id}`);
        featureGroup.current.clearLayers();
        fetchDevices();
      } catch (e: any) {
        console.error(e);
        alert(e.response?.data?.detail || "Error al eliminar geozona.");
      }
    }
  };

  const openEditor = (isNew: boolean) => {
    setIsEditing(true);
    if (isNew) {
      setGeocercaNombre('');
      setEditorMode('CIRCULAR');
      setTolerancia(50);
      setPais('Perú');
      setDepartamento('');
      setProvincia('');
      setDireccion('');
      featureGroup.current.clearLayers();
      enableDrawing('CIRCULAR');
    } else if (selectedDevice?.geocerca) {
      const geo = selectedDevice.geocerca;
      setGeocercaNombre(geo.nombre);
      setEditorMode(geo.tipo_geozona);
      setTolerancia(geo.tolerancia_borde_metros || 50);
      setPais(geo.pais || 'Perú');
      setDepartamento(geo.departamento || '');
      setProvincia(geo.provincia || '');
      setDireccion(geo.direccion || '');
      enableDrawing(geo.tipo_geozona);
    }
  };

  const cancelEditor = () => {
    setIsEditing(false);
    disableDrawing();
    if (selectedDevice?.geocerca) {
      renderExistingGeocerca(selectedDevice.geocerca);
    } else {
      featureGroup.current.clearLayers();
    }
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch = search === '' || 
        d.nombre.toLowerCase().includes(search.toLowerCase()) || 
        d.device_id.toLowerCase().includes(search.toLowerCase());
      
      const matchesGeo = filterGeocerca === 'ALL' || 
        (filterGeocerca === 'WITH' && !!d.geocerca) || 
        (filterGeocerca === 'WITHOUT' && !d.geocerca);
        
      return matchesSearch && matchesGeo;
    });
  }, [devices, search, filterGeocerca]);

  return (
    <div className="flex h-[800px] bg-st-bg text-white rounded-xl overflow-hidden shadow-xl border border-st-border">
      
      {/* Left Panel: Device List */}
      <div className="w-1/3 flex flex-col bg-st-surface border-r border-st-border">
        <div className="p-4 border-b border-st-border bg-st-bg/50">
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-st-accent"/> Equipos Disponibles
          </h2>
          
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-st-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar por nombre o ID..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-st-bg border border-st-border rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-st-accent"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-st-muted" />
              <select 
                value={filterGeocerca} 
                onChange={e => setFilterGeocerca(e.target.value as any)}
                className="flex-1 bg-st-bg border border-st-border rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="ALL">Todos los equipos</option>
                <option value="WITH">Con Geocerca</option>
                <option value="WITHOUT">Sin Geocerca</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-st-muted">Cargando equipos...</div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-4 text-center text-xs text-st-muted">No se encontraron equipos.</div>
          ) : (
            filteredDevices.map(d => (
              <div 
                key={d.id} 
                onClick={() => {
                  setSelectedDevice(d);
                  if(isEditing) cancelEditor();
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDevice?.id === d.id 
                  ? 'bg-st-accent/10 border-st-accent' 
                  : 'bg-st-bg/50 border-st-border hover:bg-st-bg'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm text-white">{d.nombre}</div>
                    <div className="text-[10px] text-st-muted font-mono mt-0.5">{d.device_id}</div>
                  </div>
                  {d.geocerca ? (
                    <span className="bg-st-online/20 text-st-online text-[9px] font-bold px-1.5 py-0.5 rounded border border-st-online/30">
                      CON GEOCERCA
                    </span>
                  ) : (
                    <span className="bg-st-offline/20 text-st-offline text-[9px] font-bold px-1.5 py-0.5 rounded border border-st-offline/30">
                      SIN GEOCERCA
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel: Map & Editor */}
      <div className="flex-1 relative flex flex-col bg-gray-900">
        
        {/* Top Buttons Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-2 bg-st-surface/90 backdrop-blur-sm p-1.5 rounded-xl border border-st-border shadow-lg">
          <button 
            disabled={!selectedDevice || !!selectedDevice.geocerca || isEditing}
            onClick={() => openEditor(true)}
            className="px-4 py-2 bg-st-accent text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-st-accent/80 transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5"/> Nuevo
          </button>
          
          <button 
            disabled={!selectedDevice || !selectedDevice.geocerca || isEditing}
            onClick={() => openEditor(false)}
            className="px-4 py-2 bg-st-bg border border-st-border text-white rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-st-surface transition-colors flex items-center gap-2"
          >
            <Edit className="w-3.5 h-3.5"/> Editar
          </button>
          
          <button 
            disabled={!selectedDevice || !selectedDevice.geocerca || isEditing}
            onClick={handleDeleteGeozona}
            className="px-4 py-2 bg-st-offline/20 text-st-offline border border-st-offline/30 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-st-offline/30 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5"/> Eliminar
          </button>
        </div>

        {/* Floating Editor Form */}
        {isEditing && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] z-[500] bg-st-surface border border-st-border rounded-xl shadow-2xl flex flex-col">
            <div className="p-3 border-b border-st-border flex justify-between items-center bg-st-bg/50 rounded-t-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-st-accent" /> 
                {selectedDevice?.geocerca ? 'Editar Geocerca' : 'Nueva Geocerca'}
              </h3>
              <button onClick={cancelEditor} className="text-st-muted hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[10px] font-bold text-st-muted uppercase mb-1">Equipo</label>
                <input disabled type="text" value={selectedDevice?.nombre || ''} className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-xs text-st-muted opacity-70" />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-st-muted uppercase mb-1">Nombre Geocerca</label>
                <input type="text" value={geocercaNombre} onChange={e => setGeocercaNombre(e.target.value)} placeholder="Ej. Base Principal" className="w-full px-3 py-2 bg-st-bg border border-st-border rounded-lg text-xs text-white focus:outline-none focus:border-st-accent" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-st-muted uppercase mb-1">Tipo de Forma</label>
                <div className="flex rounded-lg overflow-hidden border border-st-border">
                  <button 
                    onClick={() => { setEditorMode('CIRCULAR'); enableDrawing('CIRCULAR'); }}
                    className={`flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${editorMode === 'CIRCULAR' ? 'bg-st-accent text-white' : 'bg-st-bg text-st-muted hover:text-white'}`}
                  >
                    <Circle className="w-3.5 h-3.5" /> Circular
                  </button>
                  <button 
                    onClick={() => { setEditorMode('POLIGONAL'); enableDrawing('POLIGONAL'); }}
                    className={`flex-1 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${editorMode === 'POLIGONAL' ? 'bg-st-accent text-white' : 'bg-st-bg text-st-muted hover:text-white'}`}
                  >
                    <Hexagon className="w-3.5 h-3.5" /> Poligonal
                  </button>
                </div>
                <p className="text-[9px] text-st-muted mt-1 italic text-center">
                  Utilice las herramientas del mapa a la izquierda para dibujar.
                </p>
              </div>

              <div className="space-y-2 border border-st-border p-3 rounded-lg bg-st-bg/30">
                <label className="block text-[10px] font-bold text-st-muted uppercase">Ubicación de Referencia</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="País" value={pais} onChange={e => setPais(e.target.value)} className="w-full px-2 py-1.5 bg-st-bg border border-st-border rounded text-xs text-white focus:outline-none focus:border-st-accent" />
                  <input type="text" placeholder="Departamento" value={departamento} onChange={e => setDepartamento(e.target.value)} className="w-full px-2 py-1.5 bg-st-bg border border-st-border rounded text-xs text-white focus:outline-none focus:border-st-accent" />
                  <input type="text" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full px-2 py-1.5 bg-st-bg border border-st-border rounded text-xs text-white focus:outline-none focus:border-st-accent" />
                  <input type="text" placeholder="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full px-2 py-1.5 bg-st-bg border border-st-border rounded text-xs text-white focus:outline-none focus:border-st-accent" />
                </div>
                <button onClick={handleLocateAddress} className="w-full py-1.5 bg-st-surface border border-st-border text-white text-xs font-semibold rounded hover:bg-st-accent/20 transition-colors flex items-center justify-center gap-2 mt-2">
                  <Search className="w-3.5 h-3.5"/> Centrar en Mapa
                </button>
              </div>
            </div>

            <div className="p-3 border-t border-st-border bg-st-bg/50 rounded-b-xl flex gap-2">
              <button onClick={cancelEditor} className="flex-1 py-2 bg-st-surface border border-st-border text-white rounded-lg text-xs font-bold hover:bg-white/5 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveGeozona} className="flex-1 py-2 bg-st-online text-white rounded-lg text-xs font-bold hover:bg-st-online/80 transition-colors flex items-center justify-center gap-2 shadow-lg">
                <Check className="w-4 h-4"/> Guardar
              </button>
            </div>
          </div>
        )}

        <div ref={mapRef} className="w-full h-full z-0" style={{ background: '#1a1a1a' }}></div>
      </div>
    </div>
  );
};
