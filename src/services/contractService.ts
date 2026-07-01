import { pgliteClient } from '../lib/pgliteClient';
import type { Contract, ContractStatus } from '../types';

export interface ContractFilters {
    searchTerm?: string;
    status?: ContractStatus | '';
    roomId?: string;
    tenantId?: string;
}

export interface ContractStats {
    total: number;
    active: number;
    expired: number;
    terminated: number;
    renewed: number;
    expiringSoon: number;
    remainingFourMonths: number;
    remainingTwoMonths: number;
    expiredByDate: number;
}

export interface RenewalData {
    end_date: string;
    monthly_rent?: number;
    deposit_amount?: number;
}

export interface TransferData {
    new_room_id: string;
    transfer_date: string;
    reason?: string;
}

export interface CancellationData {
    cancellation_date: string;
    reason: string;
    refund_deposit: boolean;
}

async function assertRoomCanBeAssigned(roomId: string, currentContractId?: string) {
    const { data: room, error: roomError } = await pgliteClient
        .from('rooms')
        .select('id, status, current_tenant_id')
        .eq('id', roomId)
        .maybeSingle();

    if (roomError) throw roomError;
    if (!room) throw new Error('ไม่พบห้องพักที่เลือก');
    if (room.status !== 'available') {
        throw new Error('ห้องพักที่เลือกไม่ว่าง กรุณาเลือกห้องว่างเท่านั้น');
    }

    let contractQuery = pgliteClient
        .from('contracts')
        .select('id')
        .eq('room_id', roomId)
        .eq('status', 'active');

    if (currentContractId) {
        contractQuery = contractQuery.neq('id', currentContractId);
    }

    const { data: activeContracts, error: contractError } = await contractQuery;
    if (contractError) throw contractError;
    if ((activeContracts?.length || 0) > 0) {
        throw new Error('ห้องพักที่เลือกมีสัญญาใช้งานอยู่แล้ว');
    }
}

export const contractService = {
    // ดึงรายการสัญญาทั้งหมด
    async getContracts(filters?: ContractFilters): Promise<Contract[]> {
        let query = pgliteClient
            .from('contracts')
            .select(`
        *,
        tenant:tenants(*),
        room:rooms(*)
      `)
            .order('end_date', { ascending: true });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.roomId) {
            query = query.eq('room_id', filters.roomId);
        }

        if (filters?.tenantId) {
            query = query.eq('tenant_id', filters.tenantId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching contracts:', error);
            throw error;
        }

        let contracts = data || [];
        if (filters?.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            contracts = contracts.filter((contract) =>
                contract.tenant?.full_name?.toLowerCase().includes(lowerTerm) ||
                contract.room?.room_number?.toLowerCase().includes(lowerTerm)
            );
        }

        return contracts;
    },

    // ดึงสัญญาเดียว
    async getContract(id: string): Promise<Contract | null> {
        const { data, error } = await pgliteClient
            .from('contracts')
            .select(`
        *,
        tenant:tenants(*),
        room:rooms(*)
      `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching contract:', error);
            throw error;
        }

        return data;
    },

    // สร้างสัญญาใหม่
    async createContract(
        contract: Omit<Contract, 'id' | 'created_at' | 'tenant' | 'room'>
    ): Promise<Contract> {
        if (contract.status === 'active') {
            await assertRoomCanBeAssigned(contract.room_id);
        }

        // Start transaction-like operations
        const { data: newContract, error: contractError } = await pgliteClient
            .from('contracts')
            .insert([contract])
            .select()
            .single();

        if (contractError) {
            console.error('Error creating contract:', contractError);
            throw contractError;
        }

        // Update room status to occupied
        const roomUpdate = await pgliteClient
            .from('rooms')
            .update({
                status: 'occupied',
                current_tenant_id: contract.tenant_id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', contract.room_id);

        if (roomUpdate.error) {
            console.error('Error updating room for contract:', roomUpdate.error);
            throw roomUpdate.error;
        }

        // Update tenant status to active
        const tenantUpdate = await pgliteClient
            .from('tenants')
            .update({
                status: 'active',
                move_in_date: contract.start_date,
                current_room_id: contract.room_id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', contract.tenant_id);

        if (tenantUpdate.error) {
            console.error('Error updating tenant for contract:', tenantUpdate.error);
            throw tenantUpdate.error;
        }

        return newContract;
    },

    // อัปเดตสัญญา
    async updateContract(
        id: string,
        updates: Partial<Omit<Contract, 'id' | 'created_at' | 'tenant' | 'room'>>
    ): Promise<Contract> {
        // Get original contract first
        const original = await this.getContract(id);
        if (!original) throw new Error('Contract not found');

        const nextRoomId = updates.room_id || original.room_id;
        const nextTenantId = updates.tenant_id || original.tenant_id;
        const nextStatus = updates.status || original.status;
        const roomChanged = !!updates.room_id && updates.room_id !== original.room_id;

        if (nextStatus === 'active' && (roomChanged || original.status !== 'active')) {
            await assertRoomCanBeAssigned(nextRoomId, id);
        }

        const { data, error } = await pgliteClient
            .from('contracts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating contract:', error);
            throw error;
        }

        if (roomChanged) {
            await pgliteClient
                .from('rooms')
                .update({
                    status: 'available',
                    current_tenant_id: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', original.room_id);
        }

        if (nextStatus === 'active') {
            await pgliteClient
                .from('rooms')
                .update({
                    status: 'occupied',
                    current_tenant_id: nextTenantId,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', nextRoomId);

            await pgliteClient
                .from('tenants')
                .update({
                    status: 'active',
                    move_in_date: updates.start_date || original.start_date,
                    current_room_id: nextRoomId,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', nextTenantId);
        }

        // Update room and tenant status based on contract status changes
        if (updates.status) {
            if (updates.status === 'terminated' || updates.status === 'expired' || updates.status === 'renewed') {
                // Set room to available
                await pgliteClient
                    .from('rooms')
                    .update({
                        status: 'available',
                        current_tenant_id: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', nextRoomId);

                if (updates.status === 'terminated' || updates.status === 'expired') {
                    // Set tenant to inactive
                    await pgliteClient
                        .from('tenants')
                        .update({
                            status: 'inactive',
                            current_room_id: null,
                            move_out_date: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', nextTenantId);
                }
            }
        }

        return data;
    },

    // ต่อสัญญา
    async renewContract(id: string, renewalData: RenewalData): Promise<Contract> {
        // Get original contract
        const original = await this.getContract(id);
        if (!original) throw new Error('Contract not found');

        // Update old contract status
        await this.updateContract(id, { status: 'renewed' as ContractStatus });

        // Create new contract
        const newContract = await this.createContract({
            tenant_id: original.tenant_id,
            room_id: original.room_id,
            start_date: original.end_date,
            end_date: renewalData.end_date,
            monthly_rent: renewalData.monthly_rent || original.monthly_rent,
            deposit_amount: renewalData.deposit_amount || original.deposit_amount,
            status: 'active' as ContractStatus,
        });

        return newContract;
    },

    // โอนสัญญา
    async transferContract(id: string, transferData: TransferData): Promise<Contract> {
        const contract = await this.getContract(id);
        if (!contract) throw new Error('Contract not found');

        await assertRoomCanBeAssigned(transferData.new_room_id, id);

        const updated = await this.updateContract(id, {
            room_id: transferData.new_room_id,
        });

        await pgliteClient
            .from('tenants')
            .update({
                status: 'active',
                move_in_date: transferData.transfer_date,
                current_room_id: transferData.new_room_id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', contract.tenant_id);

        return updated;
    },

    // ยกเลิกสัญญา
    async cancelContract(id: string, cancellationData: CancellationData): Promise<Contract> {
        const contract = await this.getContract(id);
        if (!contract) throw new Error('Contract not found');

        // Update contract
        const updated = await this.updateContract(id, {
            status: 'terminated' as ContractStatus,
        });

        // Update room to available
        await pgliteClient
            .from('rooms')
            .update({
                status: 'available',
            })
            .eq('id', contract.room_id);

        // Update tenant to inactive
        await pgliteClient
            .from('tenants')
            .update({
                status: 'inactive',
                move_out_date: cancellationData.cancellation_date,
            })
            .eq('id', contract.tenant_id);

        // TODO: Create payment record for deposit refund if needed
        if (cancellationData.refund_deposit) {
            console.log('TODO: Create deposit refund payment');
        }

        return updated;
    },

    // ดึงสถิติสัญญา
    async getContractStats(): Promise<ContractStats> {
        const { data: contracts, error } = await pgliteClient
            .from('contracts')
            .select('status, end_date');

        if (error) {
            console.error('Error fetching contract stats:', error);
            throw error;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysUntilEndDate = (endDate: string) => {
            const datePart = endDate.split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);
            const end = year && month && day
                ? new Date(year, month - 1, day)
                : new Date(endDate);
            end.setHours(0, 0, 0, 0);

            return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        };

        const endDateValue = (endDate: string) => {
            const datePart = endDate.split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);
            const end = year && month && day
                ? new Date(year, month - 1, day)
                : new Date(endDate);
            end.setHours(0, 0, 0, 0);
            return end;
        };

        const addMonths = (date: Date, months: number): Date => {
            const result = new Date(date);
            const day = result.getDate();
            result.setDate(1);
            result.setMonth(result.getMonth() + months);
            const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
            result.setDate(Math.min(day, lastDayOfMonth));
            return result;
        };

        const isDueWithinMonths = (endDate: string, months: number) => {
            const end = endDateValue(endDate);
            return end.getTime() > today.getTime() && end.getTime() <= addMonths(today, months).getTime();
        };

        const activeContracts = contracts?.filter((c) => c.status === 'active') || [];

        const stats: ContractStats = {
            total: contracts?.length || 0,
            active: activeContracts.length,
            expired: contracts?.filter((c) => c.status === 'expired').length || 0,
            terminated: contracts?.filter((c) => c.status === 'terminated').length || 0,
            renewed: contracts?.filter((c) => c.status === 'renewed').length || 0,
            remainingFourMonths: activeContracts.filter((c) => isDueWithinMonths(c.end_date, 4)).length,
            remainingTwoMonths: activeContracts.filter((c) => isDueWithinMonths(c.end_date, 2)).length,
            expiringSoon: activeContracts.filter((c) => {
                const days = daysUntilEndDate(c.end_date);
                return days > 0 && days <= 30;
            }).length,
            expiredByDate: activeContracts.filter((c) => daysUntilEndDate(c.end_date) <= 0).length,
        };

        return stats;
    },

    // ดึงสัญญาที่ใกล้หมดอายุ
    async getExpiringContracts(days: number = 30): Promise<Contract[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const { data, error } = await pgliteClient
            .from('contracts')
            .select(`
        *,
        tenant:tenants(*),
        room:rooms(*)
      `)
            .eq('status', 'active')
            .lte('end_date', futureDate.toISOString())
            .gte('end_date', new Date().toISOString())
            .order('end_date', { ascending: true });

        if (error) {
            console.error('Error fetching expiring contracts:', error);
            throw error;
        }

        return data || [];
    },
};
