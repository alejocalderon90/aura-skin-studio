-- SQL Seed data for Aura Skin Studio (Supabase)
-- Provides mock data for services, professionals, clients, appointments, payments and settings.

-- Clean existing data (optional but good for seed consistency)
TRUNCATE TABLE payments, appointments, clients, professionals, services, business_settings, agent_logs CASCADE;

-- 1. Insert Services
-- UUIDs prefix: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a1X
INSERT INTO services (id, name, description, duration_minutes, price, category, active, featured, sort_order) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Limpieza facial profunda', 'Renovación celular, extracción de impurezas e hidratación intensiva.', 60, 12500, 'Facial', true, true, 1),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Peeling químico', 'Tratamiento despigmentante para unificar el tono y aportar luminosidad.', 45, 18000, 'Facial', true, true, 2),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Dermaplaning', 'Exfoliación física que remueve células muertas y vello facial fino.', 40, 15000, 'Facial', true, false, 3),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Radiofrecuencia facial', 'Estimula la producción de colágeno y elastina, efecto lifting.', 50, 22000, 'Facial', true, false, 4),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Mesoterapia', 'Microinyecciones de vitaminas y ácido hialurónico para hidratar.', 55, 24000, 'Dermatológico', true, true, 5),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'Tratamiento antiacné', 'Protocolo específico para pieles con tendencia acneica y comedones.', 50, 16000, 'Dermatológico', true, false, 6);

-- 2. Insert Professionals
-- UUIDs prefix: b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a2X
INSERT INTO professionals (id, full_name, specialty, active) VALUES
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'Camila Fernández', 'Cosmiatra y Esteticista Corporal', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Valentina Gómez', 'Dermatóloga Especialista en Estética', true),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'Florencia Medina', 'Kinesióloga Dermato-Funcional', true);

-- 3. Insert Clients
-- UUIDs prefix: c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a3X
INSERT INTO clients (id, full_name, phone, email, status, notes, last_treatment, visit_count) VALUES
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Martina López', '+54 9 11 1234-5678', 'martina@example.com', 'Activo', 'Piel con tendencia grasa, sensible al peeling.', 'Limpieza facial profunda', 4),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Sofía Ruiz', '+54 9 11 2345-6789', 'sofia@example.com', 'Activo', 'Alergia leve a fragancias artificiales.', 'Radiofrecuencia facial', 12),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Julieta Acosta', '+54 9 11 3456-7890', 'julieta@example.com', 'Inactivo', 'Realiza tratamiento preventivo.', 'Mesoterapia', 1),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'Lucía Torres', '+54 9 11 4567-8901', 'lucia@example.com', 'Nuevo', 'Primera consulta de dermocosmiatría.', 'Ninguno', 0),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'Carolina Herrera', '+54 9 11 5678-9012', 'carolina@example.com', 'Activo', 'Piel seca, requiere hidratación profunda.', 'Radiofrecuencia facial', 2);

-- 4. Insert Appointments
-- UUIDs prefix: d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a4X
-- Dates: We'll schedule around the current date range (2026-06-08) and nearby dates.
INSERT INTO appointments (id, service_id, professional_id, client_id, appointment_date, appointment_time, duration_minutes, price, status, customer_name, customer_phone, customer_email, notes) VALUES
-- Past / Finished Turn
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', '2026-06-05', '11:30:00', 40, 15000, 'Finalizado', 'Sofía Ruiz', '+54 9 11 2345-6789', 'sofia@example.com', 'Salió muy conforme, piel muy suave.'),
-- Today: Confirmado
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', '2026-06-08', '17:30:00', 60, 12500, 'Confirmado', 'Martina López', '+54 9 11 1234-5678', 'martina@example.com', 'Control posterior mensual.'),
-- Today: Pendiente (booking request)
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', '2026-06-08', '18:15:00', 45, 18000, 'Pendiente', 'Lucía Torres', '+54 9 11 4567-8901', 'lucia@example.com', 'Solicitado desde la web.'),
-- Tomorrow: Confirmado
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', '2026-06-09', '10:00:00', 50, 22000, 'Confirmado', 'Carolina Herrera', '+54 9 11 5678-9012', 'carolina@example.com', NULL),
-- Next Days: Cancelado
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', '2026-06-10', '14:00:00', 55, 24000, 'Cancelado', 'Julieta Acosta', '+54 9 11 3456-7890', 'julieta@example.com', 'Canceló por viaje de trabajo.'),
-- Next Days: Available slots (status = Disponible, client details are null)
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a46', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NULL, '2026-06-11', '10:00:00', 60, 12500, 'Disponible', NULL, NULL, NULL, NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a47', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', NULL, '2026-06-11', '11:00:00', 45, 18000, 'Disponible', NULL, NULL, NULL, NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a48', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23', NULL, '2026-06-11', '15:30:00', 40, 15000, 'Disponible', NULL, NULL, NULL, NULL),
('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a49', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', NULL, '2026-06-12', '16:00:00', 50, 22000, 'Disponible', NULL, NULL, NULL, NULL);

-- 5. Insert Payments
-- UUIDs prefix: e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a5X
INSERT INTO payments (id, appointment_id, client_id, concept, amount, payment_method, status, payment_date) VALUES
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'Dermaplaning', 15000, 'Mercado Pago', 'Pagado', '2026-06-05'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'Limpieza facial profunda', 12500, 'Transferencia', 'Pagado', '2026-06-08'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a53', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a43', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a34', 'Peeling químico (Seña)', 5000, 'Efectivo', 'Señado', '2026-06-08'),
('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a54', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a35', 'Radiofrecuencia facial', 22000, NULL, 'Pendiente', NULL);

-- 6. Insert Business Settings
INSERT INTO business_settings (key, value) VALUES
('nombre_centro', 'Aura Skin Studio'),
('telefono_contacto', '+54 9 11 5555-5555'),
('email_contacto', 'contacto@auraskin.com'),
('direccion', 'Palermo, Ciudad Autónoma de Buenos Aires'),
('horario_atencion', 'Lunes a viernes de 10:00 a 19:00'),
('whatsapp', '+5491155555555'),
('instagram', '@auraskinstudio'),
('mensaje_automatico', 'Hola, tu turno en Aura Skin Studio ha sido confirmado. Te esperamos.');
