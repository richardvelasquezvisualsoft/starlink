# 01_ESTANDAR_MAESTRO_ARQUITECTURA_SEGURIDAD.md

**Versión:** 2.1.0  
**Estado:** Estándar Corporativo Oficial  
**Ámbito:** Nuevas soluciones SaaS Multi-Tenant y soluciones Legacy reconstruidas sobre la arquitectura objetivo  
**Audiencia:** Arquitectos de software, desarrolladores frontend/backend, DevOps/DevSecOps, DBA, QA, equipos de seguridad y asistentes/agentes de desarrollo asistido por IA.

---

# 0. PROPÓSITO, AUTORIDAD Y ALCANCE

Este documento constituye el **Estándar Maestro Corporativo de Arquitectura, Desarrollo y Seguridad** para todas las nuevas soluciones SaaS Multi-Tenant de la organización y para toda solución Legacy que sea reconstruida sobre la arquitectura objetivo.

Su objetivo es definir de forma uniforme:

- la arquitectura objetivo;
- el stack tecnológico aprobado;
- la estructura de las soluciones;
- los patrones obligatorios de desarrollo;
- las reglas de diseño de APIs;
- los estándares de persistencia en PostgreSQL;
- el aislamiento Multi-Tenant;
- los controles de autenticación y autorización;
- los mecanismos de cifrado y protección de datos;
- la gestión de secretos;
- la contenerización con Docker;
- el uso de Nginx;
- la trazabilidad, auditoría y observabilidad;
- los estándares de calidad;
- los controles DevSecOps;
- los criterios de despliegue, operación, respaldo y recuperación.

Este documento es **agnóstico al dominio funcional**. No define procesos de negocio, nombres de módulos, roles funcionales, catálogos, entidades, jerarquías organizacionales ni comportamientos propios de una solución determinada.

Toda solución deberá adaptar sus reglas de negocio al presente estándar y **no al contrario**.

Las especificaciones de diseño visual, UI y UX se mantendrán en un documento independiente.

Los procedimientos para analizar, transformar o migrar soluciones Legacy se mantendrán igualmente en documentos o prompts independientes.

---

# 0.1 NIVELES DE OBLIGATORIEDAD

Para evitar interpretaciones ambiguas se utilizarán los siguientes términos:

- **MUST / DEBE:** requisito obligatorio. Solo podrá incumplirse mediante una excepción técnica formalmente documentada y aprobada.
- **MUST NOT / NO DEBE:** prohibición obligatoria.
- **SHOULD / DEBERÍA:** práctica recomendada que podrá modificarse si existe una justificación técnica documentada.
- **MAY / PUEDE:** opción permitida cuando el contexto de la solución lo requiera.

Antigravity y cualquier otro agente de desarrollo deberán interpretar estas expresiones literalmente.

---

# 0.2 PRINCIPIOS RECTORES

Toda solución deberá construirse bajo los siguientes principios:

1. **Security by Design.**
2. **Privacy by Design.**
3. **Secure by Default.**
4. **Least Privilege.**
5. **Defense in Depth.**
6. **Zero Trust entre componentes cuando aplique.**
7. **Separation of Concerns.**
8. **API First.**
9. **Configuration over Hardcoding.**
10. **Stateless Backend siempre que sea viable.**
11. **Observability by Design.**
12. **Auditability by Design.**
13. **Data Integrity by Design.**
14. **Tenant Isolation by Design.**
15. **Fail Secure.**
16. **Automated Quality Gates.**
17. **Infrastructure/Configuration as Code.**
18. **Backward compatibility controlada y versionada.**
19. **No duplicación innecesaria de lógica.**
20. **Simplicidad arquitectónica antes que sobreingeniería.**

---

# 0.3 BASELINE DE SEGURIDAD

Las aplicaciones web y APIs deberán utilizar como baseline de verificación de seguridad **OWASP ASVS 5.x Nivel 2**.

Los módulos clasificados como críticos, de alto valor o de alta sensibilidad deberán evaluar requisitos adicionales de **OWASP ASVS Nivel 3**.

También deberán considerarse, según corresponda:

- OWASP Cheat Sheet Series;
- OWASP Multi-Tenant Security;
- OWASP Top 10;
- NIST SP 800-63 Rev. 4 para identidad y autenticación;
- estándares criptográficos aprobados por NIST o equivalentes reconocidos;
- buenas prácticas oficiales de Docker y PostgreSQL.

El cumplimiento de un framework de seguridad no reemplaza el análisis de amenazas específico de cada solución.

---

# 1. ARQUITECTURA GENERAL OBJETIVO

La arquitectura estándar será desacoplada por capas:

```text
Cliente / Browser
        │
        │ HTTPS
        ▼
┌──────────────────────────────┐
│            NGINX             │
│ TLS / Reverse Proxy / Headers│
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐   ┌───────────────┐
│  Frontend   │   │    Backend    │
│ React/Vite  │   │ FastAPI/Python│
└─────────────┘   └───────┬───────┘
                          │
                          │ TLS / Private Network
                          ▼
                  ┌─────────────────┐
                  │   PostgreSQL    │
                  │ Multi-Tenant DB │
                  └─────────────────┘
```

Servicios auxiliares como caché, colas, almacenamiento de objetos, motores de búsqueda, correo, WebSockets o workers se incorporarán únicamente cuando exista una necesidad funcional o técnica demostrable.

## 1.1 Patrón arquitectónico preferido

La opción por defecto será un **monolito modular bien estructurado**, con límites internos claros entre dominios y responsabilidades.

Los microservicios **NO DEBEN** introducirse únicamente por preferencia tecnológica.

Solo deberán utilizarse cuando exista una justificación objetiva, por ejemplo:

- escalamiento independiente;
- aislamiento operacional;
- diferentes perfiles de carga;
- fronteras de dominio claramente independientes;
- requisitos de disponibilidad distintos;
- equipos autónomos;
- ciclos de despliegue separados;
- restricciones regulatorias o de seguridad.

La creación innecesaria de microservicios se considera sobreingeniería.

---

# 2. STACK TECNOLÓGICO CORPORATIVO

Las versiones concretas deberán mantenerse en una matriz de versiones aprobadas. Las soluciones nuevas deberán utilizar versiones estables, soportadas y aprobadas por la organización.

## 2.1 Frontend

Stack estándar:

- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **React Router**
- **React Hook Form**
- **Zod**
- **Zustand**
- **Axios** o cliente HTTP corporativo equivalente

### Reglas obligatorias

- TypeScript será obligatorio.
- `strict` deberá estar habilitado.
- No se utilizará `any` salvo excepción justificada.
- Toda entrada de usuario deberá validarse.
- La validación frontend mejora UX, pero **nunca reemplaza la validación backend**.
- El frontend nunca será considerado una frontera de seguridad.
- No se almacenarán secretos en código frontend.
- No se incluirán claves privadas, credenciales de BD, API keys privadas ni secretos de backend en variables expuestas por Vite.
- Toda autorización será revalidada en backend.
- Los permisos visuales del frontend sirven únicamente para UX; no constituyen control de acceso.

## 2.2 Backend

Stack estándar:

- **Python**
- **FastAPI**
- **Uvicorn**
- **Pydantic**
- **SQLAlchemy 2.x**
- **asyncpg**
- **Alembic**
- **pytest**
- **mypy**
- **Ruff**

El backend deberá ser asíncrono cuando el flujo sea I/O bound y el driver utilizado lo permita.

No se deberá marcar una función como `async` cuando internamente ejecute operaciones bloqueantes sin control.

## 2.3 Persistencia

Motor corporativo estándar:

- **PostgreSQL**

No se incorporará otro motor relacional principal sin excepción arquitectónica documentada.

## 2.4 Infraestructura

Stack base:

- **Docker**
- **Docker Compose**
- **Nginx**
- repositorio Git;
- pipeline CI/CD;
- secret manager para ambientes productivos;
- plataforma de logs, métricas y trazas.

---

# 3. ESTRUCTURA ESTÁNDAR DE LA SOLUCIÓN

Se recomienda la siguiente estructura de repositorio:

```text
solution/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── security/
│   │   ├── middleware/
│   │   ├── integrations/
│   │   ├── utils/
│   │   └── main.py
│   ├── migrations/
│   ├── tests/
│   ├── pyproject.toml
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   ├── tests/
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile
│
├── infra/
│   ├── nginx/
│   ├── compose/
│   └── scripts/
│
├── docs/
├── .github/
│   └── workflows/
├── .env.example
├── docker-compose.yml
├── README.md
└── CHANGELOG.md
```

La estructura podrá adaptarse cuando exista justificación, pero deberá mantenerse la separación de responsabilidades.

---

# 4. MODELO BACKEND EN CAPAS

El flujo estándar será:

```text
Router/API
    │
    ▼
Service
    │
    ▼
Repository
    │
    ▼
PostgreSQL
```

## 4.1 API / Routers

Responsabilidades:

- recibir la petición;
- validar parámetros y payload;
- resolver autenticación;
- aplicar dependencias de autorización;
- resolver contexto de tenant;
- invocar servicios;
- devolver respuestas HTTP normalizadas.

Un router **NO DEBE**:

- contener SQL;
- implementar lógica de negocio compleja;
- manejar directamente credenciales;
- realizar consultas arbitrarias a la BD;
- omitir validaciones de seguridad.

## 4.2 Services

Responsabilidades:

- reglas de negocio;
- orquestación;
- transacciones de negocio;
- validaciones complejas;
- coordinación entre repositorios;
- coordinación con integraciones.

La lógica central deberá ser testeable independientemente de HTTP.

## 4.3 Repositories

Responsabilidades:

- encapsular persistencia;
- construir consultas;
- aplicar filtros obligatorios;
- utilizar SQLAlchemy o SQL parametrizado;
- manejar operaciones de lectura/escritura.

Las consultas deberán ser parametrizadas.

Está prohibida la concatenación insegura de SQL con datos provenientes del usuario.

## 4.4 Models

Los modelos SQLAlchemy representan las entidades persistentes.

No deberán exponerse directamente como respuesta API.

## 4.5 Schemas

Pydantic deberá utilizarse para:

- request;
- response;
- filtros;
- paginación;
- configuraciones;
- contratos internos cuando aporte claridad.

Deben existir schemas diferentes cuando los campos permitidos en creación, modificación y lectura no sean iguales.

---

# 5. ESTÁNDAR SaaS MULTI-TENANT

Todas las soluciones regidas por este estándar serán **SaaS Multi-Tenant**.

El aislamiento entre tenants es una frontera de seguridad crítica.

Una vulnerabilidad que permita acceder a información de otro tenant deberá considerarse una vulnerabilidad de máxima severidad de acuerdo con el impacto.

## 5.1 Principio de aislamiento

El sistema deberá impedir que:

- un usuario de un tenant consulte datos de otro tenant;
- un usuario modifique datos de otro tenant;
- un job procese datos utilizando un tenant incorrecto;
- una caché devuelva datos de otro tenant;
- una búsqueda indexada mezcle tenants;
- una exportación contenga información ajena;
- un archivo pueda accederse cruzando tenants;
- un WebSocket reciba eventos de otro tenant;
- logs o trazas expongan información privada de otro tenant;
- integraciones externas utilicen credenciales pertenecientes a otro tenant.

## 5.2 Identificador de tenant

Las entidades de negocio pertenecientes a un tenant deberán incluir un identificador de tenant cuando el modelo compartido así lo requiera.

El identificador deberá ser una FK válida hacia la entidad de tenants.

## 5.3 Resolución del tenant

El tenant activo deberá resolverse a partir de un contexto autenticado y validado.

El backend **NO DEBE confiar ciegamente** en un `tenant_id` enviado en:

- body;
- query string;
- header;
- path.

Si la interfaz permite seleccionar tenant, el backend deberá validar que el usuario autenticado tiene acceso efectivo al tenant seleccionado.

## 5.4 Contexto transaccional

En arquitecturas con esquema compartido se recomienda establecer un contexto transaccional PostgreSQL, por ejemplo:

```text
app.tenant_id
app.user_id
app.request_id
```

mediante configuración local de la transacción.

Dicho contexto puede ser utilizado por:

- RLS;
- triggers de auditoría;
- funciones de BD;
- registros de trazabilidad.

## 5.5 Row Level Security

Cuando múltiples tenants compartan tablas dentro del mismo esquema PostgreSQL, las tablas tenant-scoped **DEBERÁN utilizar Row Level Security (RLS)** salvo excepción formalmente documentada.

RLS será una capa de defensa adicional y **no reemplaza**:

- filtros correctos en repositorios;
- autorización backend;
- tests de aislamiento.

El rol de aplicación no deberá ser propietario de las tablas protegidas.

Cuando aplique se utilizará `FORCE ROW LEVEL SECURITY`.

## 5.6 Caché

Toda clave de caché de datos tenant-scoped deberá incluir namespace de tenant.

Ejemplo:

```text
tenant:{tenant_uuid}:resource:{resource_uuid}
```

Está prohibido utilizar claves globales ambiguas para datos de tenant.

## 5.7 Archivos y object storage

Los objetos deberán almacenarse usando separación lógica inequívoca por tenant.

El acceso deberá validar:

- tenant;
- usuario;
- permiso;
- recurso.

Las URLs firmadas deberán expirar.

## 5.8 Jobs y tareas asíncronas

Todo mensaje o tarea que procese información tenant-scoped deberá transportar un contexto de tenant validado.

Un worker deberá revalidar ese contexto antes de procesar información.

## 5.9 Tests de aislamiento

Toda solución deberá incluir pruebas negativas explícitas que demuestren que un usuario de Tenant A no puede:

- consultar;
- modificar;
- eliminar;
- exportar;
- descargar;
- escuchar eventos

de Tenant B.

---

# 6. ESTÁNDAR DE APIs

## 6.1 Versionado

Las APIs públicas/internas versionadas deberán utilizar:

```text
/api/v1/
```

Los breaking changes deberán introducir una nueva versión.

## 6.2 Protocolo

- HTTPS obligatorio fuera de desarrollo local controlado.
- JSON como formato estándar.
- UTF-8.
- OpenAPI como contrato documentado.

## 6.3 Semántica HTTP

Se respetará la semántica HTTP:

- `GET` consultar;
- `POST` crear o ejecutar una acción no idempotente;
- `PUT` reemplazar;
- `PATCH` modificar parcialmente;
- `DELETE` eliminar/inactivar según política funcional.

## 6.4 Códigos

Se utilizarán códigos HTTP coherentes:

- 200 OK
- 201 Created
- 202 Accepted
- 204 No Content
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Content/Entity según framework
- 429 Too Many Requests
- 500 Internal Server Error
- 503 Service Unavailable

## 6.5 Formato de error

Las APIs deberán devolver errores normalizados.

Ejemplo:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "El recurso solicitado no existe.",
    "request_id": "01J..."
  }
}
```

No se expondrán:

- stack traces;
- rutas del filesystem;
- SQL;
- secrets;
- credenciales;
- detalles internos innecesarios.

## 6.6 Paginación

Los endpoints de colección deberán soportar paginación cuando exista potencial de crecimiento.

Nunca se deberá asumir que una tabla permanecerá pequeña.

## 6.7 Filtrado y ordenamiento

Los parámetros permitidos de filtro y ordenamiento deberán controlarse mediante allowlists.

No se interpolarán nombres arbitrarios de columnas proporcionados por el cliente.

## 6.8 Idempotencia

Operaciones críticas susceptibles a reintentos, como pagos, aprovisionamientos o procesos externos, deberán implementar mecanismos de idempotencia.

---

# 7. AUTENTICACIÓN Y GESTIÓN DE SESIONES

## 7.1 Principios

La autenticación deberá:

- utilizar estándares conocidos;
- evitar mecanismos criptográficos inventados;
- soportar revocación o invalidación efectiva;
- distinguir autenticación de autorización;
- registrar eventos relevantes.

## 7.2 JWT

Cuando se utilicen JWT:

- deberán estar firmados;
- se validará algoritmo;
- se validará issuer;
- se validará audience cuando aplique;
- se validará expiración;
- se validará not-before cuando aplique;
- no se confiará en claims no validados;
- no se incluirán secretos ni información sensible innecesaria.

Para ecosistemas distribuidos se preferirán firmas asimétricas aprobadas.

HS256 podrá utilizarse en escenarios simples y controlados siempre que la gestión de la clave sea segura y esté documentada.

## 7.3 Access Tokens

Los access tokens deberán ser de corta duración.

**Valor corporativo por defecto:** 15 minutos.

Duraciones superiores deberán justificarse de acuerdo con riesgo y contexto.

## 7.4 Refresh Tokens

Cuando existan refresh tokens:

- deberán tener mayor entropía;
- deberán rotarse;
- deberán permitir revocación;
- deberán asociarse a una sesión;
- su reutilización anómala deberá detectarse cuando sea posible;
- no deberán almacenarse en `localStorage`.

En aplicaciones web se preferirá cookie `HttpOnly`, `Secure` y política `SameSite` apropiada para refresh/session tokens cuando el diseño de autenticación lo permita.

## 7.5 Logout e invalidación

El logout deberá invalidar la sesión o refresh token correspondiente.

Un cambio de contraseña, bloqueo del usuario o evento de seguridad deberá permitir invalidar sesiones activas de acuerdo con la política de la aplicación.

## 7.6 MFA

La plataforma deberá estar preparada para MFA.

MFA deberá ser obligatorio para:

- administradores de plataforma;
- operaciones privilegiadas cuando el riesgo lo justifique;
- accesos considerados de alta sensibilidad.

Los factores soportados deberán preferir mecanismos resistentes a phishing cuando sea viable.

## 7.7 Federación

SSO mediante OIDC/OAuth 2.x podrá integrarse con proveedores corporativos.

No se codificará el sistema para depender exclusivamente de un proveedor particular salvo necesidad funcional.

---

# 8. CONTRASEÑAS

Las contraseñas de usuarios **NUNCA se cifrarán de forma reversible**.

Se almacenarán mediante hashing de contraseña.

## 8.1 Algoritmo

Algoritmo corporativo preferido:

**Argon2id**

Los parámetros se mantendrán alineados con recomendaciones actuales de seguridad y capacidad de infraestructura.

## 8.2 Compatibilidad

Bcrypt podrá soportarse únicamente como mecanismo transitorio para hashes existentes.

Después de una autenticación exitosa se deberá utilizar `needs_rehash` o mecanismo equivalente para migrar progresivamente hacia Argon2id.

## 8.3 Prohibiciones

No utilizar:

- MD5;
- SHA-1;
- SHA-256 directo;
- SHA-512 directo;
- cifrado reversible;
- contraseñas en texto plano.

---

# 9. AUTORIZACIÓN

## 9.1 Deny by default

Todo endpoint protegido deberá aplicar **deny by default**.

Una ruta no deberá quedar accesible porque un desarrollador olvidó declarar un permiso.

## 9.2 RBAC

RBAC será el mecanismo base para permisos funcionales.

Los roles y permisos deberán ser configurables.

Los nombres de roles no forman parte de este estándar.

## 9.3 ABAC / Scoping

Cuando la autorización dependa de atributos del usuario, tenant, recurso, organización o contexto, podrá utilizarse ABAC o Data Scoping complementario.

## 9.4 Validación por recurso

Tener permiso para un módulo no implica automáticamente tener permiso para cualquier registro.

Se deberá validar:

1. identidad;
2. tenant;
3. permiso funcional;
4. acceso al recurso;
5. estado del recurso;
6. reglas adicionales de negocio.

## 9.5 Operaciones privilegiadas

Las operaciones administrativas críticas deberán:

- requerir permisos explícitos;
- quedar auditadas;
- permitir reautenticación o MFA cuando el riesgo lo requiera.

---

# 10. POSTGRESQL: ESTÁNDAR DE DATOS

## 10.1 Convenciones

- nombres en `snake_case`;
- nombres descriptivos;
- evitar abreviaturas ambiguas;
- encoding UTF-8;
- timestamps operativos en UTC;
- zona horaria presentada al usuario en capa de aplicación.

## 10.2 Claves primarias

Toda tabla persistente deberá tener PK.

Para entidades expuestas fuera del backend se recomienda un UUID público además de una PK numérica interna cuando sea útil.

Las decisiones deberán ser consistentes dentro de la solución.

## 10.3 Tipos

Utilizar tipos nativos adecuados:

- `bigint` / `integer`;
- `uuid`;
- `boolean`;
- `text` / `varchar`;
- `numeric(p,s)` para valores que requieran precisión decimal;
- `date`;
- `timestamptz`;
- `jsonb` solo cuando exista información realmente semiestructurada.

No almacenar fechas, números o booleanos como texto sin justificación.

## 10.4 Integridad

La base de datos deberá proteger integridad mediante:

- `PRIMARY KEY`;
- `FOREIGN KEY`;
- `NOT NULL`;
- `UNIQUE`;
- `CHECK`;
- `DEFAULT` cuando corresponda.

La integridad no deberá depender únicamente del frontend o backend.

## 10.5 Foreign Keys

Toda relación lógica fuerte deberá considerar una FK real.

Las acciones `ON DELETE` y `ON UPDATE` deberán seleccionarse conscientemente.

No se utilizará `CASCADE` indiscriminadamente.

## 10.6 Índices

Los índices deberán definirse según:

- patrones reales de consulta;
- FK;
- filtros frecuentes;
- ordenamientos;
- joins;
- unicidad;
- RLS y tenant filtering.

Los índices innecesarios también tienen costo y deberán evitarse.

## 10.7 JSONB

`jsonb` no deberá utilizarse para evitar diseñar un modelo relacional.

Se utilizará cuando:

- la estructura sea variable;
- no se requiera integridad relacional tradicional;
- existan beneficios concretos.

## 10.8 Tiempo

Los instantes operativos deberán utilizar `timestamptz`.

El backend deberá trabajar con fechas timezone-aware.

Las zonas horarias del tenant/usuario se aplicarán para visualización y reglas funcionales que realmente dependan de zona local.

## 10.9 Transacciones

Las operaciones que deban ejecutarse atómicamente deberán compartir una transacción.

No se harán commits parciales dentro de una única operación de negocio salvo diseño explícito.

## 10.10 SQL dinámico

Todo SQL deberá ser parametrizado.

Los identificadores dinámicos deberán resolverse contra allowlists.

---

# 11. USUARIOS Y PERMISOS POSTGRESQL

Se deberán separar responsabilidades.

Roles conceptuales mínimos:

```text
db_owner / db_migration
db_app
db_readonly
db_monitoring_backup
```

## 11.1 Owner / Migration

Responsable de:

- DDL;
- Alembic;
- creación/alteración de objetos.

No será utilizado por la aplicación durante operación normal.

## 11.2 Application

La aplicación utilizará un usuario sin privilegios de propietario.

Solo deberá recibir:

- CONNECT;
- USAGE necesario;
- SELECT/INSERT/UPDATE/DELETE requeridos;
- EXECUTE específico cuando aplique.

## 11.3 Read-only

Para reportes o procesos autorizados de solo lectura.

## 11.4 Monitoring / Backup

Recibirá exclusivamente los privilegios necesarios para su función.

## 11.5 Prohibiciones

La aplicación **NO DEBE** conectarse como:

- `postgres`;
- superuser;
- propietario de la BD;
- propietario del esquema de negocio.

---

# 12. MIGRACIONES DE ESQUEMA

Toda modificación estructural deberá gestionarse mediante **Alembic**.

Está prohibido modificar manualmente producción como práctica normal.

## 12.1 Requisitos

Cada migración deberá:

- tener upgrade;
- considerar downgrade o estrategia de reversión;
- ser reproducible;
- ser revisable;
- poder ejecutarse automáticamente;
- evaluar locks e impacto en producción;
- evitar pérdida silenciosa de datos.

## 12.2 Expand / Contract

Cambios incompatibles deberán usar estrategias compatibles con despliegues progresivos cuando corresponda:

1. expandir;
2. desplegar código compatible;
3. migrar datos;
4. retirar compatibilidad antigua.

---

# 13. CIFRADO Y PROTECCIÓN DE DATOS

Debe distinguirse claramente:

## 13.1 Hashing

Uso:

- contraseñas.

Estándar:

- Argon2id.

## 13.2 Cifrado en tránsito

Obligatorio:

- HTTPS/TLS para clientes;
- TLS para conexiones sensibles entre servicios;
- TLS para PostgreSQL cuando la conexión atraviese una red no estrictamente local/aislada o cuando la política de infraestructura lo establezca.

Se deberá preferir TLS 1.3 y mantener TLS 1.2 únicamente cuando sea necesario por compatibilidad.

Protocolos criptográficos obsoletos deberán deshabilitarse.

## 13.3 Cifrado en reposo

El almacenamiento productivo deberá utilizar cifrado de volumen/disco provisto por la infraestructura.

Datos de alta sensibilidad podrán requerir cifrado adicional a nivel de campo.

## 13.4 Cifrado a nivel de campo

Para información que requiera reversibilidad segura se utilizará cifrado autenticado (AEAD).

Algoritmo preferido:

- AES-256-GCM;

o alternativa aprobada por la organización y librerías criptográficas mantenidas.

Está prohibido desarrollar algoritmos criptográficos propios.

## 13.5 Gestión de nonce/IV

Los nonce/IV deberán generarse correctamente según el algoritmo.

No se reutilizarán nonces con la misma clave en algoritmos donde ello comprometa la seguridad.

## 13.6 Rotación

El diseño deberá permitir:

- versionar claves;
- rotar claves;
- identificar qué clave protegió un dato;
- re-encriptar datos gradualmente cuando sea necesario.

---

# 14. GESTIÓN DE SECRETOS

Secretos incluyen:

- passwords de BD;
- claves JWT;
- certificados privados;
- API keys;
- tokens de proveedores;
- credenciales SMTP;
- credenciales de almacenamiento;
- claves criptográficas.

## 14.1 Producción

Producción deberá utilizar un gestor de secretos, por ejemplo:

- Azure Key Vault;
- HashiCorp Vault;
- AWS Secrets Manager/KMS;
- GCP Secret Manager/KMS;
- equivalente aprobado.

## 14.2 Desarrollo local

`.env` podrá utilizarse exclusivamente para desarrollo local, con valores no productivos.

El repositorio deberá contener únicamente:

```text
.env.example
```

sin credenciales reales.

## 14.3 Prohibiciones

Los secretos NO DEBEN almacenarse en:

- Git;
- código fuente;
- frontend;
- Dockerfile;
- imágenes Docker;
- archivos de documentación;
- logs;
- tickets o capturas sin protección.

## 14.4 Rotación y alcance

Cada secreto deberá:

- tener el menor alcance posible;
- tener propietario;
- poder rotarse;
- preferiblemente tener fecha de expiración;
- ser distinto por ambiente.

---

# 15. DOCKER: ESTÁNDAR DE CONTENERIZACIÓN

Toda solución deberá ser reproducible mediante contenedores.

## 15.1 Dockerfiles

Los Dockerfiles deberán:

- utilizar imágenes oficiales o aprobadas;
- fijar versiones adecuadamente;
- utilizar multi-stage builds;
- minimizar paquetes;
- evitar herramientas de compilación en runtime;
- incorporar `.dockerignore`;
- ejecutar la aplicación con usuario no-root;
- no contener secretos.

## 15.2 Usuario no-root

Los contenedores de aplicación **DEBEN ejecutarse como usuario no-root** salvo excepción técnica inevitable.

## 15.3 Privilegios

Evitar:

- `privileged: true`;
- capacidades Linux innecesarias;
- montaje del socket Docker;
- acceso innecesario al host.

Se deberán eliminar capabilities no requeridas cuando sea viable.

## 15.4 Read-only filesystem

El filesystem runtime deberá configurarse como read-only cuando la aplicación lo permita.

Las rutas que necesiten escritura deberán ser explícitas.

## 15.5 Healthchecks

Servicios relevantes deberán exponer healthchecks reales.

El healthcheck no deberá devolver `healthy` únicamente porque el proceso exista.

## 15.6 Recursos

Producción deberá definir límites/reservas de CPU y memoria de acuerdo con la plataforma de despliegue.

## 15.7 Persistencia

Los datos persistentes no deberán residir exclusivamente en la capa efímera del contenedor.

## 15.8 Red

PostgreSQL no deberá exponerse públicamente.

Solo los servicios que requieran comunicación deberán compartir red.

La existencia de una red común no autoriza automáticamente la comunicación entre cualquier componente.

## 15.9 Imágenes

El pipeline deberá analizar vulnerabilidades de imágenes.

No se desplegarán imágenes con vulnerabilidades críticas explotables sin excepción formal.

---

# 16. DOCKER COMPOSE

Docker Compose será el mecanismo estándar para desarrollo y despliegues basados en Compose.

Se recomienda separar:

- configuración común;
- development;
- staging;
- production

cuando la complejidad lo justifique.

El Compose deberá contemplar:

- redes;
- healthchecks;
- dependencias por condición real cuando aplique;
- restart policies;
- volúmenes;
- secrets/configuration;
- límites;
- logging.

Las contraseñas productivas no deberán persistirse dentro del `docker-compose.yml`.

---

# 17. NGINX

Nginx actuará como reverse proxy/servidor de frontend cuando la arquitectura lo requiera.

## 17.1 Responsabilidades

- terminación TLS;
- servir frontend estático;
- proxy `/api`;
- headers de seguridad;
- límites de tamaño;
- timeouts;
- compresión cuando corresponda;
- rate limiting cuando corresponda;
- forwarding correcto de IP y request ID.

## 17.2 Headers

Deberán evaluarse y configurarse de acuerdo con el frontend:

- HSTS;
- Content-Security-Policy;
- X-Content-Type-Options;
- Referrer-Policy;
- Permissions-Policy;
- protección de framing mediante CSP `frame-ancestors`.

No se agregarán headers obsoletos por simple checklist.

## 17.3 TLS

Producción deberá utilizar certificados válidos y renovación controlada.

Las claves privadas no deberán incorporarse a imágenes Docker.

---

# 18. SEGURIDAD WEB

## 18.1 CORS

Producción utilizará allowlist explícita de orígenes.

No utilizar:

```text
Access-Control-Allow-Origin: *
```

junto con credenciales.

## 18.2 CSRF

Si la autenticación se apoya en cookies, deberán implementarse controles CSRF apropiados según arquitectura.

## 18.3 XSS

- React escaping no reemplaza políticas de seguridad.
- Evitar `dangerouslySetInnerHTML`.
- Si es indispensable, el contenido deberá sanitizarse con mecanismo aprobado.
- Implementar CSP compatible.

## 18.4 SSRF

Toda funcionalidad que realice requests hacia URLs controlables por usuario deberá:

- validar esquema;
- resolver allowlists cuando sea posible;
- bloquear destinos internos/metadatos;
- controlar redirects;
- aplicar timeouts.

## 18.5 Uploads

Toda carga de archivos deberá controlar:

- tamaño;
- extensión;
- MIME real;
- nombre;
- almacenamiento;
- acceso;
- malware cuando el riesgo lo requiera.

Nunca ejecutar archivos cargados por usuarios.

---

# 19. RATE LIMITING Y PROTECCIÓN CONTRA ABUSO

Se deberá aplicar rate limiting especialmente en:

- login;
- recuperación de contraseña;
- MFA;
- registro;
- envío de correo/SMS;
- exportaciones costosas;
- endpoints públicos;
- APIs de terceros;
- búsquedas intensivas.

La política podrá considerar:

- IP;
- usuario;
- tenant;
- endpoint;
- API key.

Los límites deberán evitar que un tenant degrade el servicio de otros tenants.

---

# 20. AUDITORÍA

La auditoría funcional/seguridad será independiente del logging técnico.

## 20.1 Eventos

Deberán auditarse según riesgo:

- login exitoso/fallido;
- logout;
- cambios de credenciales;
- cambios de MFA;
- cambios de permisos;
- cambios administrativos;
- operaciones CRUD relevantes;
- exportaciones;
- cambios de configuración;
- acceso a información sensible cuando corresponda.

## 20.2 Campos mínimos

Cuando aplique:

```text
timestamp
tenant_id
user_id
session_id
action
resource
resource_id
result
source_ip
user_agent
request_id
trace_id
```

Para modificaciones relevantes podrá registrarse:

- valor anterior;
- valor posterior;

aplicando minimización y ocultamiento de información sensible.

## 20.3 Datos prohibidos

No registrar:

- contraseñas;
- refresh tokens;
- access tokens completos;
- claves privadas;
- secrets;
- API keys completas.

## 20.4 Integridad

Los registros de auditoría deberán protegerse contra alteración no autorizada.

El usuario operativo común no deberá tener permisos para eliminar o alterar su propio historial de auditoría.

---

# 21. LOGGING, TRAZABILIDAD Y OBSERVABILIDAD

## 21.1 Logs estructurados

Producción utilizará logs estructurados en JSON.

Cada registro deberá incluir contexto útil como:

- timestamp;
- level;
- service;
- environment;
- request_id;
- trace_id;
- tenant_id cuando sea seguro;
- event;
- duration;
- status.

## 21.2 Request ID

Cada request deberá poseer un identificador correlativo.

Si llega un `X-Request-ID`, se validará su formato o se generará uno nuevo según política.

El mismo ID deberá propagarse a servicios internos.

## 21.3 OpenTelemetry

Se recomienda OpenTelemetry como estándar vendor-neutral para correlacionar:

- traces;
- metrics;
- logs.

## 21.4 Health endpoints

Backend deberá proporcionar, según despliegue:

```text
/health/live
/health/ready
```

Liveness: determina si el proceso debe reiniciarse.

Readiness: determina si puede recibir tráfico.

Los health endpoints no deberán exponer secretos ni detalles internos innecesarios.

---

# 22. MANEJO DE ERRORES

El backend deberá centralizar el manejo de excepciones.

## 22.1 Producción

Nunca devolver:

- stack trace;
- SQL;
- credenciales;
- rutas internas;
- variables de entorno;
- información de infraestructura.

## 22.2 Logs

El detalle técnico podrá registrarse internamente con `request_id`.

Los errores esperados deberán ser diferenciables de errores internos.

---

# 23. INTEGRACIONES EXTERNAS

Toda integración deberá encapsularse en `integrations/` o equivalente.

## 23.1 Requisitos

- timeouts obligatorios;
- retries controlados;
- backoff;
- circuit breaker cuando la criticidad lo justifique;
- validación de certificados TLS;
- secrets fuera del código;
- logs sin datos sensibles;
- manejo de errores normalizado.

## 23.2 Multi-Tenant

Si cada tenant posee credenciales propias:

- deberán almacenarse cifradas;
- recuperarse según tenant validado;
- nunca reutilizarse entre tenants;
- registrarse uso/auditoría cuando corresponda.

---

# 24. CONFIGURACIÓN

La configuración deberá seguir jerarquía controlada:

1. valores seguros por defecto;
2. configuración del ambiente;
3. secret manager;
4. configuración tenant cuando sea funcionalmente válida.

No se permitirá hardcoding de:

- hosts;
- passwords;
- tokens;
- tenant IDs;
- URLs ambientales;
- correos internos;
- rutas de producción.

---

# 25. AMBIENTES

Ambientes mínimos:

```text
development
testing
staging
production
```

Cada ambiente deberá contar con:

- configuración propia;
- credenciales propias;
- secretos propios;
- BD propia;
- recursos aislados de acuerdo con el nivel requerido.

Producción no compartirá credenciales con desarrollo.

Los datos productivos no deberán copiarse libremente a ambientes inferiores.

Cuando sea necesario utilizar datos reales, deberán aplicarse mecanismos de anonimización/mascaramiento y autorización.

---

# 26. DEVSECOPS Y CI/CD

Todo cambio deberá pasar por pipeline automatizado.

Flujo recomendado:

```text
Commit / Pull Request
        │
        ▼
Lint
        │
        ▼
Type Checking
        │
        ▼
Unit Tests
        │
        ▼
Integration Tests
        │
        ▼
SAST
        │
        ▼
Dependency / SCA Scan
        │
        ▼
Secret Scan
        │
        ▼
Build
        │
        ▼
Container Scan
        │
        ▼
Deploy Staging
        │
        ▼
Smoke / E2E
        │
        ▼
Approval / Production
```

## 26.1 Security Gates

No se permitirá promover automáticamente a producción un artefacto con:

- secretos detectados;
- pruebas críticas fallidas;
- vulnerabilidades críticas explotables;
- migraciones inválidas;
- ruptura de aislamiento tenant;
- errores de type checking obligatorios.

## 26.2 Dependencias

Las dependencias deberán:

- estar mantenidas;
- fijarse mediante lockfile;
- tener licencia compatible;
- analizarse por vulnerabilidades;
- actualizarse periódicamente.

La incorporación de una dependencia deberá justificarse cuando exista una alternativa estándar ya incluida.

## 26.3 SBOM

Los releases productivos deberían generar un Software Bill of Materials cuando la plataforma CI/CD lo permita.

---

# 27. PRUEBAS

## 27.1 Backend

Deberán existir:

- unit tests;
- integration tests;
- repository/database tests;
- authorization tests;
- tenant isolation tests;
- API tests.

## 27.2 Frontend

Deberán existir pruebas para:

- componentes críticos;
- formularios;
- flujos;
- permisos visuales;
- errores.

## 27.3 E2E

Las rutas críticas de negocio deberán contar con pruebas E2E automatizadas cuando sea viable.

## 27.4 Seguridad

Deberán existir pruebas negativas:

- acceso sin token;
- token expirado;
- permiso insuficiente;
- tenant incorrecto;
- manipulación de identificadores;
- payload inválido;
- operación sobre recurso ajeno.

## 27.5 Cobertura

La cobertura no será el único indicador de calidad.

Como objetivo:

- código de dominio y seguridad: cobertura alta;
- nuevas funcionalidades críticas: pruebas obligatorias;
- ninguna ruta crítica deberá quedar sin pruebas significativas.

---

# 28. CALIDAD DE CÓDIGO

## 28.1 Python

Obligatorio:

- tipado;
- `mypy`;
- `Ruff`;
- formato consistente;
- docstrings donde agreguen valor;
- funciones pequeñas y cohesionadas;
- manejo explícito de excepciones.

## 28.2 TypeScript

Obligatorio:

- modo strict;
- lint;
- formato uniforme;
- evitar `any`;
- contratos tipados;
- validación de datos externos.

## 28.3 Prohibiciones

Evitar:

- archivos monolíticos;
- funciones excesivamente largas;
- lógica duplicada;
- constantes mágicas;
- imports circulares;
- SQL mezclado con routers;
- autorización dispersa sin patrón;
- excepciones silenciosas.

---

# 29. BACKUPS, CONTINUIDAD Y RECUPERACIÓN

PostgreSQL productivo deberá contar con estrategia formal de backup.

## 29.1 Requisitos

- backups automáticos;
- retención definida;
- cifrado;
- control de acceso;
- verificación;
- restauraciones de prueba.

Cuando la criticidad lo requiera deberá habilitarse PITR.

## 29.2 RPO / RTO

Cada solución deberá definir:

- RPO;
- RTO;

de acuerdo con su criticidad.

No se considerará suficiente afirmar que existe un backup. Deberá comprobarse periódicamente que puede restaurarse.

---

# 30. DISPONIBILIDAD Y RESILIENCIA

La aplicación deberá manejar adecuadamente:

- timeouts;
- fallos de integraciones;
- reintentos;
- degradación controlada;
- indisponibilidad temporal de servicios.

Los reintentos deberán evitar tormentas de tráfico.

Las operaciones no idempotentes no deberán reintentarse ciegamente.

---

# 31. PERFORMANCE

La optimización deberá basarse en medición.

Se deberán evaluar:

- latencia API;
- queries lentas;
- índices;
- tamaño de payload;
- N+1 queries;
- conexiones;
- memoria;
- CPU;
- tiempo de respuesta de terceros.

La configuración del pool SQLAlchemy **no deberá fijarse universalmente** a un único valor.

Parámetros como:

```text
pool_size
max_overflow
pool_timeout
pool_recycle
```

deberán ajustarse según:

- capacidad PostgreSQL;
- número de réplicas backend;
- concurrencia;
- infraestructura;
- patrón de carga.

---

# 32. SEGURIDAD DE DATOS Y PRIVACIDAD

Las soluciones deberán clasificar información al menos en categorías equivalentes a:

- pública;
- interna;
- confidencial;
- restringida/sensible.

Los controles de:

- cifrado;
- acceso;
- auditoría;
- retención;
- exportación;
- backup;
- eliminación

deberán depender de la clasificación.

Se aplicará minimización de datos: no almacenar información que la solución no necesite.

---

# 33. RETENCIÓN Y ELIMINACIÓN

Cada categoría de información deberá contar con política de retención.

La eliminación física de información sensible deberá realizarse conforme a:

- requisitos legales;
- obligaciones contractuales;
- auditoría;
- dependencias funcionales;
- backups.

El borrado lógico no sustituye políticas de privacidad ni retención.

---

# 34. SEGURIDAD DE ADMINISTRACIÓN

Las capacidades administrativas deberán separarse claramente de las funciones normales.

Se recomienda:

- MFA;
- sesiones de menor duración;
- auditoría reforzada;
- permisos explícitos;
- reautenticación para acciones críticas;
- protección contra escalamiento horizontal y vertical de privilegios.

---

# 35. DOCUMENTACIÓN TÉCNICA MÍNIMA

Toda solución deberá contener:

- README;
- arquitectura;
- instrucciones de desarrollo;
- variables de entorno documentadas;
- procedimiento de despliegue;
- procedimiento de rollback;
- modelo de datos;
- API/OpenAPI;
- estrategia de autenticación;
- modelo de autorización;
- modelo Multi-Tenant;
- procedimientos de backup/restore;
- inventario de integraciones;
- runbook de operación;
- CHANGELOG.

La documentación no deberá contener secretos reales.

---

# 36. DEFINITION OF DONE

Una funcionalidad no estará terminada únicamente porque “funciona”.

Para considerarse terminada deberá:

- cumplir arquitectura;
- aplicar tenant isolation;
- validar permisos;
- validar inputs;
- tener manejo de errores;
- tener pruebas;
- pasar lint/type checking;
- no introducir secretos;
- no introducir vulnerabilidades críticas conocidas;
- incluir migración Alembic si modifica BD;
- incluir observabilidad adecuada;
- actualizar documentación cuando corresponda;
- cumplir el estándar UI/UX cuando tenga interfaz.

---

# 37. REGLAS PARA AGENTES DE DESARROLLO ASISTIDO POR IA

Todo agente, incluido Antigravity, deberá:

1. tratar este documento como autoridad técnica;
2. no sustituir el stack corporativo por preferencias propias;
3. no introducir frameworks alternativos sin necesidad;
4. no debilitar controles de seguridad para simplificar código;
5. no hardcodear secretos;
6. no omitir tenant isolation;
7. no introducir dependencias innecesarias;
8. no asumir permisos;
9. no crear endpoints sin autenticación salvo que sean explícitamente públicos;
10. no realizar cambios manuales de esquema fuera de Alembic;
11. no ejecutar la aplicación con usuario PostgreSQL propietario;
12. no usar root dentro de contenedores de aplicación;
13. no registrar datos sensibles;
14. no ignorar errores de SAST/SCA/tests sin documentar la excepción;
15. respetar el estándar UI/UX independiente.

Si el agente detecta que una solicitud contradice este documento, deberá:

- identificar la contradicción;
- explicar el riesgo;
- proponer una alternativa compatible.

---

# 38. EXCLUSIONES EXPLÍCITAS DE ESTE DOCUMENTO

Este estándar **NO DEBE contener** instrucciones específicas para:

- analizar código Legacy;
- identificar tecnología Legacy;
- convertir PHP;
- convertir Java;
- convertir .NET;
- analizar MySQL;
- analizar SQL Server;
- analizar Oracle;
- migrar tablas Legacy;
- extraer datos maestros de una solución antigua;
- generar scripts de transformación Legacy;
- descubrir usuarios/contraseñas Legacy;
- definir etapas de migración Legacy.

Esas actividades deberán documentarse en un **protocolo o prompt de migración independiente**, el cual utilizará este documento únicamente como definición de la **arquitectura destino obligatoria**.

---

# 39. RELACIÓN CON OTROS ESTÁNDARES

La documentación corporativa deberá separarse como mínimo en:

```text
01_ESTANDAR_MAESTRO_ARQUITECTURA_SEGURIDAD.md
02_ESTANDAR_MAESTRO_DISENO_UX_UI.md
```

Los protocolos específicos de modernización, migración, aprovisionamiento, operación u otros procesos se mantendrán en documentos adicionales.

En caso de conflicto, las decisiones deberán resolverse formalmente considerando, en este orden:

1. seguridad y protección de datos;
2. este estándar maestro de arquitectura;
3. estándares especializados;
4. implementación particular.

---

# 40. CHECKLIST DE CUMPLIMIENTO

## Arquitectura

- [ ] React + TypeScript + Vite.
- [ ] FastAPI/Python.
- [ ] Arquitectura Router → Service → Repository → DB.
- [ ] PostgreSQL como persistencia relacional principal.
- [ ] Docker/Docker Compose.
- [ ] Nginx.
- [ ] Configuración externa.
- [ ] Sin lógica de negocio en routers.
- [ ] Sin SQL en routers.

## Multi-Tenant

- [ ] Tenant validado desde contexto autenticado.
- [ ] FK de tenant donde corresponde.
- [ ] Filtros tenant-scoped en repositories.
- [ ] RLS en tablas compartidas tenant-scoped.
- [ ] Rol app no propietario.
- [ ] Caché namespaced por tenant.
- [ ] Archivos aislados por tenant.
- [ ] Jobs transportan contexto tenant.
- [ ] Tests A→B negativos aprobados.

## Autenticación

- [ ] Access token corto.
- [ ] Refresh rotation cuando aplique.
- [ ] Revocación.
- [ ] Argon2id.
- [ ] MFA para roles privilegiados.
- [ ] No refresh tokens en localStorage.

## Autorización

- [ ] Deny by default.
- [ ] RBAC.
- [ ] Scope/recurso validado.
- [ ] Tenant validado.
- [ ] Operaciones críticas auditadas.

## PostgreSQL

- [ ] PK.
- [ ] FK.
- [ ] NOT NULL.
- [ ] UNIQUE/CHECK cuando corresponde.
- [ ] Tipos nativos correctos.
- [ ] `timestamptz`.
- [ ] Índices evaluados.
- [ ] Alembic.
- [ ] Usuario de aplicación con mínimo privilegio.
- [ ] Sin conexión como `postgres`.

## Cifrado / secretos

- [ ] TLS.
- [ ] Cifrado de almacenamiento.
- [ ] AEAD para campos sensibles reversibles.
- [ ] Secret manager productivo.
- [ ] `.env.example` sin secretos.
- [ ] Secret scanning.
- [ ] Rotación de secretos/claves.

## Docker

- [ ] Multi-stage.
- [ ] Non-root.
- [ ] `.dockerignore`.
- [ ] Healthchecks.
- [ ] Sin secrets en imagen.
- [ ] Sin privileged.
- [ ] Capacidades mínimas.
- [ ] PostgreSQL no público.
- [ ] Container scanning.

## API

- [ ] `/api/v1`.
- [ ] OpenAPI.
- [ ] Validación Pydantic.
- [ ] Errores normalizados.
- [ ] Paginación.
- [ ] Rate limiting según riesgo.
- [ ] Idempotencia donde corresponde.
- [ ] Sin stack traces.

## Observabilidad

- [ ] JSON logging.
- [ ] request_id.
- [ ] trace_id donde aplique.
- [ ] métricas.
- [ ] liveness.
- [ ] readiness.
- [ ] auditoría separada de logs técnicos.

## DevSecOps

- [ ] Lint.
- [ ] Type checking.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Tenant isolation tests.
- [ ] SAST.
- [ ] SCA/dependency scan.
- [ ] Secret scan.
- [ ] Container scan.
- [ ] Security gates.

## Operación

- [ ] Backup automatizado.
- [ ] Restore probado.
- [ ] RPO/RTO definidos.
- [ ] Runbook.
- [ ] Rollback.
- [ ] Ambientes segregados.

---

# 41. REFERENCIAS NORMATIVAS Y TÉCNICAS

Este estándar se inspira y deberá mantenerse alineado con la evolución de:

- OWASP Application Security Verification Standard (ASVS) 5.x.
- OWASP Cheat Sheet Series.
- OWASP Multi-Tenant Security Cheat Sheet.
- OWASP Top 10.
- NIST SP 800-63 Rev. 4.
- NIST AES / SP 800-38D y estándares criptográficos aplicables.
- PostgreSQL Official Documentation.
- Docker Official Documentation.
- OpenTelemetry Specification y documentación oficial.
- documentación oficial de React, FastAPI, SQLAlchemy, Alembic, Pydantic, Vite y Nginx.

Las referencias no sustituyen este estándar. Si una recomendación externa cambia y contradice una regla de seguridad aquí definida, la organización deberá revisar formalmente el estándar antes de modificar implementaciones productivas.

---

# 41.1 RELACIÓN CON EL PROCESO DE MIGRACIÓN LEGACY

Este archivo es un **estándar estable**, no un prompt de ejecución.

Durante una migración Legacy, el prompt de migración deberá leer este documento antes de construir la nueva solución y usarlo como autoridad para validar arquitectura, seguridad, persistencia, Docker, autenticación, autorización, Multi-Tenant, observabilidad y calidad.

La migración no podrá considerarse completa si una funcionalidad conserva una arquitectura incompatible con este estándar únicamente porque así funcionaba en el Legacy.

La fuente de funcionalidad será el Legacy; la arquitectura destino será la aquí definida.

---

# 42. PRINCIPIO FINAL

La arquitectura de cada solución podrá evolucionar, pero nunca deberá hacerlo de forma que reduzca silenciosamente:

- aislamiento Multi-Tenant;
- integridad de datos;
- trazabilidad;
- seguridad;
- mantenibilidad;
- capacidad de despliegue;
- observabilidad;
- recuperación;
- capacidad de auditoría.

Toda excepción deberá ser explícita, justificable, documentada y revisable.
