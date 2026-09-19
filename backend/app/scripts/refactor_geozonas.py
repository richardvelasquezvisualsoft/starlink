import re

with open("frontend/src/components/GeozonasEditor.tsx", "r") as f:
    content = f.read()

# Add Nivel2, Nivel3, CentroCosto states
content = content.replace(
    "const [nivel1, setNivel1] = useState('');",
    "const [nivel1, setNivel1] = useState('');\n  const [nivel2, setNivel2] = useState('');\n  const [nivel3, setNivel3] = useState('');\n  const [centroCosto, setCentroCosto] = useState('');"
)

# Replace options generating logic
content = content.replace(
    "const n1Options = Array.from(new Set(devices.map(d => d.nivel1).filter(v => v && v !== '-')));",
    """const n1Options = Array.from(new Set(devices.map(d => d.nivel1).filter(v => v && v !== '-')));
  const n2Options = Array.from(new Set(devices.map(d => d.nivel2).filter(v => v && v !== '-')));
  const n3Options = Array.from(new Set(devices.map(d => d.nivel3).filter(v => v && v !== '-')));
  const ccOptions = Array.from(new Set(devices.map(d => d.centro_costos).filter(v => v && v !== '-')));"""
)

# Replace filter logic
content = content.replace(
    "return (search === '' || d.nombre.toLowerCase().includes(search.toLowerCase())) &&\n           (nivel1 === '' || d.nivel1 === nivel1);",
    "return (search === '' || d.nombre.toLowerCase().includes(search.toLowerCase())) &&\n           (nivel1 === '' || d.nivel1 === nivel1) &&\n           (nivel2 === '' || d.nivel2 === nivel2) &&\n           (nivel3 === '' || d.nivel3 === nivel3) &&\n           (centroCosto === '' || d.centro_costos === centroCosto);"
)

# Replace the input section in the left panel to include new filters and NUEVO button
left_panel_inputs = """
              <input 
                type="text" placeholder="Buscar dispositivo..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-white text-gray-900" 
              />
              <select value={nivel1} onChange={e => setNivel1(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900">
                <option value="">Todos (Nivel 1)</option>
                {n1Options.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
              </select>
              <select value={nivel2} onChange={e => setNivel2(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900">
                <option value="">Todos (Nivel 2)</option>
                {n2Options.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
              </select>
              <select value={nivel3} onChange={e => setNivel3(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900">
                <option value="">Todos (Nivel 3)</option>
                {n3Options.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
              </select>
              <select value={centroCosto} onChange={e => setCentroCosto(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900">
                <option value="">Todos (Centro Costo)</option>
                {ccOptions.map(o => <option key={o as string} value={o as string}>{o as string}</option>)}
              </select>
              <button 
                onClick={() => {
                  if(!selectedDevice) return alert("Seleccione un dispositivo de la lista.");
                  setIsEditing(true);
                  setEditorMode('CIRCULAR');
                }} 
                className="w-full mt-2 py-2 bg-blue-600 text-white rounded-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4"/> Novedad (Crear Geozona)
              </button>
"""

start_str = "              <input \n                type=\"text\" placeholder=\"Buscar dispositivo...\" value={search} onChange={e => setSearch(e.target.value)}"
end_str = "              </select>\n            </div>"
if start_str in content and end_str in content:
    s_idx = content.find(start_str)
    e_idx = content.find(end_str) + len(end_str)
    content = content[:s_idx] + left_panel_inputs.strip('\n') + "\n            </div>" + content[e_idx:]

with open("frontend/src/components/GeozonasEditor.tsx", "w") as f:
    f.write(content)
