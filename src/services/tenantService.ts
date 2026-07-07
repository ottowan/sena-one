import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchByIds, fetchWhereIn, nowIso, stripUndefined, toFirestoreUpdate, withId } from '../lib/firestoreUtils';
import { normalizePhone } from './authService';
import type { Tenant, VehicleRegistration } from '../types';

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
    async getTenants(filters?: TenantFilters): Promise<Tenant[]> {
        const constraints = [];
        if (filters?.status) constraints.push(where('status', '==', filters.status));
        if (filters?.roomId) constraints.push(where('current_room_id', '==', filters.roomId));

        const snap = await getDocs(query(collection(db, 'tenants'), ...constraints, orderBy('created_at', 'desc')));
        let tenants = snap.docs.map((d) => withId<Tenant>(d));

        // Firestore has no cross-field OR/ILIKE - filter the already-fetched
        // page client-side, same as the old server's hand-rolled matchesOr().
        if (filters?.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            tenants = tenants.filter(
                (tenant) =>
                    tenant.full_name?.toLowerCase().includes(term) ||
                    tenant.phone?.toLowerCase().includes(term) ||
                    tenant.id_card_number?.toLowerCase().includes(term)
            );
        }

        const tenantIds = tenants.map((tenant) => tenant.id);
        const contracts = await fetchWhereIn<{ id: string; tenant_id: string; room_id: string }>(
            'contracts',
            'tenant_id',
            tenantIds,
            where('status', '==', 'active')
        );
        const roomIds = [...new Set(contracts.map((contract) => contract.room_id).filter(Boolean))];
        const roomById = await fetchByIds<{ id: string; room_number: string; room_type: string }>('rooms', roomIds);
        const registryVehicles = await fetchWhereIn<VehicleRegistration>('vehicles', 'room_id', roomIds);
        const vehiclesByRoom = new Map<string, VehicleRegistration[]>();
        registryVehicles.forEach((vehicle) => {
            const list = vehiclesByRoom.get(vehicle.room_id) || [];
            list.push(vehicle);
            vehiclesByRoom.set(vehicle.room_id, list);
        });
        const contractByTenant = new Map(contracts.map((contract) => [contract.tenant_id, contract]));

        let tenantsWithRooms = tenants.map((tenant) => {
            const contract = contractByTenant.get(tenant.id);
            const roomId = contract?.room_id;
            return {
                ...tenant,
                room: roomId ? roomById.get(roomId) || null : null,
                registered_vehicles: roomId ? vehiclesByRoom.get(roomId) || [] : [],
            };
        });

        if (filters?.vehiclePlate) {
            const searchPlate = filters.vehiclePlate.toLowerCase();
            tenantsWithRooms = tenantsWithRooms.filter((tenant) => {
                const legacyMatch = tenant.vehicles?.some((vehicle) =>
                    vehicle.plate?.toLowerCase().includes(searchPlate)
                );
                const registryMatch = tenant.registered_vehicles?.some((vehicle) =>
                    vehicle.plate?.toLowerCase().includes(searchPlate)
                );
                return !!legacyMatch || !!registryMatch;
            });
        }

        // Tenants without an active contract have no room - keep them last,
        // sorted amongst themselves the old way (most recently created first).
        tenantsWithRooms.sort((a, b) => {
            if (!a.room && !b.room) return 0;
            if (!a.room) return 1;
            if (!b.room) return -1;
            return a.room.room_number.localeCompare(b.room.room_number, undefined, { numeric: true });
        });

        return tenantsWithRooms;
    },

    async getTenant(id: string): Promise<Tenant | null> {
        const snap = await getDoc(doc(db, 'tenants', id));
        if (!snap.exists()) return null;
        const data = withId<Tenant>(snap as any);

        const contractSnap = await getDocs(
            query(collection(db, 'contracts'), where('tenant_id', '==', id), where('status', '==', 'active'), limit(1))
        );
        const contract = contractSnap.docs[0]?.data() as { room_id: string } | undefined;
        const room = contract?.room_id
            ? await fetchByIds<{ id: string; room_number: string; room_type: string }>('rooms', [contract.room_id]).then(
                  (map) => map.get(contract.room_id) || null
              )
            : null;
        const registeredVehicles = contract?.room_id
            ? await fetchWhereIn<VehicleRegistration>('vehicles', 'room_id', [contract.room_id])
            : [];

        return { ...data, room, registered_vehicles: registeredVehicles };
    },

    async createTenant(tenant: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>): Promise<Tenant> {
        let userId: string | undefined;
        if (tenant.phone) {
            const user = await tenantService.findMatchingUser(tenant.phone);
            if (user) userId = user.id;
        }

        const tenantRef = doc(collection(db, 'tenants'));
        const now = nowIso();
        const payload = stripUndefined({ ...tenant, user_id: userId ?? null, created_at: now, updated_at: now } as Record<string, unknown>);
        await setDoc(tenantRef, payload);
        return { id: tenantRef.id, ...payload } as unknown as Tenant;
    },

    async updateTenant(id: string, updates: Partial<Omit<Tenant, 'id' | 'created_at'>>): Promise<Tenant> {
        await updateDoc(doc(db, 'tenants', id), toFirestoreUpdate({ ...updates, updated_at: nowIso() } as Record<string, unknown>));
        const updated = await getDoc(doc(db, 'tenants', id));
        return withId<Tenant>(updated as any);
    },

    async deleteTenant(id: string): Promise<void> {
        const activeContracts = await getDocs(
            query(collection(db, 'contracts'), where('tenant_id', '==', id), where('status', '==', 'active'))
        );

        const now = nowIso();
        await Promise.all(
            activeContracts.docs.map(async (contractDoc) => {
                const contract = contractDoc.data();
                await updateDoc(doc(db, 'rooms', contract.room_id), {
                    status: 'available',
                    current_tenant_id: null,
                    current_tenant_uid: null,
                    updated_at: now,
                });
                await updateDoc(contractDoc.ref, { status: 'terminated', updated_at: now });
            })
        );

        await deleteDoc(doc(db, 'tenants', id));
    },

    async getTenantStats(): Promise<TenantStats> {
        const snap = await getDocs(collection(db, 'tenants'));
        const tenants = snap.docs.map((d) => d.data());

        return {
            total: tenants.length,
            active: tenants.filter((t) => t.status === 'active').length,
            inactive: tenants.filter((t) => t.status === 'inactive').length,
            pending: tenants.filter((t) => t.status === 'pending').length,
            overdue: 0, // TODO: Calculate from payments table
            expiringSoon: 0, // TODO: Calculate from contracts table
        };
    },

    async checkPhoneDuplicate(phone: string, excludeId?: string): Promise<boolean> {
        const snap = await getDocs(query(collection(db, 'tenants'), where('phone', '==', phone)));
        return snap.docs.some((d) => d.id !== excludeId);
    },

    async checkIdCardDuplicate(idCard: string, excludeId?: string): Promise<boolean> {
        const snap = await getDocs(query(collection(db, 'tenants'), where('id_card_number', '==', idCard)));
        return snap.docs.some((d) => d.id !== excludeId);
    },

    // Login accounts and tenant business records are consolidated into a
    // single `users` collection post-migration (the old `profiles` table
    // fallback no longer applies).
    async findMatchingUser(phone: string): Promise<any | null> {
        const exact = await getDocs(query(collection(db, 'users'), where('phone', '==', phone), limit(1)));
        if (!exact.empty) return withId(exact.docs[0]);

        const cleanPhone = normalizePhone(phone);
        if (cleanPhone && cleanPhone !== phone) {
            const clean = await getDocs(query(collection(db, 'users'), where('phone', '==', cleanPhone), limit(1)));
            if (!clean.empty) return withId(clean.docs[0]);
        }

        return null;
    },

    async autoLinkUsersWithActiveContracts(tenantIds?: string[]): Promise<number> {
        const tenantRows = tenantIds?.length
            ? [...(await fetchByIds<any>('tenants', tenantIds)).values()]
            : (await getDocs(collection(db, 'tenants'))).docs.map((d) => withId<any>(d));

        const candidateTenants = tenantRows.filter((tenant) => !tenant.user_id && normalizePhone(tenant.phone));
        if (candidateTenants.length === 0) return 0;

        const candidateIds = candidateTenants.map((tenant) => tenant.id);
        const contracts = await fetchWhereIn<{ tenant_id: string; room_id: string }>(
            'contracts',
            'tenant_id',
            candidateIds,
            where('status', '==', 'active')
        );
        const activeContractByTenant = new Map(
            contracts.filter((c) => c.tenant_id && c.room_id).map((c) => [c.tenant_id, c])
        );
        const eligibleTenants = candidateTenants.filter((tenant) => activeContractByTenant.has(tenant.id));
        if (eligibleTenants.length === 0) return 0;

        const usersSnap = await getDocs(collection(db, 'users'));
        const allTenantsSnap = await getDocs(collection(db, 'tenants'));
        const linkedUserIds = new Set(
            allTenantsSnap.docs.map((d) => d.data().user_id).filter(Boolean)
        );

        const accountByPhone = new Map<string, any>();
        usersSnap.docs.forEach((d) => {
            const user = withId<any>(d);
            const phone = normalizePhone(user.phone);
            if (phone && !accountByPhone.has(phone)) accountByPhone.set(phone, user);
        });

        let linkedCount = 0;
        const now = nowIso();
        for (const tenant of eligibleTenants) {
            const account = accountByPhone.get(normalizePhone(tenant.phone));
            if (!account || linkedUserIds.has(account.id)) continue;

            const contract = activeContractByTenant.get(tenant.id);
            await updateDoc(doc(db, 'tenants', tenant.id), {
                user_id: account.id,
                current_room_id: tenant.current_room_id || contract?.room_id,
                status: tenant.status === 'pending' ? 'active' : tenant.status,
                updated_at: now,
            });

            linkedUserIds.add(account.id);
            linkedCount += 1;
        }

        return linkedCount;
    },

    async linkUser(tenantId: string, userId: string): Promise<void> {
        await updateDoc(doc(db, 'tenants', tenantId), { user_id: userId, updated_at: nowIso() });
    },
};
