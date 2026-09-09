ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_recuperacion VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acceso_todos_tenants BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_intento_fallido_en TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_manual BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS motivo_bloqueo VARCHAR(200);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_password BOOLEAN DEFAULT false NOT NULL;

UPDATE usuarios SET acceso_todos_tenants = true WHERE email IN ('admin.demo@starlink.local', 'admin@starlink.com', 'reseller@starlink.com');
