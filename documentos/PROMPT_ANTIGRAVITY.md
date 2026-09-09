# PROMPT MAESTRO PARA ANTIGRAVITY — PORTAL STARLINK RESELLER / CLIENTE

Actúa como arquitecto senior y desarrollador full-stack. Vas a evolucionar la solución existente del proyecto Starlink. Debes construir **una sola plataforma**, no dos soluciones separadas.

## 1. Fuentes de verdad que debes leer primero

Antes de modificar código, lee COMPLETAMENTE:

1. `esquema_starlink_v2_actualizado.csv`
2. Todos los scripts SQL de migración de esta carpeta, en orden.
3. `20_DATOS_DEMO_6_MESES.sql`
4. El código actual del proyecto.

El CSV actualizado define tablas, campos, tipos y relaciones. Los SQL definen la migración real. **No inventes nombres de tablas o columnas.**

Si el código actual contradice el CSV/SQL, conserva compatibilidad, no borres datos, adapta models/repositories/services y documenta la diferencia.

## 2. Objetivo de producto

Crear UNA plataforma multi-tenant con dos experiencias:

### Ficha / vista RESELLER
Puede consultar todos los tenants/clientes y administrar:
- dashboard global;
- clientes/tenants;
- cuentas Starlink;
- líneas/servicios;
- User Terminals y routers;
- mapas y geozonas;
- telemetría;
- alertas;
- consumo;
- facturación Starlink al reseller;
- balance Starlink;
- estructura organizacional de cada cliente;
- centros de costos;
- históricos de 12 meses;
- operaciones remotas;
- aprobaciones de acciones críticas.

### Ficha / vista CLIENTE
Solo ve su propio `tenant_id`:
- dashboard;
- mis servicios;
- consumo y saldo;
- telemetría;
- históricos;
- alertas;
- mapa y geozonas;
- estructura organizacional;
- colaboradores;
- centros de costos;
- comprobantes/recibos registrados manualmente;
- comparativo consumo vs gasto;
- reportes;
- operaciones remotas solo si están delegadas.

Para la demo puede existir un switch `[RESELLER] [CLIENTE]`. En producción la vista debe depender de RBAC.

## 3. Multi-tenant obligatorio

Nunca confíes en un `tenant_id` enviado libremente por un usuario cliente.

- Cliente: tenant derivado de autenticación/sesión/token.
- Reseller: puede seleccionar tenant explícitamente.
- Backend debe aplicar el filtro siempre.
- El frontend solo oculta/expone UX; la seguridad real está en backend.

## 4. Jerarquía organizacional configurable

Cada tenant tiene exactamente 3 niveles técnicos, pero los nombres son configurables en `niveles_organizacion_config`.

Ejemplos:
- Territorio → Sucursal → Grupo
- Gerencia → Área → Sede

**No hardcodear los nombres.**

Reglas:
- Nivel 1 no tiene padre.
- Nivel 2 depende de Nivel 1.
- Nivel 3 depende de Nivel 2.
- Cada colaborador se asigna al Nivel 3 mediante `colaborador_unidad_historial`.
- Cada colaborador puede tener un equipo vigente mediante `colaborador_dispositivo_historial`.
- Las asignaciones son históricas; los reportes de meses cerrados no deben cambiar si luego se reorganiza al cliente.
- Las unidades pueden asociarse a centros de costos mediante `unidad_centro_costo_historial`.

## 5. Regla fundamental del 100% de costos

NO totalizar Nivel 1 + Nivel 2 + Nivel 3.

Para un mismo tenant, período, moneda y filtros:
- agrupar por Nivel 1 debe sumar 100%;
- agrupar por Nivel 2 debe sumar el mismo 100%;
- agrupar por Nivel 3 debe sumar el mismo 100%;
- agrupar por colaboradores debe sumar el mismo 100%;
- agrupar por centros de costos debe sumar el mismo 100%.

La fuente granular es `costo_servicio_mes`: una fila por línea/equipo/mes.

Usar las vistas:
- `vw_gasto_cliente_por_nivel1`
- `vw_gasto_cliente_por_nivel2`
- `vw_gasto_cliente_por_nivel3`
- `vw_gasto_cliente_por_colaborador`
- `vw_gasto_cliente_por_centro_costo`

No crear tablas de totales independientes por nivel.

## 6. Históricos y tablas mensuales

Detalle de alta volumetría:
- `telemetria_terminal_YYYYMM`
- `telemetria_router_YYYYMM`
- `ip_asignaciones_YYYYMM`

Las tablas se crean mediante `crear_tablas_historicas_mes(fecha)`.

Reglas de consulta:
- un mes: consultar una tabla mensual;
- pocos meses: consultar cada tabla requerida y consolidar en backend;
- 6/12 meses o tendencias: preferir resúmenes y snapshots (`telemetria_*_resumen_hora`, `servicio_resumen_dia`, `consumo_diario`, `costo_servicio_mes`).

Nunca formar un nombre de tabla mensual desde texto libre del usuario. Derivarlo únicamente de fechas validadas (`YYYYMM`).

## 7. Histórico de 12 meses

Permitir gráfico/tabla de:
- gasto del cliente;
- costo Starlink al reseller;
- consumo total GB;
- Priority GB;
- Standard GB;
- WAN RX bytes;
- WAN TX bytes;
- download;
- upload;
- latencia;
- pérdida de paquetes;
- signal quality;
- obstrucción;
- disponibilidad;
- alertas;
- eventos fuera de geozona.

Filtros/agrupaciones:
- período;
- tenant;
- Nivel 1;
- Nivel 2;
- Nivel 3;
- centro de costos;
- colaborador;
- equipo;
- línea Starlink.

Los textos visibles de Nivel 1/2/3 deben salir de `niveles_organizacion_config`.

## 8. Facturación: dos escenarios separados

### A. Starlink → Reseller
Datos automáticos/API:
- `starlink_facturas_reseller`
- `starlink_factura_detalles`
- `starlink_factura_lineas`
- `starlink_balance_historial`

Mostrar total facturado, pagado, pendiente y costo por service line cuando exista asignación.

### B. Reseller → Cliente
El reseller ya tiene su sistema de facturación. En esta fase NO reemplazarlo ni integrarlo.

El cliente registra manualmente su recibo/factura:
- `comprobantes_cliente`
- `comprobante_cliente_lineas`

Permitir:
- tipo y número de documento;
- fecha;
- período;
- moneda;
- importe;
- estado declarado;
- archivo PDF/imagen;
- asociación opcional a líneas;
- comparativo contra consumo.

No guardar archivos como BYTEA. Guardar URI/nombre/hash y almacenar el archivo fuera de PostgreSQL.

## 9. Control operativo

Usar:
- `control_servicio_actual`
- `estado_terminal_actual`
- `estado_router_actual`
- `comandos_remotos_log`
- `control_servicio_historial`
- `catalogo_operaciones_remotas`

Operaciones previstas:
- reboot User Terminal/antena;
- reboot router;
- Priority Data opt-in;
- Priority Data opt-out;
- top-up;
- Public IP;
- desactivación de service line como acción crítica.

**Nunca llamar “reiniciar satélite”.** La acción es reiniciar el equipo Starlink del cliente.

Toda acción debe mostrar estado, confirmación, ejecución, respuesta y auditoría.

## 10. Límites de gasto/consumo

`limite_gasto_adicional` y `limite_adicional_gb_mes` son políticas internas de nuestra plataforma.

Antes de top-up u opt-in:
1. calcular consumo/gasto actual;
2. validar límites;
3. si supera el límite, bloquear o requerir aprobación según `accion_al_limite`;
4. registrar la decisión.

No presentar el límite monetario interno como una función nativa de Starlink.

## 11. Geozonas

Usar:
- `geozonas`
- `geozona_h3_celdas`
- `geozona_politicas`
- `dispositivo_geozona_historial`
- `dispositivo_geozona_estado_actual`
- `geozona_eventos`

La ubicación dinámica de Starlink se representa por H3 aproximado.

No generar una alerta por una sola lectura fuera. Aplicar:
- `muestras_consecutivas_salida`;
- `segundos_fuera_confirmacion`;
- `muestras_consecutivas_retorno`.

Flujo:
1. recibir H3;
2. validar pertenencia a geozona;
3. acumular muestras/tiempo;
4. confirmar salida;
5. crear `geozona_eventos`;
6. notificar;
7. aplicar política.

Acciones:
- solo alertar;
- alertar + opt-out Priority;
- requerir aprobación reseller para desactivar;
- desactivar inmediatamente solo si la política destructiva lo permite explícitamente.

Desactivar una service line es DESTRUCTIVO; usar doble confirmación y auditoría. No tratarlo como pause/resume.

El seed usa H3 `88demo...` sintéticos solo para modo MOCK. No intentar decodificarlos como H3 reales. En LIVE usar H3 reales recibidos desde Starlink.

## 12. Integración Starlink desacoplada

Crear una interfaz/gateway, por ejemplo `StarlinkGateway`, con dos implementaciones:
- `MockStarlinkGateway`
- `LiveStarlinkGateway`

Configurable por variable de entorno, por ejemplo `STARLINK_MODE=mock|live`.

DEMO:
- no requiere credenciales;
- usa seed y mocks.

LIVE:
- autenticación;
- Management API;
- Telemetry API;
- rate limits;
- retries prudentes;
- correlación;
- errores;
- registrar sincronizaciones en `sincronizaciones_api`.

El frontend nunca llama directamente a Starlink.

## 13. Datos demo

`20_DATOS_DEMO_6_MESES.sql` debe dejar listo:
- 1 tenant: Minera Horizonte;
- 1 cuenta;
- 3 áreas;
- 3 sedes Nivel 3;
- 10 colaboradores;
- 10 terminales;
- 10 routers;
- 10 líneas;
- marzo-agosto 2026;
- consumo diario;
- telemetría horaria sintética;
- bytes WAN;
- latencia/pérdida/download/upload;
- facturas Starlink;
- comprobantes cliente;
- costos mensuales granulares;
- geozonas;
- un equipo fuera de geozona pendiente de aprobación.

No crear una BD demo separada.

## 14. Pantallas mínimas

### Reseller
1. Dashboard global
2. Clientes
3. Detalle cliente
4. Servicios
5. Mapa / geozonas
6. Alertas
7. Consumo
8. Telemetría
9. Históricos
10. Facturación Starlink
11. Organización / centros de costos
12. Operaciones remotas
13. Aprobaciones
14. Administración

### Cliente
1. Dashboard
2. Mis servicios
3. Mapa
4. Consumo
5. Telemetría
6. Históricos
7. Alertas
8. Organización / colaboradores
9. Centros de costos
10. Mis comprobantes
11. Geozonas
12. Reportes
13. Mi cuenta

## 15. Ficha de servicio

Mostrar como mínimo:
- estado;
- service line;
- nombre;
- terminal;
- router;
- colaborador asignado;
- Nivel 1/2/3;
- centro de costo;
- plan;
- bolsa contratada;
- consumo y disponible;
- download;
- upload;
- latencia;
- packet loss;
- señal;
- obstrucción;
- uptime;
- dirección registrada;
- H3 actual;
- geozona;
- alertas;
- última actualización.

## 16. Exportaciones

Excel/CSV respetando los filtros aplicados para:
- servicios;
- consumo;
- telemetría;
- históricos;
- costos;
- centros de costos;
- colaboradores;
- alertas;
- eventos de geozona.

## 17. Seguridad y calidad

- consultas parametrizadas;
- tenant isolation;
- paginación;
- validar fechas;
- evitar SQL injection en tablas mensuales;
- secretos por variables de entorno;
- auditoría de comandos;
- validación de archivos;
- no exponer `raw_json` al usuario final salvo modo técnico autorizado;
- mantener compatibilidad con las tablas existentes;
- no borrar datos durante la migración.

## 18. Forma de trabajo requerida

Antes de programar:
1. inspecciona la arquitectura actual;
2. mapea módulos existentes y reutilizables;
3. enumera migraciones/modelos/repositorios/endpoints/pantallas afectados;
4. presenta un plan corto de implementación;
5. implementa incrementalmente sin crear una solución paralela.

Al terminar entrega:
- archivos modificados;
- endpoints;
- pantallas;
- instrucciones de migración;
- instrucciones de seed demo;
- cómo cambiar MOCK/LIVE;
- pruebas realizadas;
- pendientes para credenciales Starlink reales.
