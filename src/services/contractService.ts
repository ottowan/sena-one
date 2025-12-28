import { supabase } from '../lib/supabase';
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
}

export interface RenewalData {
    end_date: string;
    monthly_rent?: number;
    deposit_amount?: number;
}

export interface TransferData {
    new_tenant_id: string;
    transfer_date: string;
    notes?: string;
}

export interface CancellationData {
    cancellation_date: string;
    reason: string;
    refund_deposit: boolean;
}

export const contractService = {
    // ดึงรายการสัญญาทั้งหมด
    async getContracts(filters?: ContractFilters): Promise<Contract[]> {
        let query = supabase
            .from('contracts')
            .select(`
        *,
        tenant:tenants(*),
        room:rooms(*)
      `)
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters?.searchTerm) {
            // Search in tenant name or room number via joins
            query = query.or(
                `tenant.full_name.ilike.%${filters.searchTerm}%,room.room_number.ilike.%${filters.searchTerm}%`
            );
        }

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

        return data || [];
    },

    // ดึงสัญญาเดียว
    async getContract(id: string): Promise<Contract | null> {
        const { data, error } = await supabase
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
        // Start transaction-like operations
        const { data: newContract, error: contractError } = await supabase
            .from('contracts')
            .insert([contract])
            .select()
            .single();

        if (contractError) {
            console.error('Error creating contract:', contractError);
            throw contractError;
        }

        // Update room status to occupied
        await supabase
            .from('rooms')
            .update({
                status: 'occupied',
            })
            .eq('id', contract.room_id);

        // Update tenant status to active
        await supabase
            .from('tenants')
            .update({
                status: 'active',
                move_in_date: contract.start_date,
            })
            .eq('id', contract.tenant_id);

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

        const { data, error } = await supabase
            .from('contracts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating contract:', error);
            throw error;
        }

        // Update room and tenant status based on contract status changes
        if (updates.status) {
            if (updates.status === 'active') {
                // Set room to occupied
                await supabase
                    .from('rooms')
                    .update({ status: 'occupied' })
                    .eq('id', original.room_id);

                // Set tenant to active
                await supabase
                    .from('tenants')
                    .update({ 
                        status: 'active',
                        move_in_date: updates.start_date || original.start_date
                    })
                    .eq('id', original.tenant_id);
            } else if (updates.status === 'terminated' || updates.status === 'expired') {
                // Set room to available
                await supabase
                    .from('rooms')
                    .update({ status: 'available' })
                    .eq('id', original.room_id);

                // Set tenant to inactive
                await supabase
                    .from('tenants')
                    .update({ 
                        status: 'inactive',
                        move_out_date: new Date().toISOString()
                    })
                    .eq('id', original.tenant_id);
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

        // Update old tenant
        await supabase
            .from('tenants')
            .update({
                status: 'inactive',
                move_out_date: transferData.transfer_date,
            })
            .eq('id', contract.tenant_id);

        // Update contract
        const updated = await this.updateContract(id, {
            tenant_id: transferData.new_tenant_id,
        });

        // Update new tenant
        await supabase
            .from('tenants')
            .update({
                status: 'active',
                move_in_date: transferData.transfer_date,
            })
            .eq('id', transferData.new_tenant_id);

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
        await supabase
            .from('rooms')
            .update({
                status: 'available',
            })
            .eq('id', contract.room_id);

        // Update tenant to inactive
        await supabase
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
        const { data: contracts, error } = await supabase
            .from('contracts')
            .select('status, end_date');

        if (error) {
            console.error('Error fetching contract stats:', error);
            throw error;
        }

        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const stats: ContractStats = {
            total: contracts?.length || 0,
            active: contracts?.filter((c) => c.status === 'active').length || 0,
            expired: contracts?.filter((c) => c.status === 'expired').length || 0,
            terminated: contracts?.filter((c) => c.status === 'terminated').length || 0,
            renewed: contracts?.filter((c) => c.status === 'renewed').length || 0,
            expiringSoon:
                contracts?.filter(
                    (c) =>
                        c.status === 'active' &&
                        new Date(c.end_date) <= thirtyDaysFromNow &&
                        new Date(c.end_date) > now
                ).length || 0,
        };

        return stats;
    },

    // ดึงสัญญาที่ใกล้หมดอายุ
    async getExpiringContracts(days: number = 30): Promise<Contract[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const { data, error } = await supabase
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
