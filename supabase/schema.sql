-- ============================================
-- Sena-One Database Schema
-- ระบบจัดการหอพัก
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'owner', 'tenant');
CREATE TYPE room_status AS ENUM ('available', 'reserved', 'occupied', 'maintenance');
CREATE TYPE contract_status AS ENUM ('active', 'expired', 'terminated', 'renewed');
CREATE TYPE invoice_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'transfer', 'qr');
CREATE TYPE deposit_status AS ENUM ('held', 'refunded', 'forfeited');
CREATE TYPE maintenance_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'pending');

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'tenant',
  full_name TEXT NOT NULL,
  phone TEXT,
  id_card_number TEXT,
  id_card_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  id_card_number TEXT NOT NULL,
  id_card_images JSONB DEFAULT '[]'::jsonb,
  emergency_contact JSONB,
  move_in_date DATE,
  move_out_date DATE,
  status tenant_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC(10, 2) NOT NULL,
  deposit_amount NUMERIC(10, 2) DEFAULT 0,
  contract_files JSONB DEFAULT '[]'::jsonb,
  status contract_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_contract_dates CHECK (end_date > start_date)
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  rent_amount NUMERIC(10, 2) NOT NULL,
  water_usage NUMERIC(10, 2) DEFAULT 0,
  water_cost NUMERIC(10, 2) DEFAULT 0,
  electricity_usage NUMERIC(10, 2) DEFAULT 0,
  electricity_cost NUMERIC(10, 2) DEFAULT 0,
  additional_charges JSONB DEFAULT '[]'::jsonb,
  total_amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status invoice_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  receipt_image_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deposits
CREATE TABLE deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  status deposit_status DEFAULT 'held',
  refund_amount NUMERIC(10, 2),
  refund_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Requests
CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  images JSONB DEFAULT '[]'::jsonb,
  status maintenance_status DEFAULT 'pending',
  priority maintenance_priority DEFAULT 'medium',
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  id_card_number TEXT NOT NULL,
  documents JSONB DEFAULT '[]'::jsonb,
  move_in_date DATE NOT NULL,
  status booking_status DEFAULT 'pending',
  deposit_paid NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_room_number ON rooms(room_number);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_user_id ON tenants(user_id);
CREATE INDEX idx_contracts_tenant_id ON contracts(tenant_id);
CREATE INDEX idx_contracts_room_id ON contracts(room_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_billing_month ON invoices(billing_month);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_maintenance_status ON maintenance_requests(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Rooms policies
CREATE POLICY "Anyone can view available rooms" ON rooms FOR SELECT USING (status = 'available');
CREATE POLICY "Admins can manage rooms" ON rooms FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Tenants policies
CREATE POLICY "Tenants can view own data" ON tenants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage tenants" ON tenants FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Contracts policies
CREATE POLICY "Tenants can view own contracts" ON contracts FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants WHERE id = contracts.tenant_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage contracts" ON contracts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Invoices policies
CREATE POLICY "Tenants can view own invoices" ON invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants WHERE id = invoices.tenant_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage invoices" ON invoices FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Payments policies
CREATE POLICY "Admins can manage payments" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Deposits policies
CREATE POLICY "Tenants can view own deposits" ON deposits FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants WHERE id = deposits.tenant_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage deposits" ON deposits FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Maintenance requests policies
CREATE POLICY "Tenants can view own requests" ON maintenance_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM tenants WHERE id = maintenance_requests.tenant_id AND user_id = auth.uid())
);
CREATE POLICY "Tenants can create requests" ON maintenance_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tenants WHERE id = tenant_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage requests" ON maintenance_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Bookings policies
CREATE POLICY "Anyone can create bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage bookings" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-update invoice status to overdue
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE invoices
  SET status = 'overdue'
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets (run these in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('room-images', 'room-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('id-cards', 'id-cards', false);

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Insert sample admin user (after creating auth user)
-- INSERT INTO profiles (id, role, full_name, phone)
-- VALUES ('your-auth-user-id', 'admin', 'ผู้ดูแลระบบ', '0812345678');
