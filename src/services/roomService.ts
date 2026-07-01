import { pgliteClient } from '../lib/pgliteClient';
import type { Room, RoomStatus } from '../types';

export interface RoomFilters {
    status?: RoomStatus;
    floor?: number;
    searchTerm?: string;
}

async function roomHasActiveContract(roomId: string) {
    const { data, error } = await pgliteClient
        .from('contracts')
        .select('id')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .limit(1);

    if (error) throw error;
    return (data?.length || 0) > 0;
}

export const roomService = {
    // ดึงรายการห้องทั้งหมด
    async getRooms(filters?: RoomFilters) {
        let query = pgliteClient
            .from('rooms')
            .select('*')
            .order('room_number', { ascending: true });

        if (filters?.floor) {
            query = query.eq('floor', filters.floor);
        }

        if (filters?.searchTerm) {
            query = query.ilike('room_number', `%${filters.searchTerm}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        const rooms = (data || []) as Room[];
        const roomIds = rooms.map((room) => room.id);
        const { data: contractRows = [] } = roomIds.length
            ? await pgliteClient
                .from('contracts')
                .select('id, room_id, tenant_id, monthly_rent')
                .in('room_id', roomIds)
                .eq('status', 'active')
            : { data: [] };
        const contracts = contractRows as Array<{
            id: string;
            room_id: string;
            tenant_id: string;
            monthly_rent: number;
        }>;

        const tenantIds = [...new Set(contracts.map((contract) => contract.tenant_id).filter(Boolean))];
        const { data: tenantRows = [] } = tenantIds.length
            ? await pgliteClient
                .from('tenants')
                .select('id, full_name, phone, position_level')
                .in('id', tenantIds)
            : { data: [] };
        const tenants = tenantRows as Array<{
            id: string;
            full_name: string;
            phone: string;
            position_level?: string;
        }>;

        const contractByRoom = new Map(contracts.map((contract) => [contract.room_id, contract]));
        const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));

        const roomsWithTenants = rooms.map((room) => {
            const contract = contractByRoom.get(room.id);
            const hasActiveContract = !!contract;
            return {
                ...room,
                status: hasActiveContract ? 'occupied' : room.status,
                current_tenant_id: contract?.tenant_id || room.current_tenant_id || null,
                has_active_contract: hasActiveContract,
                current_tenant: contract?.tenant_id ? tenantById.get(contract.tenant_id) || null : null,
                current_rent: contract?.monthly_rent || null,
            };
        });

        const filteredRooms = filters?.status
            ? roomsWithTenants.filter((room) => room.status === filters.status)
            : roomsWithTenants;

        return filteredRooms as Room[];
    },

    // ดึงข้อมูลห้องเดียว
    async getRoom(id: string) {
        const { data, error } = await pgliteClient
            .from('rooms')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Get active contract to find current tenant
        const { data: contract } = await pgliteClient
            .from('contracts')
            .select(`
                monthly_rent,
                tenant:tenants(id, full_name, phone, position_level)
            `)
            .eq('room_id', id)
            .eq('status', 'active')
            .limit(1)
            .maybeSingle();

        const normalizedRoom = {
            ...data,
            status: contract ? 'occupied' : data.status,
            current_tenant_id: (contract as any)?.tenant?.id || data.current_tenant_id || null,
            has_active_contract: !!contract,
            current_tenant: contract?.tenant || null,
            current_rent: contract?.monthly_rent || null,
        };

        return normalizedRoom as Room;
    },

    // สร้างห้องใหม่
    async createRoom(roomData: Omit<Room, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await pgliteClient
            .from('rooms')
            .insert({
                ...roomData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return data as Room;
    },

    // อัปเดตห้อง
    async updateRoom(id: string, roomData: Partial<Room>) {
        if (await roomHasActiveContract(id)) {
            throw new Error('ห้องนี้มีสัญญาใช้งานอยู่ ไม่สามารถแก้ไขข้อมูลห้องพักได้');
        }

        const { data, error } = await pgliteClient
            .from('rooms')
            .update({
                ...roomData,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Room;
    },

    // ลบห้อง
    async deleteRoom(id: string) {
        if (await roomHasActiveContract(id)) {
            throw new Error('ห้องนี้มีสัญญาใช้งานอยู่ ไม่สามารถลบห้องพักได้');
        }

        const { error } = await pgliteClient
            .from('rooms')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ดึงสถิติห้อง
    async getRoomStats() {
        const { data, error } = await pgliteClient
            .from('rooms')
            .select('id, status');

        if (error) throw error;

        const roomIds = data.map((room) => room.id);
        const { data: activeContracts = [] } = roomIds.length
            ? await pgliteClient
                .from('contracts')
                .select('room_id')
                .in('room_id', roomIds)
                .eq('status', 'active')
            : { data: [] };
        const occupiedRoomIds = new Set(activeContracts.map((contract) => contract.room_id));
        const effectiveRooms = data.map((room) => ({
            ...room,
            status: occupiedRoomIds.has(room.id) ? 'occupied' : room.status,
        }));

        const stats = {
            total: effectiveRooms.length,
            available: effectiveRooms.filter((r) => r.status === 'available').length,
            occupied: effectiveRooms.filter((r) => r.status === 'occupied').length,
            reserved: effectiveRooms.filter((r) => r.status === 'reserved').length,
            maintenance: effectiveRooms.filter((r) => r.status === 'maintenance').length,
        };

        return stats;
    },

    // อัปโหลดรูปภาพห้อง
    async uploadRoomImage(roomId: string, file: File) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${roomId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await pgliteClient.storage
            .from('room-images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = pgliteClient.storage
            .from('room-images')
            .getPublicUrl(fileName);

        return data.publicUrl;
    },

    // ลบรูปภาพห้อง
    async deleteRoomImage(url: string) {
        const path = url.split('/room-images/')[1];
        if (!path) return;

        const { error } = await pgliteClient.storage
            .from('room-images')
            .remove([path]);

        if (error) throw error;
    },

    // ซิงค์สถานะห้อง
    async syncRoomStatuses(): Promise<number> {
        // 1. Get all rooms
        const { data: rooms } = await pgliteClient.from('rooms').select('id, status, current_tenant_id');
        if (!rooms || rooms.length === 0) return 0;

        let fixCount = 0;

        // 2. For each room, check active contracts
        for (const room of rooms) {
            // Get ALL active contracts (in case of duplicates)
            const { data: contracts } = await pgliteClient
                .from('contracts')
                .select('id, tenant_id, tenant:tenants(id)')
                .eq('room_id', room.id)
                .eq('status', 'active');

            let hasValidContract = false;
            let validTenantId = null;

            if (contracts && contracts.length > 0) {
                for (const contract of contracts) {
                    if (contract.tenant) {
                        // Found a valid tenant
                        hasValidContract = true;
                        validTenantId = contract.tenant_id;
                    } else {
                        // Orphan contract (Tenant deleted) -> Terminate it
                        await pgliteClient.from('contracts').update({
                            status: 'terminated',
                            updated_at: new Date().toISOString()
                        }).eq('id', contract.id);
                        fixCount++;
                    }
                }
            }

            if (hasValidContract) {
                // Should be occupied
                if (room.status !== 'occupied' || room.current_tenant_id !== validTenantId) {
                    await pgliteClient.from('rooms').update({
                        status: 'occupied',
                        current_tenant_id: validTenantId,
                        updated_at: new Date().toISOString()
                    }).eq('id', room.id);
                    fixCount++;
                }
            } else {
                // Should be available (unless it's 'maintenance' or 'reserved' which we might want to respect)
                // However, user specifically complained about rooms stuck as "occupied"
                // So if it is 'occupied', force it to 'available'
                if (room.status === 'occupied') {
                    await pgliteClient.from('rooms').update({
                        status: 'available',
                        current_tenant_id: null,
                        updated_at: new Date().toISOString()
                    }).eq('id', room.id);
                    fixCount++;
                }
            }
        }

        return fixCount;
    },

    // บังคับคืนห้อง (สำหรับแก้ปัญหาห้องค้าง)
    async forceReleaseRoom(roomId: string) {
        if (await roomHasActiveContract(roomId)) {
            throw new Error('This room has an active contract and cannot be released from the rooms page.');
        }

        // 1. Terminate all active contracts for this room
        await pgliteClient
            .from('contracts')
            .update({
                status: 'terminated',
                updated_at: new Date().toISOString()
            })
            .eq('room_id', roomId)
            .eq('status', 'active');

        // 2. Clear room status
        const { error } = await pgliteClient
            .from('rooms')
            .update({
                status: 'available',
                current_tenant_id: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', roomId);

        if (error) throw error;
    },

    // Get Meter History for a specific year
    async getMeterHistory(roomId: string, year: number) {
        const startMonth = `${year}-01-01`;
        const endMonth = `${year + 1}-01-01`;

        const { data, error } = await pgliteClient
            .from('history_meter')
            .select('*')
            .eq('room_id', roomId)
            .gte('month', startMonth)
            .lt('month', endMonth)
            .order('month', { ascending: true });

        if (error) {
            console.error('Error fetching meter history:', error);
            throw error;
        }
        return data || [];
    },

    // Update Meter History
    async updateMeterHistory(roomId: string, month: string, water: number, elec: number) {
        const { data, error } = await pgliteClient
            .from('history_meter')
            .upsert({
                room_id: roomId,
                month: month,
                water_meter: water,
                electricity_meter: elec,
                updated_at: new Date().toISOString()
            }, { onConflict: 'room_id, month' })
            .select()
            .single();

        if (error) {
            console.error('Error updating meter history:', error);
            throw error;
        }
        return data;
    }
};
