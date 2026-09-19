# 02_ESTANDAR_MAESTRO_DISENO_UX_UI.md

**Versión:** 5.1.0  
**Estado:** Estándar corporativo obligatorio  
**Ámbito:** Todas las soluciones nuevas y todas las migraciones de soluciones Legacy  
**Naturaleza del documento:** Especificación normativa de diseño UX/UI  
**No es un prompt de ejecución**

---

# 1. PROPÓSITO Y NATURALEZA DEL DOCUMENTO

Este documento define el **estándar corporativo único de diseño UX/UI** para todas las soluciones.

Su función es establecer, de forma declarativa y normativa:

- cómo debe verse la interfaz;
- cómo debe comportarse;
- qué patrones de interacción deben utilizarse;
- qué componentes deben reutilizarse;
- qué dimensiones y reglas de simetría deben respetarse;
- cómo deben funcionar los mantenimientos;
- cómo deben mostrarse formularios, tablas, mensajes y modales;
- cómo debe aplicarse la identidad visual de cada tenant;
- cómo debe responder la solución en móviles, tablets y monitores;
- qué requisitos de accesibilidad, compatibilidad y seguridad visual son obligatorios.

Este archivo **NO debe interpretarse como un prompt independiente que deba ejecutarse manualmente**.

Los prompts de desarrollo o migración deben **referenciar este documento como fuente normativa** y aplicar sus reglas durante la implementación.

## 1.1 Regla de autoridad

Cuando una solución sea migrada desde tecnología Legacy:

- la solución Legacy define la funcionalidad existente;
- la base de datos y contratos funcionales definen los datos y reglas;
- el estándar de arquitectura define cómo debe construirse técnicamente;
- **este documento define cómo debe verse y comportarse toda la interfaz final**.

La apariencia visual Legacy no prevalece sobre este estándar.

## 1.2 Regla de cobertura total

El estándar aplica al **100 % de la interfaz**, incluyendo:

- login;
- recuperación de contraseña;
- autenticación;
- App Shell;
- header;
- sidebar;
- navegación;
- favoritos;
- perfil;
- dashboard;
- KPIs;
- gráficos;
- mantenimientos;
- catálogos;
- listados;
- tablas;
- formularios;
- creación;
- edición;
- consultas;
- procesos transaccionales;
- maestro-detalle;
- reportes;
- filtros;
- buscadores;
- modales;
- mensajes;
- confirmaciones;
- toasts;
- botones;
- iconos;
- badges;
- inputs;
- selects;
- combobox;
- textareas;
- checkboxes;
- radio buttons;
- campos de fecha;
- campos numéricos;
- paginación;
- loading;
- empty states;
- imágenes;
- avatares;
- logos;
- responsive;
- accesibilidad;
- tipografía;
- colores;
- espacios;
- bordes;
- radios;
- alturas;
- anchos.

No se admite una migración donde unas pantallas utilicen el estándar nuevo y otras conserven patrones Legacy incompatibles.

---

# 2. PRINCIPIOS RECTORES

Toda interfaz debe cumplir simultáneamente con los siguientes principios:

1. **Consistencia:** una misma función visual usa el mismo patrón en toda la solución.
2. **Simetría:** componentes equivalentes mantienen dimensiones y alineaciones homogéneas.
3. **Reutilización:** los patrones se implementan mediante componentes compartidos.
4. **Responsive:** la interfaz se adapta desde móviles pequeños hasta monitores grandes.
5. **Accesibilidad:** no se depende exclusivamente del color para transmitir información.
6. **Predictibilidad:** una misma acción debe encontrarse y comportarse igual en todos los módulos equivalentes.
7. **Separación funcional/visual:** el dominio funcional no puede redefinir el Design System.
8. **Cero creatividad no autorizada:** no se inventan patrones cuando el estándar ya define uno.
9. **Seguridad visual:** el contenido externo se representa de forma segura.
10. **Homologación completa:** una solución migrada no debe mezclar componentes Legacy y corporativos.

---

# 3. TIPOGRAFÍA OFICIAL

La fuente única y obligatoria es:

**Quicksand**

Pesos autorizados:

- 400 Regular;
- 500 Medium;
- 600 SemiBold;
- 700 Bold.

## 3.1 Aplicación global

Quicksand debe aplicarse a:

- `html`;
- `body`;
- raíz de la aplicación;
- botones;
- inputs;
- selects;
- textareas;
- tablas;
- modales;
- menús;
- tooltips;
- gráficos cuando la librería lo permita.

Referencia técnica:

```css
html,
body,
#root,
button,
input,
select,
textarea {
    font-family: "Quicksand", sans-serif;
}
```

No basta con declarar la fuente. La implementación debe garantizar que la fuente se encuentre realmente cargada y disponible.

## 3.2 Jerarquía tipográfica

- 400: textos descriptivos, placeholders, notas.
- 500: labels, celdas de tabla, submenús.
- 600: botones, badges, encabezados secundarios.
- 700: títulos principales, KPIs, títulos de modal.

No se permite sustituir Quicksand por Arial, Segoe UI, Roboto, Inter u otra fuente salvo modificación formal futura de este estándar.

---

# 4. SISTEMA DE COLOR MULTI-TENANT

La identidad visual es dinámica por tenant.

Los colores base deben provenir de configuración:

- `color_primario`;
- `color_secundario`.

## 4.1 Prioridad de carga

1. Si el tenant posee ambos colores válidos, se utilizan.
2. Si la configuración no existe, no responde o es inválida, se utiliza la paleta fallback corporativa.
3. No existe una tercera alternativa.

Fallback oficial:

```css
:root {
  --color-brand-primary: #00382b;
  --color-brand-secondary: #d99b26;
}
```

## 4.2 Variantes derivadas

La aplicación debe disponer de tokens equivalentes a:

```css
--color-brand-primary
--color-brand-primary-hover
--color-brand-primary-active
--color-brand-primary-soft
--color-brand-primary-border
--color-brand-primary-contrast

--color-brand-secondary
--color-brand-secondary-hover
--color-brand-secondary-active
--color-brand-secondary-soft
--color-brand-secondary-border
--color-brand-secondary-contrast

--color-bg-app
--color-bg-surface
--color-bg-subtle
--color-border

--color-text-primary
--color-text-secondary
--color-text-muted

--color-status-success
--color-status-warning
--color-status-danger
--color-status-info
```

Las variantes deben centralizarse.

No deben definirse colores corporativos individualmente en cada pantalla.

## 4.3 Prohibiciones

Queda prohibido:

- inventar una paleta por tipo de negocio;
- inferir colores desde el logo;
- inferir colores desde la aplicación Legacy;
- utilizar colores hardcodeados no definidos como tokens;
- crear una identidad visual diferente por módulo.

## 4.4 Degradados

Los degradados no forman parte del tratamiento visual corporativo por defecto.

Queda prohibido utilizar, salvo aprobación explícita futura del estándar:

```css
linear-gradient(...)
radial-gradient(...)
conic-gradient(...)
```

en:

- botones;
- sidebar;
- header;
- tarjetas;
- modales;
- banners;
- controles;
- estados activos.

Los componentes de marca utilizan colores sólidos derivados de los tokens.

---

# 5. SISTEMA DE ESPACIADO, BORDES Y RADIOS

Escala recomendada:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;

--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
```

Los elementos equivalentes deben usar la misma escala.

No se deben crear márgenes, radios o paddings arbitrarios para cada pantalla.

---

# 6. SIMETRÍA Y DIMENSIONES

La simetría es una regla obligatoria.

Los componentes hermanos de un mismo grupo deben compartir:

- ancho;
- alto;
- padding;
- radio;
- alineación;
- separación.

## 6.1 Botones de formulario y modal

Dimensión desktop:

```text
160 px × 40 px
```

Ejemplo:

```text
[      Cancelar      ] [      Confirmar      ]
       160×40                160×40
```

El tamaño no cambia por longitud del texto.

## 6.2 Botones de barra de mantenimiento

Dimensión desktop:

```text
112 px × 40 px
```

Aplicable a:

- Refrescar;
- Exportar;
- Nuevo.

## 6.3 Botones iconográficos

```text
36 px × 36 px
```

## 6.4 Botones de fotografía

```text
140 px × 40 px
```

## 6.5 Mobile

Cuando el espacio no sea suficiente, los botones pueden pasar a ancho completo, pero todos los botones hermanos del mismo grupo deben mantener el mismo ancho.

---

# 7. APP SHELL CORPORATIVO

Toda pantalla autenticada debe utilizar el mismo App Shell.

Estructura conceptual:

```text
+--------------------------------------------------------------------------------+
| [☰] [LOGO / NOMBRE]                                [NOTIFICACIONES] [PERFIL]   |
+---------------------------+----------------------------------------------------+
| SIDEBAR                   | ÁREA PRINCIPAL                                     |
|                           |                                                    |
| Elementos principales     |                                                    |
| FAVORITOS                 |              CONTENIDO                             |
| Grupos / módulos          |                                                    |
|                           |                                                    |
| Cerrar sesión             |                                                    |
+---------------------------+----------------------------------------------------+
```

Elementos estructurales:

- header;
- hamburguesa;
- logo/identidad;
- sidebar;
- navegación;
- favoritos;
- perfil;
- área principal;
- cierre de sesión.

---

# 8. SIDEBAR Y HAMBURGUESA

## 8.1 Dimensiones

```text
Desktop expandido: 260 px
Desktop colapsado: 72 px
Mobile: drawer / off-canvas
```

## 8.2 Hamburguesa

El botón hamburguesa forma parte del App Shell y permite expandir/colapsar el sidebar.

En móvil abre/cierra el drawer.

## 8.3 Color

El sidebar utiliza:

```css
background-color: var(--color-brand-primary);
```

La opción activa utiliza el color secundario o una variante derivada compatible con contraste.

No debe existir un sidebar diferente por módulo.

---

# 9. FAVORITOS

El sistema de favoritos forma parte del estándar general de navegación.

Toda opción navegable elegible debe disponer de:

```text
☆ No favorito
★ Favorito
```

Debe existir un grupo:

**FAVORITOS**

La selección se persiste por usuario.

Cuando no existan favoritos, el grupo puede ocultarse o mostrar un estado vacío consistente.

Los iconos deben proceder de la librería vectorial estándar, no de emojis de sistema.

---

# 10. PERFIL DE USUARIO

Toda solución autenticada debe disponer de acceso al perfil desde el header.

Debe contemplar:

- avatar/fotografía;
- nombre;
- rol o descripción secundaria cuando corresponda;
- menú desplegable.

El menú puede contener:

- Mi Perfil;
- configuración disponible;
- cerrar sesión.

No debe sustituirse el perfil por un simple texto sin comportamiento.

---

# 11. PANTALLA MI PERFIL

Patrón obligatorio:

- fotografía circular;
- imagen centrada;
- `object-fit: cover`;
- anillo asociado al color secundario;
- botones Cambiar Foto / Eliminar Foto simétricos;
- formulario estructurado por secciones;
- controles de altura uniforme;
- botón Guardar Cambios.

Campos típicos cuando existan funcionalmente:

- usuario;
- nombre completo;
- correo alternativo;
- celular;
- sigla corta;
- país principal;
- zona horaria.

---

# 12. LOGIN

El login debe:

- estar centrado horizontal y verticalmente;
- mantener logo centrado;
- usar Quicksand;
- usar tema tenant/fallback;
- usar controles homogéneos;
- ser responsive;
- funcionar desde 320 px;
- evitar overflow.

Orden visual recomendado:

1. Logo.
2. Título.
3. Usuario/correo.
4. Contraseña.
5. Recuperación de contraseña.
6. Recordarme.
7. Ingresar.
8. Separador.
9. SSO disponibles.
10. Versión.
11. Fecha de actualización.

Los botones SSO equivalentes deben ser simétricos.

---

# 13. DASHBOARD

El Dashboard debe utilizar App Shell y componentes corporativos.

Reglas:

- filtros homogéneos;
- tarjetas KPI simétricas;
- misma altura para KPIs de una misma fila;
- gráficos responsive;
- tipografía corporativa;
- colores por tokens;
- sin degradados no autorizados.

Distribución de KPIs:

```text
Desktop: 4 por fila cuando exista espacio
Tablet: 2 por fila
Mobile: 1 por fila
```

---

# 14. CLASIFICACIÓN DE PATRONES DE PANTALLA

Toda pantalla debe corresponder a un patrón funcional.

Patrones corporativos:

1. Login / autenticación.
2. Dashboard.
3. Perfil.
4. Mantenimiento / CRUD.
5. Formulario.
6. Consulta.
7. Proceso transaccional.
8. Maestro-detalle.
9. Reporte.
10. Configuración.
11. Visualización especializada.

Cuando una funcionalidad encaje en un patrón existente, no debe inventarse un layout alternativo.

---

# 15. PATRÓN DE MANTENIMIENTO / CRUD

Una funcionalidad se considera mantenimiento cuando administra múltiples registros mediante operaciones como:

- listar;
- buscar;
- filtrar;
- crear;
- editar;
- activar;
- desactivar;
- eliminar;
- exportar.

El nombre funcional de la pantalla no modifica esta clasificación.

## 15.1 Estructura estándar

```text
+--------------------------------------------------------------------------------+
| TÍTULO                                [REFRESCAR] [EXPORTAR] [+ NUEVO]          |
+--------------------------------------------------------------------------------+
| [ Buscar en todos los registros... ]                  [ Estado: ACTIVOS ▼ ]    |
+--------------------------------------------------------------------------------+
| ACCIONES | CAMPO 1 | CAMPO 2 | CAMPO 3 | CAMPO 4 | ...                       |
+--------------------------------------------------------------------------------+
|          |         |         |         |         |                           |
+--------------------------------------------------------------------------------+
| Mostrando X-Y de Z                      PAGINACIÓN          [N por página ▼]    |
+--------------------------------------------------------------------------------+
```

Esta estructura se mantiene incluso cuando no existan registros.

## 15.2 Estado vacío

Cero registros no autoriza a sustituir la tabla por un formulario lateral.

El mantenimiento conserva:

- toolbar;
- búsqueda;
- filtro;
- encabezado de tabla;
- empty state;
- paginación cuando corresponda.

## 15.3 Creación

La creación se inicia desde:

`+ Nuevo`

y abre un formulario o modal estándar.

No debe existir permanentemente un formulario de creación al lado de la lista en un mantenimiento.

## 15.4 Edición

La edición se inicia desde la columna `ACCIONES`.

Creación y edición deben reutilizar el mismo patrón de formulario.

---

# 16. COLUMNA ACCIONES

En todo mantenimiento:

**ACCIONES** debe ser la primera columna.

Si existe scroll horizontal interno, la columna debe permanecer sticky a la izquierda.

## 16.1 Vista ACTIVOS

Acciones:

- Editar;
- Deshabilitar / Desactivar.

La acción de estado representa:

```text
ACTIVO → INACTIVO
```

En la vista ACTIVOS no se muestra la papelera para DELETE físico.

## 16.2 Vista INACTIVOS

La acción Deshabilitar/Desactivar desaparece.

Debe aparecer:

- Editar, cuando aplique;
- Eliminar mediante papelera roja.

La papelera representa DELETE físico.

## 16.3 Dependencias

El backend es la autoridad final para determinar si un registro puede eliminarse.

Si existen dependencias:

- no se elimina;
- se muestra una ventana controlada;
- se explica que existen elementos dependientes;
- no se exponen nombres de constraints, SQL, stack traces ni información técnica interna.

---

# 17. TOOLBAR DE MANTENIMIENTO

Patrón estándar:

```text
[ Refrescar ] [ Exportar ] [ + Nuevo ]
```

Los botones deben compartir:

- 112 px de ancho desktop;
- 40 px de alto;
- mismo radio;
- mismo padding;
- misma tipografía.

La visibilidad puede depender de permisos, pero no debe existir una variante visual distinta por módulo.

---

# 18. BUSCADOR, FILTROS Y PAGINACIÓN

## 18.1 Buscador

Texto estándar recomendado:

`Buscar en todos los registros...`

## 18.2 Estado

Selector estándar:

- Activos;
- Inactivos.

## 18.3 Paginación

Debe contemplar:

- rango mostrado;
- total;
- anterior;
- siguiente;
- página actual;
- tamaño de página.

---

# 19. FORMULARIOS

## 19.1 Desktop

Patrón de 2 columnas cuando el contenido lo permita.

## 19.2 Mobile

1 columna.

## 19.3 Labels

Los labels permanecen visibles sobre el control.

No se utiliza el placeholder como único descriptor del campo.

## 19.4 Campos obligatorios

Todo campo visible/editable obligatorio por:

- `NOT NULL`;
- contrato API;
- regla funcional;

debe mostrar:

`*`

junto al label.

Los campos técnicos generados automáticamente no se muestran únicamente por ser `NOT NULL`.

## 19.5 Validación

Al guardar:

1. se validan campos obligatorios;
2. el formulario no se envía mientras existan errores cliente conocidos;
3. el campo inválido usa estado visual de error;
4. se muestra un mensaje textual;
5. el foco se dirige al primer campo inválido;
6. se conservan los valores ya ingresados.

No se comunica un error únicamente mediante color.

---

# 20. MODALES

Patrón estándar:

```text
+-------------------------------------------------------------+
| TÍTULO                                                   X |
+-------------------------------------------------------------+
| BODY / FORMULARIO                                          |
+-------------------------------------------------------------+
|                         [Cancelar] [Confirmar]               |
+-------------------------------------------------------------+
```

Desktop:

```text
max-width aproximado: 760 px
```

Mobile:

- una columna;
- ancho limitado al viewport;
- sin scroll horizontal.

Referencia:

```css
width: min(760px, calc(100vw - 32px));
max-width: 100%;
```

Los botones hermanos mantienen dimensiones idénticas.

---

# 21. PROCESOS TRANSACCIONALES Y MAESTRO-DETALLE

Una pantalla transaccional o maestro-detalle puede utilizar un layout diferente al CRUD, siempre que corresponda a su función real.

Debe conservar obligatoriamente:

- Quicksand;
- tema por tenant/fallback;
- componentes corporativos;
- botones simétricos;
- campos obligatorios;
- validaciones;
- responsive;
- mensajes controlados;
- ausencia de degradados no autorizados;
- ausencia de overflow horizontal global.

El hecho de ser una pantalla especializada no autoriza a crear un Design System distinto.

---

# 22. MENSAJES DEL SISTEMA

Queda prohibido utilizar como experiencia visible:

```javascript
window.alert()
window.confirm()
window.prompt()
```

Los mensajes controlados deben usar componentes del Design System.

Tipos mínimos:

- Información;
- Éxito;
- Advertencia;
- Error;
- Confirmación.

Una ventana debe contemplar:

- icono semántico;
- título;
- mensaje;
- botones;
- cierre cuando sea seguro;
- backdrop cuando corresponda;
- navegación por teclado;
- foco administrado;
- responsive.

## 22.1 Confirmación de desactivación

Debe explicar que el registro pasará a estado inactivo, no que será eliminado.

## 22.2 Confirmación de DELETE

Debe explicar que la eliminación es definitiva.

## 22.3 Dependencias

Debe presentar un mensaje amigable, no errores técnicos.

---

# 23. TOASTS, LOADING Y EMPTY STATES

## 23.1 Toasts

Uso para feedback no bloqueante:

- éxito;
- información;
- warning;
- error recuperable.

## 23.2 Loading

- skeleton cuando la estructura sea predecible;
- spinner para acciones puntuales;
- bloqueo de doble envío;
- evitar saltos de layout.

## 23.3 Empty state

Debe indicar:

- que no existen registros;
- contexto del filtro;
- acción disponible cuando corresponda.

En mantenimientos, el empty state no reemplaza la estructura de tabla.

---

# 24. ICONOGRAFÍA

Debe utilizarse una sola familia de iconos vectoriales.

No mezclar arbitrariamente:

- emojis;
- PNG;
- múltiples librerías;
- estilos filled/outline incompatibles.

Los iconos sin texto visible deben disponer de:

- tooltip cuando corresponda;
- `aria-label`.

---

# 25. RESPONSIVE

Rangos:

```text
320–479 px     móvil pequeño
480–767 px     móvil
768–1023 px    tablet
1024–1439 px   desktop
1440–1919 px   desktop grande
>=1920 px      monitor grande
```

Reglas:

- no overflow horizontal de página;
- sidebar como drawer en móvil;
- formularios 2→1 columnas;
- KPIs 4→2→1;
- botones adaptables;
- tablas con scroll interno;
- columna ACCIONES visible;
- modales dentro del viewport;
- imágenes centradas;
- controles táctiles adecuados.

---

# 26. COMPATIBILIDAD DE NAVEGADORES

Compatibilidad mínima:

- Chrome N, N-1, N-2, N-3;
- Edge N, N-1, N-2, N-3;
- Firefox N, N-1, N-2, N-3;
- Safari N, N-1, N-2, N-3;
- Safari iOS;
- Chrome Android.

No usar APIs experimentales críticas sin fallback compatible.

---

# 27. ACCESIBILIDAD

Objetivo:

**WCAG 2.2 AA**

Requisitos mínimos:

- navegación por teclado;
- foco visible;
- contraste suficiente;
- labels asociados;
- mensajes accesibles;
- `aria-label` en iconos sin texto;
- focus trap en modales;
- no usar color como único indicador;
- targets táctiles adecuados.

---

# 28. SEGURIDAD VISUAL

Contenido proveniente de:

- usuario;
- API;
- base de datos;

debe renderizarse de forma segura.

Una cadena como:

```html
<script>alert(1)</script>
```

debe mostrarse como texto y nunca ejecutarse.

No utilizar:

```javascript
innerHTML
dangerouslySetInnerHTML
```

con contenido no confiable.

---

# 29. COMPONENTES REUTILIZABLES

La solución debe disponer de componentes equivalentes a:

```text
AppShell
Header
Sidebar
SidebarGroup
SidebarItem
FavoriteMenu
FavoriteMenuItem
UserProfileMenu

UIButton
UIIconButton

UIFormField
UIInput
UISelect
UICombobox
UITextArea
UICheckbox
UIRadio
UIDatePicker

UITable
UITableActions
UIPagination
UIToolbar
UISearch

UIModal
UIConfirmDialog
UIMessageDialog
UIToast

UICard
UIKpiCard

UILoading
UIEmptyState
```

Los nombres físicos pueden adaptarse a las convenciones tecnológicas, pero el Design System debe centralizar comportamiento y apariencia.

---

# 30. PROHIBICIÓN DE ESTILOS DUPLICADOS

No deben existir diferentes implementaciones visuales para una misma función.

No se deben crear botones, inputs, tablas o modales particulares por pantalla cuando ya existe un componente compartido.

Los valores visuales deben centralizarse mediante:

- tokens;
- theme;
- componentes;
- utilities compartidas.

---

# 31. HOMOLOGACIÓN DE SOLUCIONES LEGACY

Toda migración debe producir una interfaz final homogénea.

Cuando se detecte un patrón visual Legacy incompatible:

- debe reemplazarse por el patrón corporativo correspondiente;
- deben revisarse todas sus apariciones;
- no debe corregirse únicamente una pantalla aislada.

La migración UX/UI se considera incompleta mientras existan pantallas significativas que mantengan patrones incompatibles.

---

# 32. MATRIZ DE CUMPLIMIENTO

| Criterio | Requisito |
|---|---|
| Tipografía | Quicksand efectiva |
| Tema | Tenant o fallback corporativo |
| Colores | Sin paletas inventadas |
| Degradados | No autorizados por defecto |
| App Shell | Único y común |
| Hamburguesa | Presente |
| Sidebar | 260/72 y drawer mobile |
| Favoritos | Integrados |
| Perfil | Integrado |
| Botones | Simétricos |
| Formularios | Consistentes |
| Obligatorios | `*` visible y validación |
| Mantenimientos | Patrón CRUD corporativo |
| Acciones | Primera columna |
| Activos | Deshabilitar/Desactivar |
| Inactivos | DELETE físico |
| Dependencias | Mensaje controlado |
| Modales | Componente común |
| Mensajes | Sin alertas nativas |
| Responsive | 320 px en adelante |
| Overflow | Sin overflow horizontal global |
| Iconografía | Familia vectorial consistente |
| Seguridad visual | Contenido escapado |
| Navegadores | N a N-3 |
| Accesibilidad | WCAG 2.2 AA |

---

# 33. CRITERIO DE ACEPTACIÓN UX/UI

Una pantalla no cumple el estándar si presenta cualquiera de los siguientes casos:

- fuente distinta a Quicksand;
- colores corporativos inventados;
- degradados no autorizados;
- botones hermanos de tamaños distintos;
- mantenimiento sin columna ACCIONES;
- papelera de DELETE en vista ACTIVOS;
- acción de desactivar como sustituto de DELETE en INACTIVOS;
- formulario lateral permanente dentro de un CRUD;
- modal con overflow horizontal;
- campos obligatorios sin `*`;
- validación sin mensaje textual;
- alertas nativas;
- App Shell sin elementos estructurales obligatorios;
- navegación inconsistente;
- componentes equivalentes con estilos diferentes;
- pantalla significativa que conserve un patrón Legacy incompatible.

---

# 34. DEFINICIÓN DE CUMPLIMIENTO GLOBAL

Una solución cumple este estándar cuando:

1. toda la interfaz utiliza el mismo Design System;
2. todos los patrones funcionalmente equivalentes están homologados;
3. los componentes se reutilizan;
4. no existen restos visuales Legacy incompatibles;
5. el tema se resuelve por tenant/fallback;
6. Quicksand está aplicada;
7. la solución es responsive;
8. los mantenimientos utilizan el patrón corporativo;
9. los mensajes están controlados;
10. los formularios validan correctamente;
11. la navegación es consistente;
12. el comportamiento visual es uniforme en toda la solución.

---

# 34.1 COBERTURA OBLIGATORIA EN MIGRACIONES LEGACY

Cuando este estándar sea aplicado a una migración Legacy, **cada interfaz Legacy activa deberá ser identificada, clasificada y reconstruida individualmente** usando el patrón corporativo que corresponda.

La revisión debe cubrir, como mínimo:

- rutas visibles y no visibles en menú;
- páginas;
- layouts;
- formularios;
- listados;
- tablas;
- modales;
- pestañas;
- popups;
- reportes con interfaz;
- procesos transaccionales;
- consultas;
- dashboards;
- estados vacíos, loading y error;
- componentes compartidos;
- estilos globales y estilos locales aún utilizados.

No se considera homologada una solución cuando solo una parte de sus pantallas utiliza el estándar nuevo.

La equivalencia exigida es:

```text
TOTAL DE INTERFACES LEGACY ACTIVAS IDENTIFICADAS
=
TOTAL DE INTERFACES NUEVAS IMPLEMENTADAS Y VALIDADAS UX/UI
```

La apariencia Legacy se utiliza para comprender flujo, información y acciones; no para conservar un patrón visual incompatible.

Si varias interfaces son funcionalmente equivalentes, todas deben utilizar los mismos componentes compartidos y el mismo patrón.

Después de migrar las interfaces una por una deberá existir una auditoría global que detecte restos de:

- tipografías anteriores;
- colores hardcodeados;
- degradados no autorizados;
- botones con dimensiones antiguas;
- formularios laterales Legacy dentro de CRUD;
- tablas con acciones en posiciones diferentes;
- modales antiguos;
- alertas nativas;
- sidebars o headers alternativos;
- CSS antiguo aún importado;
- componentes duplicados visualmente incompatibles.

Cualquier resto activo incompatible constituye incumplimiento global.

---

# 35. RELACIÓN CON LOS PROMPTS DE MIGRACIÓN

Este documento **no debe duplicar el flujo de trabajo del prompt de migración**.

El prompt de migración debe:

- indicar que este archivo debe leerse antes de construir el frontend;
- exigir que todas las pantallas se clasifiquen según los patrones aquí definidos;
- exigir que toda la solución sea homologada;
- impedir que la migración se considere terminada mientras exista un incumplimiento significativo;
- usar este archivo como fuente normativa de UX/UI.

Este documento, en cambio, debe mantenerse como **estándar estable y reutilizable**, independiente de una solución específica.

---

# 36. REGLA FINAL

**Este archivo es el contrato corporativo de diseño UX/UI.**

No es una inspiración.  
No es un ejemplo.  
No es una guía opcional.  
No es un prompt independiente.

Es la especificación normativa que define cómo deben verse y comportarse todas las soluciones.

La funcionalidad puede variar entre productos.

**El lenguaje visual, los patrones de interacción, la simetría, la navegación, los componentes y las reglas UX/UI deben permanecer estandarizados.**
