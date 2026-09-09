# Prompt Maestro de UI/UX y Arquitectura Frontend - Starlink Fleet Management

Este documento contiene la descripción detallada de la interfaz, experiencia de usuario (UX) y arquitectura frontend que **DEBE** ser utilizada como contexto base para crear esta nueva plataforma de gestión de terminales satelitales. No imites ningún software legacy; el diseño debe ser moderno, de grado enterprise y completamente independiente.

---

## 1. Stack Tecnológico Base
- **Framework:** React 18+ con TypeScript, empaquetado con Vite.
- **Estilos:** Tailwind CSS.
- **Iconografía:** `lucide-react`.
- **Manejo de Estado Global:** `zustand`.
- **Enrutamiento:** `react-router-dom`.
- **Llamadas HTTP:** `axios`.

## 2. Tipografía y Paleta de Colores (Estética Starlink / Espacial)
El archivo `tailwind.config.js` debe estar configurado para un **Dark Mode** de alto contraste y aspecto tecnológico:
- **Colores Personalizados (Esquema Deep Space):**
  - `st-bg`: `#000000` (Negro Puro, usado para el fondo principal de la App).
  - `st-surface`: `#111111` (Gris Carbón profundo, usado para el Sidebar, Cabeceras, Tarjetas y Modales).
  - `st-border`: `#222222` (Gris oscuro para bordes sutiles y separadores).
  - `st-primary`: `#FFFFFF` (Blanco absoluto, usado para textos principales, botones de acción primaria y títulos).
  - `st-accent`: `#00A8E8` (Cyan/Azul Satelital, usado para hover, botones secundarios, focus de inputs y gráficos de telemetría).
  - `st-muted`: `#9CA3AF` (Gris frío, usado para textos secundarios, roles y placeholders).
  - **Colores de Estado (Telemetría):** `st-online` (#10B981 - Verde), `st-offline` (#EF4444 - Rojo), `st-warning` (#F59E0B - Ambar).
- **Fuente Principal (Google Fonts):**
  - **Quicksand** (`font-quicksand`): **Se utilizará para absolutamente toda la aplicación** (Títulos, menús, grillas, inputs, botones, métricas). Variar entre pesos 400 (regular), 600 (semibold) y 700 (bold) para establecer la jerarquía visual.

## 3. Layout Principal (App Shell)
La aplicación debe contar con un contenedor de altura completa (`h-screen`, `overflow-hidden`, `bg-st-bg` y texto `st-primary`) dividido en un Sidebar y un Área Principal.

### 3.1 Sidebar (Menú Lateral)
- **Fondo:** Color `st-surface` con un borde derecho de 1px en `st-border`.
- **Responsividad:** En escritorio se puede colapsar a solo íconos. En móviles, se oculta y aparece como un "drawer" flotante.
- **Logo:** En el tope del sidebar debe ir el ícono representativo de conexión satelital o flota, junto al nombre del sistema en texto blanco Quicksand Bold.
- **Secciones (Grupos Acordeón):** Ítems agrupados con título en mayúsculas pequeñas. Ícono `ChevronRight` que rota al expandirse.
- **Ítem de Menú:** Ícono de `lucide-react` + Texto. Al estar activo, el fondo tiene un ligero tinte `bg-white/10` y el texto/ícono es `st-primary`. Inactivo es `st-muted` con hover a blanco.
- **Sistema de Favoritos:** 
  - Hover sobre ítem: Aparece ícono de Estrella.
  - Al hacer clic, se agrega al grupo "Favoritos" arriba. La estrella activa toma color `st-accent`.

### 3.2 Header (Cabecera Superior)
- **Fondo:** `st-bg` o `st-surface` con borde inferior `st-border`.
- **Controles Izquierdos:** Menú Hamburguesa para colapsar sidebar.
- **Controles Derechos (Perfil y Alertas):**
  - Ícono de Campana con un badge rojo si hay alertas activas de equipos (ej. thermal_shutdown).
  - Foto del usuario circular (o ícono `UserCircle` en blanco).
  - Nombre truncado y Rol en gris `st-muted`.
  - Dropdown (`shadow-xl bg-st-surface border st-border`) con opciones de Perfil, Configuración y Cerrar Sesión (este último en texto rojo).

## 4. Estructura de Pantallas de Datos (Data Grids)
Las vistas de flotas, dispositivos y líneas deben tener un aspecto "Mission Control", muy denso pero limpio.

### 4.1 Barra Superior (Toolbar)
- Título principal usando **Quicksand Bold** (`text-2xl font-bold text-st-primary`).
- Botones de acción (Estilo minimalista):
  - **Refrescar:** Fondo transparente, borde `st-border`, hover en `st-surface`.
  - **Nuevo:** Fondo `st-primary`, texto negro (`text-black`), ícono `Plus`. Alto contraste.

### 4.2 Barra de Filtros
- Fondo `st-surface`, disposición en fila (`flex-row`).
- **Buscador global:** `input` oscuro (`bg-st-bg border-st-border text-white`) con ícono lupa. Debounce de 300ms.
- **Filtros rápidos:** Dropdowns oscuros para filtrar por estado ("Online", "Offline", "Con Alertas").

### 4.3 Data Grid (Tabla de Resultados)
- **Cabecera (`thead`):** Fondo `st-surface`, sticky top. Textos en mayúsculas, tamaño xs, color `st-muted` y fuente Quicksand Bold. Íconos de ordenamiento dinámicos.
- **Filas (`tbody`):**
  - Fondo `st-bg` alternado muy sutil (Zebra stripe `even:bg-white/[0.02]`).
  - **Hover:** Fila resalta con `hover:bg-white/[0.05]`.
  - **Indicadores de Estado:** Usar puntos de color (Dot indicator) verde/rojo junto al nombre del dispositivo para indicar su estado de red.
  - Formateo numérico alineado a la derecha.
- **Columna de Acciones (Derecha):** Íconos minimalistas sin fondo: Editar (`Edit2`, hover Cyan), Detalles (`Activity`, hover Blanco), Eliminar (`Trash2`, hover Rojo).

### 4.4 Paginación
- Pie de tabla con borde superior `st-border`.
- Controles numéricos. Página actual tiene borde inferior grueso en color `st-primary` o fondo cyan `st-accent`.

## 5. Diseño de Formularios de Edición y Modales
Uso de Modales Overlay flotantes con fondo oscurecido (`backdrop-blur-md bg-black/70`).

### 5.1 Estructura del Modal
- Contenedor con `bg-st-surface border border-st-border rounded-lg shadow-2xl`.
- Título limpio en la parte superior y botón `X` en la esquina.
- Diseño en Grid (1 columna móvil, 2 en escritorio).

### 5.2 Tipos de Campos y Validaciones
- **Inputs Genéricos:** Fondo oscuro (`bg-st-bg`), texto blanco (`text-white`), borde sutil (`border-st-border`).
- **Estados Focus:** Al enfocarse, el borde debe brillar con `st-accent` (`focus:ring-1 focus:ring-st-accent focus:border-st-accent`). Sin outline nativo del navegador.
- **Solo Lectura:** Fondo gris oscuro (`bg-white/5`), texto grisáceo, cursor no permitido.
- **Combobox Avanzado:** No usar selects nativos estándar para UX moderna. El componente debe permitir "Type-to-search", renderizando un menú flotante oscuro con scroll.

### 5.3 Modales de Confirmación (Alertas Destructivas)
- Título, mensaje de advertencia y botones: "Cancelar" (Borde gris, fondo transparente) y "Confirmar" (Ej. Fondo rojo y texto blanco para eliminar equipos o suspender líneas).

---

## Instrucción Directa para LLM:
*"Cuando se te solicite crear un nuevo componente, vista o módulo, **DEBES** aplicar de manera estricta todas las reglas de Tailwind CSS descritas aquí. Utiliza el esquema Dark Mode espacial (`bg-[#000000]`, `bg-[#111111]`), fuente exclusiva Quicksand, bordes sutiles grises y acentos cyan/blancos. La experiencia de usuario debe reflejar un panel de control satelital de alta tecnología, limpio, veloz y sin elementos legacy."*