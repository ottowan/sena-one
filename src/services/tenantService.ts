import { pgliteClient } from '../lib/pgliteClient';
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

const normalizePhone = (phone?: string | null) => (phone || '').replace(/\D/g, '');

export const tenantService = {
    // ดึงรายการผู้เช่าทั้งหมด
    async getTenants(filters?: TenantFilters): Promise<Tenant[]> {
        let query = pgliteClient
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

        const tenants = (data || []) as Tenant[];
        const tenantIds = tenants.map((tenant) => tenant.id);
        const { data: contractRows = [] } = tenantIds.length
            ? await pgliteClient
                .from('contracts')
                .select('id, tenant_id, room_id')
                .in('tenant_id', tenantIds)
                .eq('status', 'active')
            : { data: [] };
        const contracts = contractRows as Array<{ id: string; tenant_id: string; room_id: string }>;

        const roomIds = [...new Set(contracts.map((contract) => contract.room_id).filter(Boolean))];
        const { data: roomRows = [] } = roomIds.length
            ? await pgliteClient
                .from('rooms')
                .select('id, room_number, room_type')
                .in('id', roomIds)
            : { data: [] };
        const rooms = roomRows as Array<{ id: string; room_number: string; room_type: string }>;

        const contractByTenant = new Map(contracts.map((contract) => [contract.tenant_id, contract]));
        const roomById = new Map(rooms.map((room) => [room.id, room]));

        const tenantsWithRooms = tenants.map((tenant) => {
            const contract = contractByTenant.get(tenant.id);
            return {
                ...tenant,
                room: contract?.room_id ? roomById.get(contract.room_id) || null : null,
            };
        });

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
        const { data, error } = await pgliteClient
            .from('tenants')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching tenant:', error);
            throw error;
        }

        // Get active contract to find current room
        const { data: contract } = await pgliteClient
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

        const { data, error } = await pgliteClient
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
        const { data, error } = await pgliteClient
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
        const { data: contracts } = await pgliteClient
            .from('contracts')
            .select('id, room_id')
            .eq('tenant_id', id)
            .eq('status', 'active');

        if (contracts && contracts.length > 0) {
            for (const contract of contracts) {
                // Return room to available
                await pgliteClient
                    .from('rooms')
                    .update({
                        status: 'available',
                        current_tenant_id: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', contract.room_id);

                // Terminate contract
                await pgliteClient
                    .from('contracts')
                    .update({
                        status: 'terminated',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', contract.id);
            }
        }

        // 2. Delete the tenant
        const { error } = await pgliteClient.from('tenants').delete().eq('id', id);

        if (error) {
            console.error('Error deleting tenant:', error);
            throw error;
        }
    },

    // ดึงสถิติผู้เช่า
    async getTenantStats(): Promise<TenantStats> {
        const { data: tenants, error } = await pgliteClient
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
        let query = pgliteClient
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
        let query = pgliteClient
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

        // 1. Try exact match in users first. Login accounts live here.
        let { data, error } = await pgliteClient
            .from('users')
            .select('id, phone, full_name, role')
            .eq('phone', phone)
            .maybeSingle();

        if (data) {
            console.log('Found user (exact match):', data);
            return data;
        }

        // 2. Fallback to profiles for older imported data.
        const profileResult = await pgliteClient
            .from('profiles')
            .select('id, phone, full_name, role')
            .eq('phone', phone)
            .maybeSingle();

        if (profileResult.data) {
            console.log('Found profile (exact match):', profileResult.data);
            return profileResult.data;
        }

        // 2. Try normalized match (digits only)
        // Note: This assumes profiles might store phone numbers with dashes/spaces
        // If the DB stores clean numbers, we should clean the input `phone` first.
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone !== phone) {
            console.log('Trying normalized phone:', cleanPhone);
            const { data: dataClean } = await pgliteClient
                .from('users')
                .select('id, phone, full_name, role')
                .eq('phone', cleanPhone)
                .maybeSingle();

            if (dataClean) {
                console.log('Found user (normalized match):', dataClean);
                return dataClean;
            }

            const { data: profileClean } = await pgliteClient
                .from('profiles')
                .select('id, phone, full_name, role')
                .eq('phone', cleanPhone)
                .maybeSingle();

            if (profileClean) {
                console.log('Found profile (normalized match):', profileClean);
                return profileClean;
            }
        }

        if (error || profileResult.error) {
            console.error('Error finding matching user:', error || profileResult.error);
        } else {
            console.log('No matching user found');
        }

        return null;
    },

    // ผูกบัญชีผู้ใช้กับข้อมูลผู้เช่า
    async autoLinkUsersWithActiveContracts(tenantIds?: string[]): Promise<number> {
        let tenantQuery = pgliteClient
            .from('tenants')
            .select('id, phone, user_id, current_room_id, status');

        if (tenantIds?.length) {
            tenantQuery = tenantQuery.in('id', tenantIds);
        }

        const { data: tenantRows, error: tenantError } = await tenantQuery;
        if (tenantError) {
            console.error('Error fetching tenants for auto-link:', tenantError);
            throw tenantError;
        }

        const candidateTenants = (tenantRows || []).filter((tenant) => !tenant.user_id && normalizePhone(tenant.phone));
        if (candidateTenants.length === 0) return 0;

        const candidateIds = candidateTenants.map((tenant) => tenant.id);
        const { data: contracts, error: contractError } = await pgliteClient
            .from('contracts')
            .select('tenant_id, room_id')
            .in('tenant_id', candidateIds)
            .eq('status', 'active');

        if (contractError) {
            console.error('Error fetching contracts for auto-link:', contractError);
            throw contractError;
        }

        const autoLinkContracts = (contracts || []) as Array<{ tenant_id: string; room_id: string }>;
        const activeContractByTenant = new Map(
            autoLinkContracts
                .filter((contract) => contract.tenant_id && contract.room_id)
                .map((contract) => [contract.tenant_id, contract])
        );
        const eligibleTenants = candidateTenants.filter((tenant) => activeContractByTenant.has(tenant.id));
        if (eligibleTenants.length === 0) return 0;

        const { data: users, error: userError } = await pgliteClient
            .from('users')
            .select('id, phone, role');

        if (userError) {
            console.error('Error fetching users for auto-link:', userError);
            throw userError;
        }

        const { data: profiles, error: profileError } = await pgliteClient
            .from('profiles')
            .select('id, phone, role');

        if (profileError) {
            console.error('Error fetching profiles for auto-link:', profileError);
            throw profileError;
        }

        const { data: allTenants } = await pgliteClient
            .from('tenants')
            .select('user_id');
        const linkedUserIds = new Set((allTenants || []).map((tenant) => tenant.user_id).filter(Boolean));

        const accountByPhone = new Map<string, any>();
        (users || []).forEach((user) => {
            const phone = normalizePhone(user.phone);
            if (phone && !accountByPhone.has(phone)) {
                accountByPhone.set(phone, user);
            }
        });
        (profiles || []).forEach((profile) => {
            const phone = normalizePhone(profile.phone);
            if (phone && !accountByPhone.has(phone)) {
                accountByPhone.set(phone, profile);
            }
        });

        let linkedCount = 0;
        for (const tenant of eligibleTenants) {
            const account = accountByPhone.get(normalizePhone(tenant.phone));
            if (!account || linkedUserIds.has(account.id)) continue;

            const contract = activeContractByTenant.get(tenant.id);
            const { error } = await pgliteClient
                .from('tenants')
                .update({
                    user_id: account.id,
                    current_room_id: tenant.current_room_id || contract?.room_id,
                    status: tenant.status === 'pending' ? 'active' : tenant.status,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', tenant.id);

            if (error) {
                console.error('Error auto-linking tenant user:', error);
                throw error;
            }

            linkedUserIds.add(account.id);
            linkedCount++;
        }

        return linkedCount;
    },

    async linkUser(tenantId: string, userId: string): Promise<void> {
        const { error } = await pgliteClient
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
        const { data, error } = await pgliteClient
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
