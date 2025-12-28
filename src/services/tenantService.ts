import { supabase } from '../lib/supabase';
import type { Tenant } from '../types';

export interface TenantFilters {
    searchTerm?: string;
    status?: 'active' | 'inactive' | 'pending' | '';
    roomId?: string;
    hasOverduePayments?: boolean;
    vehiclePlate?: string;
}

export interface TenantStats {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    overdue: number;
    expiringSoon: number;
}

export const tenantService = {
    // ดึงรายการผู้เช่าทั้งหมด
    async getTenants(filters?: TenantFilters): Promise<Tenant[]> {
        let query = supabase
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.searchTerm) {
            query = query.or(
                `full_name.ilike.%${filters.searchTerm}%,phone.ilike.%${filters.searchTerm}%,id_card_number.ilike.%${filters.searchTerm}%`
            );
        }

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.roomId) {
            query = query.eq('current_room_id', filters.roomId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching tenants:', error);
            throw error;
        }

        // Get active contracts for each tenant to find current room
        const tenantsWithRooms = await Promise.all(
            (data || []).map(async (tenant) => {
                const { data: contracts } = await supabase
                    .from('contracts')
                    .select(`
                        room:rooms(id, room_number, room_type)
                    `)
                    .eq('tenant_id', tenant.id)
                    .eq('status', 'active')
                    .limit(1)
                    .maybeSingle();

                return {
                    ...tenant,
                    room: contracts?.room || null,
                };
            })
        );

        // Filter by vehicle plate (client-side since JSONB query is complex)
        let filteredData = tenantsWithRooms;
        if (filters?.vehiclePlate && filteredData.length > 0) {
            const searchPlate = filters.vehiclePlate.toLowerCase();
            filteredData = filteredData.filter((tenant) => {
                if (!tenant.vehicles || tenant.vehicles.length === 0) return false;
                return tenant.vehicles.some((vehicle: any) =>
                    vehicle.plate?.toLowerCase().includes(searchPlate)
                );
            });
        }

        return filteredData;
    },

    // ดึงผู้เช่าเดียว
    async getTenant(id: string): Promise<Tenant | null> {
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching tenant:', error);
            throw error;
        }

        // Get active contract to find current room
        const { data: contract } = await supabase
            .from('contracts')
            .select(`
                room:rooms(id, room_number, room_type)
            `)
            .eq('tenant_id', id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

        return {
            ...data,
            room: contract?.room || null,
        };
    },

    // สร้างผู้เช่าใหม่
    async createTenant(tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant> {
        // Attempt to find matching user to auto-link
        let userId = undefined;
        if (tenant.phone) {
            const user = await this.findMatchingUser(tenant.phone);
            if (user) {
                userId = user.id;
            }
        }

        const { data, error } = await supabase
            .from('tenants')
            .insert([{ ...tenant, user_id: userId }])
            .select()
            .single();

        if (error) {
            console.error('Error creating tenant:', error);
            throw error;
        }

        return data;
    },

    // อัปเดตผู้เช่า
    async updateTenant(
        id: string,
        updates: Partial<Omit<Tenant, 'id' | 'created_at'>>
    ): Promise<Tenant> {
        const { data, error } = await supabase
            .from('tenants')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating tenant:', error);
            throw error;
        }

        return data;
    },

    // ลบผู้เช่า
    async deleteTenant(id: string): Promise<void> {
        // 1. Find active active contracts/room for this tenant to clean up
        const { data: contracts } = await supabase
            .from('contracts')
            .select('id, room_id')
            .eq('tenant_id', id)
            .eq('status', 'active');

        if (contracts && contracts.length > 0) {
            for (const contract of contracts) {
                // Return room to available
                await supabase
                    .from('rooms')
                    .update({
                        status: 'available',
                        current_tenant_id: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', contract.room_id);

                // Terminate contract
                await supabase
                    .from('contracts')
                    .update({
                        status: 'terminated',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', contract.id);
            }
        }

        // 2. Delete the tenant
        const { error } = await supabase.from('tenants').delete().eq('id', id);

        if (error) {
            console.error('Error deleting tenant:', error);
            throw error;
        }
    },

    // ดึงสถิติผู้เช่า
    async getTenantStats(): Promise<TenantStats> {
        const { data: tenants, error } = await supabase
            .from('tenants')
            .select('status');

        if (error) {
            console.error('Error fetching tenant stats:', error);
            throw error;
        }

        const stats: TenantStats = {
            total: tenants?.length || 0,
            active: tenants?.filter((t) => t.status === 'active').length || 0,
            inactive: tenants?.filter((t) => t.status === 'inactive').length || 0,
            pending: tenants?.filter((t) => t.status === 'pending').length || 0,
            overdue: 0, // TODO: Calculate from payments table
            expiringSoon: 0, // TODO: Calculate from contracts table
        };

        return stats;
    },

    // ตรวจสอบว่าเบอร์โทรซ้ำหรือไม่
    async checkPhoneDuplicate(phone: string, excludeId?: string): Promise<boolean> {
        let query = supabase
            .from('tenants')
            .select('id')
            .eq('phone', phone);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data } = await query;
        return (data?.length || 0) > 0;
    },

    // ตรวจสอบว่าเลขบัตรประชาชนซ้ำหรือไม่
    async checkIdCardDuplicate(idCard: string, excludeId?: string): Promise<boolean> {
        let query = supabase
            .from('tenants')
            .select('id')
            .eq('id_card_number', idCard);

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data } = await query;
        return (data?.length || 0) > 0;
    },

    // ค้นหาผู้ใช้ที่ตรงกับเบอร์โทร
    async findMatchingUser(phone: string): Promise<any | null> {
        console.log('Finding matching user for phone:', phone);

        // 1. Try exact match first
        let { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();

        if (data) {
            console.log('Found user (exact match):', data);
            return data;
        }

        // 2. Try normalized match (digits only)
        // Note: This assumes profiles might store phone numbers with dashes/spaces
        // If the DB stores clean numbers, we should clean the input `phone` first.
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone !== phone) {
            console.log('Trying normalized phone:', cleanPhone);
            const { data: dataClean } = await supabase
                .from('profiles')
                .select('*')
                .eq('phone', cleanPhone)
                .maybeSingle();

            if (dataClean) {
                console.log('Found user (normalized match):', dataClean);
                return dataClean;
            }
        }

        if (error) {
            console.error('Error finding matching user:', error);
        } else {
            console.log('No matching user found');
        }

        return null;
    },

    // ผูกบัญชีผู้ใช้กับข้อมูลผู้เช่า
    async linkUser(tenantId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('tenants')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq('id', tenantId);

        if (error) {
            console.error('Error linking user:', error);
            throw error;
        }
    },

    // ดึงข้อมูลผู้เช่าจาก user_id
    async getTenantByUserId(userId: string): Promise<Tenant | null> {
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching tenant by user id:', error);
            return null;
        }

        return data;
    },
};
