import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchByIds, nowIso, withId } from '../lib/firestoreUtils';
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

async function attachRelations(contracts: Contract[]): Promise<Contract[]> {
    const tenantIds = contracts.map((c) => c.tenant_id);
    const roomIds = contracts.map((c) => c.room_id);
    const [tenantById, roomById] = await Promise.all([
        fetchByIds<any>('tenants', tenantIds),
        fetchByIds<any>('rooms', roomIds),
    ]);

    return contracts.map((contract) => ({
        ...contract,
        tenant: tenantById.get(contract.tenant_id) || undefined,
        room: roomById.get(contract.room_id) || undefined,
    }));
}

export const contractService = {
    async getContracts(filters?: ContractFilters): Promise<Contract[]> {
        const constraints = [];
        if (filters?.status) constraints.push(where('status', '==', filters.status));
        if (filters?.roomId) constraints.push(where('room_id', '==', filters.roomId));
        if (filters?.tenantId) constraints.push(where('tenant_id', '==', filters.tenantId));

        const snap = await getDocs(query(collection(db, 'contracts'), ...constraints, orderBy('end_date', 'asc')));
        let contracts = await attachRelations(snap.docs.map((d) => withId<Contract>(d)));

        if (filters?.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            contracts = contracts.filter(
                (contract) =>
                    contract.tenant?.full_name?.toLowerCase().includes(term) ||
                    contract.room?.room_number?.toLowerCase().includes(term)
            );
        }

        return contracts;
    },

    async getContract(id: string): Promise<Contract | null> {
        const snap = await getDoc(doc(db, 'contracts', id));
        if (!snap.exists()) return null;
        const [contract] = await attachRelations([withId<Contract>(snap as any)]);
        return contract;
    },

    async createContract(contract: Omit<Contract, 'id' | 'created_at' | 'tenant' | 'room'>): Promise<Contract> {
        const contractRef = doc(collection(db, 'contracts'));
        const now = nowIso();
        let resultData: Contract | undefined;

        await runTransaction(db, async (tx) => {
            const roomRef = doc(db, 'rooms', contract.room_id);
            const tenantRef = doc(db, 'tenants', contract.tenant_id);
            const roomSnap = await tx.get(roomRef);
            const tenantSnap = await tx.get(tenantRef);

            if (!roomSnap.exists()) throw new Error('ไม่พบห้องพักที่เลือก');
            if (contract.status === 'active' && roomSnap.data().status !== 'available') {
                throw new Error('ห้องพักที่เลือกไม่ว่าง กรุณาเลือกห้องว่างเท่านั้น');
            }

            const tenantUid = tenantSnap.exists() ? tenantSnap.data().user_id ?? null : null;
            const newContract = { ...contract, tenant_uid: tenantUid, created_at: now };
            tx.set(contractRef, newContract);

            if (contract.status === 'active') {
                tx.update(roomRef, {
                    status: 'occupied',
                    current_tenant_id: contract.tenant_id,
                    current_tenant_uid: tenantUid,
                    updated_at: now,
                });
                tx.update(tenantRef, {
                    status: 'active',
                    move_in_date: contract.start_date,
                    current_room_id: contract.room_id,
                    updated_at: now,
                });
            }

            resultData = { id: contractRef.id, ...newContract } as unknown as Contract;
        });

        return resultData!;
    },

    async updateContract(
        id: string,
        updates: Partial<Omit<Contract, 'id' | 'created_at' | 'tenant' | 'room'>>
    ): Promise<Contract> {
        const contractRef = doc(db, 'contracts', id);
        let resultData: Contract | undefined;

        await runTransaction(db, async (tx) => {
            const contractSnap = await tx.get(contractRef);
            if (!contractSnap.exists()) throw new Error('Contract not found');
            const original = withId<Contract>(contractSnap as any);

            const nextRoomId = updates.room_id || original.room_id;
            const nextTenantId = updates.tenant_id || original.tenant_id;
            const nextStatus = updates.status || original.status;
            const roomChanged = !!updates.room_id && updates.room_id !== original.room_id;
            const willActivate = nextStatus === 'active';
            const willValidateRoom = willActivate && (roomChanged || original.status !== 'active');
            const willDeactivate =
                updates.status === 'terminated' || updates.status === 'expired' || updates.status === 'renewed';

            // Firestore transactions require every read before any write.
            const nextRoomSnap = willValidateRoom ? await tx.get(doc(db, 'rooms', nextRoomId)) : null;
            if (willValidateRoom) {
                if (!nextRoomSnap!.exists()) throw new Error('ไม่พบห้องพักที่เลือก');
                if (nextRoomSnap!.data()!.status !== 'available') {
                    throw new Error('ห้องพักที่เลือกไม่ว่าง กรุณาเลือกห้องว่างเท่านั้น');
                }
            }
            const tenantSnap = willActivate ? await tx.get(doc(db, 'tenants', nextTenantId)) : null;

            const now = nowIso();
            const updatedFields = { ...updates, updated_at: now };
            tx.update(contractRef, updatedFields);

            if (roomChanged) {
                tx.update(doc(db, 'rooms', original.room_id), {
                    status: 'available',
                    current_tenant_id: null,
                    current_tenant_uid: null,
                    updated_at: now,
                });
            }

            if (willActivate) {
                const tenantUid = tenantSnap?.exists() ? tenantSnap.data()!.user_id ?? null : null;
                tx.update(doc(db, 'rooms', nextRoomId), {
                    status: 'occupied',
                    current_tenant_id: nextTenantId,
                    current_tenant_uid: tenantUid,
                    updated_at: now,
                });
                tx.update(doc(db, 'tenants', nextTenantId), {
                    status: 'active',
                    move_in_date: updates.start_date || original.start_date,
                    current_room_id: nextRoomId,
                    updated_at: now,
                });
            }

            if (willDeactivate) {
                tx.update(doc(db, 'rooms', nextRoomId), {
                    status: 'available',
                    current_tenant_id: null,
                    current_tenant_uid: null,
                    updated_at: now,
                });
                if (updates.status === 'terminated' || updates.status === 'expired') {
                    tx.update(doc(db, 'tenants', nextTenantId), {
                        status: 'inactive',
                        current_room_id: null,
                        move_out_date: now,
                        updated_at: now,
                    });
                }
            }

            resultData = { ...original, ...updatedFields, id } as unknown as Contract;
        });

        return resultData!;
    },

    async renewContract(id: string, renewalData: RenewalData): Promise<Contract> {
        const original = await contractService.getContract(id);
        if (!original) throw new Error('Contract not found');

        await contractService.updateContract(id, { status: 'renewed' as ContractStatus });

        return contractService.createContract({
            tenant_id: original.tenant_id,
            room_id: original.room_id,
            start_date: original.end_date,
            end_date: renewalData.end_date,
            monthly_rent: renewalData.monthly_rent || original.monthly_rent,
            deposit_amount: renewalData.deposit_amount || original.deposit_amount,
            status: 'active' as ContractStatus,
        });
    },

    async transferContract(id: string, transferData: TransferData): Promise<Contract> {
        const contractRef = doc(db, 'contracts', id);
        let resultData: Contract | undefined;

        await runTransaction(db, async (tx) => {
            const contractSnap = await tx.get(contractRef);
            if (!contractSnap.exists()) throw new Error('Contract not found');
            const contract = withId<Contract>(contractSnap as any);

            const newRoomSnap = await tx.get(doc(db, 'rooms', transferData.new_room_id));
            if (!newRoomSnap.exists()) throw new Error('ไม่พบห้องพักที่เลือก');
            if (newRoomSnap.data()!.status !== 'available') {
                throw new Error('ห้องพักที่เลือกไม่ว่าง กรุณาเลือกห้องว่างเท่านั้น');
            }

            const now = nowIso();
            const updatedFields = { room_id: transferData.new_room_id, updated_at: now };
            tx.update(contractRef, updatedFields);
            tx.update(doc(db, 'rooms', contract.room_id), {
                status: 'available',
                current_tenant_id: null,
                current_tenant_uid: null,
                updated_at: now,
            });
            tx.update(doc(db, 'rooms', transferData.new_room_id), {
                status: 'occupied',
                current_tenant_id: contract.tenant_id,
                current_tenant_uid: (contract as any).tenant_uid ?? null,
                updated_at: now,
            });
            tx.update(doc(db, 'tenants', contract.tenant_id), {
                status: 'active',
                move_in_date: transferData.transfer_date,
                current_room_id: transferData.new_room_id,
                updated_at: now,
            });

            resultData = { ...contract, ...updatedFields } as unknown as Contract;
        });

        return resultData!;
    },

    async cancelContract(id: string, cancellationData: CancellationData): Promise<Contract> {
        const contractRef = doc(db, 'contracts', id);
        let resultData: Contract | undefined;

        await runTransaction(db, async (tx) => {
            const contractSnap = await tx.get(contractRef);
            if (!contractSnap.exists()) throw new Error('Contract not found');
            const contract = withId<Contract>(contractSnap as any);

            const now = nowIso();
            const updatedFields = { status: 'terminated' as ContractStatus, updated_at: now };
            tx.update(contractRef, updatedFields);
            tx.update(doc(db, 'rooms', contract.room_id), {
                status: 'available',
                current_tenant_id: null,
                current_tenant_uid: null,
                updated_at: now,
            });
            tx.update(doc(db, 'tenants', contract.tenant_id), {
                status: 'inactive',
                current_room_id: null,
                move_out_date: cancellationData.cancellation_date,
                updated_at: now,
            });

            resultData = { ...contract, ...updatedFields } as unknown as Contract;
        });

        if (cancellationData.refund_deposit) {
            console.log('TODO: Create deposit refund payment');
        }

        return resultData!;
    },

    async getContractStats(): Promise<ContractStats> {
        const snap = await getDocs(collection(db, 'contracts'));
        const contracts = snap.docs.map((d) => d.data() as { status: ContractStatus; end_date: string });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysUntilEndDate = (endDate: string) => {
            const datePart = endDate.split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);
            const end = year && month && day ? new Date(year, month - 1, day) : new Date(endDate);
            end.setHours(0, 0, 0, 0);
            return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        };

        const endDateValue = (endDate: string) => {
            const datePart = endDate.split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);
            const end = year && month && day ? new Date(year, month - 1, day) : new Date(endDate);
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

        const activeContracts = contracts.filter((c) => c.status === 'active');

        return {
            total: contracts.length,
            active: activeContracts.length,
            expired: contracts.filter((c) => c.status === 'expired').length,
            terminated: contracts.filter((c) => c.status === 'terminated').length,
            renewed: contracts.filter((c) => c.status === 'renewed').length,
            remainingFourMonths: activeContracts.filter((c) => isDueWithinMonths(c.end_date, 4)).length,
            remainingTwoMonths: activeContracts.filter((c) => isDueWithinMonths(c.end_date, 2)).length,
            expiringSoon: activeContracts.filter((c) => {
                const days = daysUntilEndDate(c.end_date);
                return days > 0 && days <= 30;
            }).length,
            expiredByDate: activeContracts.filter((c) => daysUntilEndDate(c.end_date) <= 0).length,
        };
    },

    async getExpiringContracts(days: number = 30): Promise<Contract[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const snap = await getDocs(
            query(
                collection(db, 'contracts'),
                where('status', '==', 'active'),
                where('end_date', '<=', futureDate.toISOString()),
                where('end_date', '>=', new Date().toISOString()),
                orderBy('end_date', 'asc')
            )
        );

        return attachRelations(snap.docs.map((d) => withId<Contract>(d)));
    },
};
