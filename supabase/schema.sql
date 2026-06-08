-- SQL Schema for Aura Skin Studio (Supabase)
-- This file defines the tables, triggers, and RLS policies.

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create updated_at automatic function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. CREATE TABLES

-- SERVICES TABLE
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    category TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFESSIONALS TABLE
CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    specialty TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'Nuevo' CHECK (status IN ('Nuevo', 'Activo', 'Inactivo')),
    notes TEXT,
    last_treatment TEXT,
    visit_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPOINTMENTS TABLE
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    status TEXT DEFAULT 'Disponible' CHECK (status IN ('Disponible', 'Pendiente', 'Confirmado', 'Cancelado', 'Finalizado')),
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    concept TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pagado', 'Pendiente', 'Señado')),
    payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BUSINESS SETTINGS TABLE
CREATE TABLE IF NOT EXISTS business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AGENT LOGS TABLE
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    user_message TEXT,
    assistant_reply TEXT,
    intent TEXT,
    success BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APPLY UPDATED_AT TRIGGERS
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- WARNING / IMPORTANTE:
-- Estas políticas RLS están configuradas para un entorno MVP / Demo.
-- Permiten lectura pública y escrituras selectivas con la anon key (sin autenticación real).
-- En un entorno de producción real, deben restringirse con autenticación de usuarios (Supabase Auth)
-- y políticas basadas en roles.

-- Enable RLS on all tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- SERVICES POLICIES: Public Read
CREATE POLICY "Allow public read access to active services" ON services
    FOR SELECT USING (true);

-- PROFESSIONALS POLICIES: Public Read
CREATE POLICY "Allow public read access to active professionals" ON professionals
    FOR SELECT USING (true);

-- APPOINTMENTS POLICIES: Public Read and public updates/insert for booking
CREATE POLICY "Allow public read access to appointments" ON appointments
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert of appointments for demo" ON appointments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update of appointments for demo" ON appointments
    FOR UPDATE USING (true) WITH CHECK (true);

-- CLIENTS POLICIES: Public Read, Write, Update (needed to seek or register client during booking)
CREATE POLICY "Allow public read access to clients for demo" ON clients
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert of clients for demo" ON clients
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update of clients for demo" ON clients
    FOR UPDATE USING (true) WITH CHECK (true);

-- PAYMENTS POLICIES: Public Read & Write (for booking payments or settings changes in demo)
CREATE POLICY "Allow public read access to payments" ON payments
    FOR SELECT USING (true);

CREATE POLICY "Allow public write access to payments for demo" ON payments
    FOR ALL USING (true);

-- BUSINESS SETTINGS POLICIES: Public Read and Write
CREATE POLICY "Allow public read access to settings" ON business_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow public update to settings for demo" ON business_settings
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public insert to settings for demo" ON business_settings
    FOR INSERT WITH CHECK (true);

-- AGENT LOGS POLICIES: Public Insert
CREATE POLICY "Allow public insert access to agent logs" ON agent_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to agent logs for demo" ON agent_logs
    FOR SELECT USING (true);
