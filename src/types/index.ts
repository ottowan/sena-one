// TypeScript types สำหรับระบบ Sena-One

// ============================================
// Enums
// ============================================

export enum UserRole {
    ADMIN = 'admin',
    OWNER = 'owner',
    TENANT = 'tenant',
}

export enum RoomStatus {
    AVAILABLE = 'available',
    RESERVED = 'reserved',
    OCCUPIED = 'occupied',
    MAINTENANCE = 'maintenance',
}

export enum ContractStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    TERMINATED = 'terminated',
    RENEWED = 'renewed',
}

export enum InvoiceStatus {
    PENDING = 'pending',
    PAID = 'paid',
    OVERDUE = 'overdue',
    CANCELLED = 'cancelled',
}

export enum PaymentMethod {
    CASH = 'cash',
    TRANSFER = 'transfer',
    QR = 'qr',
}

export enum DepositStatus {
    HELD = 'held',
    REFUNDED = 'refunded',
    FORFEITED = 'forfeited',
}

export enum MaintenanceStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum MaintenancePriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

export enum BookingStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
}

export enum VehicleType {
    CAR = 'car',
    PICKUP = 'pickup',
    MOTORCYCLE = 'motorcycle',
}

export enum PositionLevel {
    PRACTITIONER = 'ปฏิบัติการ',
    SPECIALIST = 'ชำนาญการ',
    SENIOR_SPECIALIST = 'ชำนาญการพิเศษ',
    EXPERT = 'เชี่ยวชาญ',
}

// ============================================
// Database Tables
// ============================================

export interface Profile {
    id: string;
    role: UserRole;
    email?: string;
    full_name: string;
    phone: string;
    id_card_number?: string;
    id_card_image_url?: string;
    created_at: string;
    updated_at: string;
}

export interface RoomEquipmentItem {
    id: string;
    name: string;
    asset_number?: string;
}

export interface Room {
    id: string;
    room_number: string;
    room_type: string;
    size_sqm: number;
    monthly_rent: number;
    water_rate: number;
    electricity_rate: number;
    current_water_meter?: number;
    current_electricity_meter?: number;
    status: RoomStatus;
    floor: number;
    description?: string;
    amenities?: string[];
    images?: string[];
    equipment?: RoomEquipmentItem[];
    created_at: string;
    updated_at: string;
    current_tenant_id?: string | null;
    // Relations
    has_active_contract?: boolean;
    current_tenant?: {
        id: string;
        full_name: string;
        phone: string;
        position_level?: string;
    } | null;
    current_rent?: number;
    current_contract_start_date?: string | null;
    current_contract_end_date?: string | null;
}

export interface Vehicle {
    type: VehicleType;
    plate: string;
    province: string;
    brand?: string;
    color?: string;
}

// ทะเบียนคุมรถยนต์ - independent registry keyed by room, separate from
// Tenant.vehicles (which stays tied to a tenant profile).
export interface VehicleRegistration {
    id: string;
    room_id: string;
    type: VehicleType;
    plate: string;
    province: string;
    brand?: string;
    color?: string;
    has_sticker: boolean;
    created_at: string;
    updated_at: string;
    // Relations
    room?: {
        id: string;
        room_number: string;
        current_tenant_name?: string | null;
        current_tenant_phone?: string | null;
    };
}

export interface Tenant {
    id: string;
    user_id?: string;
    full_name: string;
    phone: string;
    email?: string;
    id_card_number: string;
    id_card_images?: string[];
    emergency_contact?: {
        name: string;
        phone: string;
        relationship: string;
    };
    vehicles?: Vehicle[];
    // Read-only: joined from the `vehicles` collection (ทะเบียนคุมรถยนต์) by
    // the tenant's current room - managed on the vehicle registry page, not here.
    registered_vehicles?: VehicleRegistration[];
    position_title?: string;
    position_level?: PositionLevel;
    workplace?: string;
    move_in_date?: string;
    move_out_date?: string;
    status: 'active' | 'inactive' | 'pending';
    current_room_id?: string;
    created_at: string;
    updated_at?: string;
    // Relations
    room?: {
        id: string;
        room_number: string;
        room_type: string;
    };
}

export interface Contract {
    id: string;
    tenant_id: string;
    room_id: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    deposit_amount: number;
    contract_files?: string[];
    status: ContractStatus;
    created_at: string;
    // Relations
    tenant?: Tenant;
    room?: Room;
}

export interface Invoice {
    id: string;
    contract_id: string;
    tenant_id: string;
    room_id: string;
    billing_month: string;
    rent_amount: number;
    water_usage: number;
    water_cost: number;
    water_meter_last?: number;
    water_meter_current?: number;
    electricity_usage: number;
    electricity_cost: number;
    electricity_meter_last?: number;
    electricity_meter_current?: number;
    additional_charges?: {
        name: string;
        amount: number;
    }[];
    total_amount: number;
    due_date: string;
    status: InvoiceStatus;
    created_at: string;
    // Relations
    tenant?: Tenant;
    room?: Room;
    contract?: Contract;
    payments?: Payment[];
}

export interface Payment {
    id: string;
    invoice_id: string;
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    receipt_image_url?: string;
    notes?: string;
    created_by: string;
    created_at: string;
    // Relations
    invoice?: Invoice;
}

export interface Deposit {
    id: string;
    contract_id: string;
    tenant_id: string;
    amount: number;
    status: DepositStatus;
    refund_amount?: number;
    refund_date?: string;
    notes?: string;
    created_at: string;
    // Relations
    tenant?: Tenant;
    contract?: Contract;
}

export interface MaintenanceRequest {
    id: string;
    room_id: string;
    tenant_id: string;
    title: string;
    description: string;
    images?: string[];
    status: MaintenanceStatus;
    priority: MaintenancePriority;
    assigned_to?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    // Relations
    room?: Room;
    tenant?: Tenant;
}

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    data?: Record<string, any>;
    created_at: string;
}

export interface Booking {
    id: string;
    room_id: string;
    applicant_name: string;
    phone: string;
    email?: string;
    id_card_number: string;
    documents?: string[];
    move_in_date: string;
    status: BookingStatus;
    deposit_paid?: number;
    created_at: string;
    // Relations
    room?: Room;
}

export interface RentRate {
    position_level: string;
    rent_amount: number;
    common_fee: number;
    updated_at: string;
}

export interface AppSettings {
    id: number;
    common_fee: number;
    water_rate: number;
    water_maintenance_fee: number;
    electricity_rate: number;
    updated_at: string;
}

// ============================================
// Form Types
// ============================================

export interface LoginFormData {
    phone: string;
    password: string;
}

export interface RoomFormData {
    room_number: string;
    room_type: string;
    size_sqm: number;
    monthly_rent: number;
    water_rate: number;
    electricity_rate: number;
    current_water_meter?: number;
    current_electricity_meter?: number;
    floor: number;
    description?: string;
    amenities?: string[];
    status: RoomStatus;
}

export interface TenantFormData {
    full_name: string;
    phone: string;
    email?: string;
    id_card_number: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    emergency_contact_relationship: string;
}

export interface ContractFormData {
    tenant_id: string;
    room_id: string;
    start_date: string;
    end_date: string;
    monthly_rent: number;
    deposit_amount: number;
}

export interface AdditionalCharge {
    name: string;
    amount: number;
}

export interface InvoiceFormData {
    contract_id: string;
    billing_month: string;
    water_usage: number;
    electricity_usage: number;
    water_meter_last?: number;
    water_meter_current?: number;
    electricity_meter_last?: number;
    electricity_meter_current?: number;
    additional_charges?: {
        name: string;
        amount: number;
    }[];
    due_date: string;
}

export interface PaymentFormData {
    invoice_id: string;
    amount: number;
    payment_method: PaymentMethod;
    payment_date: string;
    notes?: string;
}

export interface MaintenanceFormData {
    room_id: string;
    title: string;
    description: string;
    priority: MaintenancePriority;
    images?: string[];
}

export interface VehicleRegistrationFormData {
    type: VehicleType;
    plate: string;
    province: string;
    brand?: string;
    color?: string;
    has_sticker: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
}

// ============================================
// Dashboard Stats
// ============================================

export interface DashboardStats {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    monthlyRevenue: number;
    overduePayments: number;
    openMaintenanceRequests: number;
    activeTenants: number;
    expiringContracts: number;
}
