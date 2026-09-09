INSERT INTO roles_portal (codigo, descripcion) VALUES ('RESELLER', 'Reseller') ON CONFLICT DO NOTHING;
INSERT INTO roles_portal (codigo, descripcion) VALUES ('ADMIN', 'Admin') ON CONFLICT DO NOTHING;

INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles_portal r WHERE u.email = 'reseller@starlink.com' AND r.codigo = 'RESELLER' ON CONFLICT DO NOTHING;

INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles_portal r WHERE u.email = 'admin@starlink.com' AND r.codigo = 'ADMIN' ON CONFLICT DO NOTHING;

INSERT INTO usuario_roles (usuario_id, rol_id)
SELECT u.id, r.id FROM usuarios u, roles_portal r WHERE u.email = 'admin.demo@starlink.local' AND r.codigo = 'RESELLER' ON CONFLICT DO NOTHING;
