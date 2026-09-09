# Starlink — entrega consolidada V4

## Objetivo

Migración incremental sobre la BD actual del CSV original. No elimina las 11 tablas actuales ni sus datos.

## Orden recomendado

1. Backup completo de la BD.
2. `00_PRECHECK_Y_BACKUP.sql`
3. `01_MIGRACION_MAESTROS_V2.sql`
4. Crear/asignar tenants a las cuentas reales existentes.
5. `02_TABLAS_MENSUALES_DETALLE.sql`
6. `03_RESUMENES_Y_EVENTOS.sql`
7. `04_FUNCIONES_CIERRE_BACKUP_Y_CONSULTA.sql`
8. `07_FACTURACION_RESELLER_Y_COMPROBANTES_CLIENTE.sql`
9. `08_CONTROL_OPERATIVO_Y_LIMITES.sql`
10. `09_ESTRUCTURA_ORGANIZACIONAL_CENTROS_COSTO.sql`
11. `10_GEOZONAS_Y_CONTROL_DESPLAZAMIENTO.sql`
12. `11_REPORTES_COSTOS_Y_ANALITICA.sql`
13. `12_VALIDACION_COMPLETA.sql`

Opcional para copiar telemetría legacy:
- `05_MIGRACION_LOGS_EXISTENTES_A_MENSUALES.sql`
- ejecutar `SELECT * FROM public.migrar_telemetria_legacy_mensual();`

`06_VALIDACION_POST_MIGRACION.sql` se conserva como validación de la primera fase; la validación final más completa es `12_VALIDACION_COMPLETA.sql`.

## Datos demo

Después de ejecutar todas las migraciones:

`20_DATOS_DEMO_6_MESES.sql`

Crea datos sintéticos de marzo a agosto de 2026:
- 1 tenant/cliente;
- 1 cuenta Starlink;
- 3 áreas;
- 3 sedes de Nivel 3;
- 10 colaboradores;
- 10 User Terminals;
- 10 routers;
- 10 líneas;
- telemetría RAW horaria;
- resúmenes diarios/horarios;
- consumo;
- facturación Starlink al reseller;
- comprobantes manuales del cliente;
- costos granulares mensuales;
- geozonas;
- 1 equipo fuera de geozona.

La telemetría demo usa una muestra por hora para mantener un seed razonable. Producción puede ingerir la frecuencia real disponible del API.

## Regla de costos

La fuente de verdad es `costo_servicio_mes`.

NO sumar Nivel 1 + Nivel 2 + Nivel 3.

Para un mismo período:
- Nivel 1 = 100%;
- Nivel 2 = el mismo 100%;
- Nivel 3 = el mismo 100%;
- Colaboradores = el mismo 100%;
- Centros de costos = el mismo 100%.

## Tablas mensuales

Se crean dinámicamente:
- `telemetria_terminal_YYYYMM`
- `telemetria_router_YYYYMM`
- `ip_asignaciones_YYYYMM`

Para backup mensual se pueden dumpear esas tablas cerradas de forma independiente.

## Archivos para Antigravity

Usar juntos:
- `esquema_starlink_v2_actualizado.csv`
- `PROMPT_ANTIGRAVITY.md`
- todos los SQL de esta carpeta.

El CSV es plano y contiene categoría, tabla, campo, tipo, nulabilidad, PK, FK y si la tabla es mensual.
