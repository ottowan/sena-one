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
    writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { fetchByIds, fetchWhereIn, nowIso, withId } from '../lib/firestoreUtils';
import type { Room, RoomStatus } from '../types';

export interface RoomFilters {
    status?: RoomStatus;
    floor?: number;
    searchTerm?: string;
}

async function roomHasActiveContract(roomId: string): Promise<boolean> {
    const snap = await getDocs(
        query(
            collection(db, 'contracts'),
            where('room_id', '==', roomId),
            where('status', '==', 'active'),
            limit(1)
        )
    );
    return !snap.empty;
}

function normalizeMonth(month: string): string {
    return month.length >= 7 ? month.slice(0, 7) : month;
}

export const roomService = {
    async getRooms(filters?: RoomFilters): Promise<Room[]> {
        const constraints = filters?.floor ? [where('floor', '==', filters.floor)] : [];
        const snap = await getDocs(query(collection(db, 'rooms'), ...constraints, orderBy('room_number', 'asc')));
        let rooms = snap.docs.map((d) => withId<Room>(d));

        if (filters?.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            rooms = rooms.filter((room) => room.room_number?.toLowerCase().includes(term));
        }

        const roomIds = rooms.map((room) => room.id);
        const contracts = await fetchWhereIn<{ id: string; room_id: string; tenant_id: string; monthly_rent: number }>(
            'contracts',
            'room_id',
            roomIds,
            where('status', '==', 'active')
        );

        const tenantIds = [...new Set(contracts.map((contract) => contract.tenant_id).filter(Boolean))];
        const tenantById = await fetchByIds<{ id: string; full_name: string; phone: string; position_level?: string }>(
            'tenants',
            tenantIds
        );

        const contractByRoom = new Map(contracts.map((contract) => [contract.room_id, contract]));

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

    async getRoom(id: string): Promise<Room> {
        const roomSnap = await getDoc(doc(db, 'rooms', id));
        if (!roomSnap.exists()) throw new Error('Room not found');
        const data = withId<Room>(roomSnap as any);

        const contracts = await getDocs(
            query(
                collection(db, 'contracts'),
                where('room_id', '==', id),
                where('status', '==', 'active'),
                limit(1)
            )
        );
        const contract = contracts.docs[0]?.data() as { monthly_rent: number; tenant_id: string } | undefined;
        const tenant = contract?.tenant_id
            ? await fetchByIds<{ id: string; full_name: string; phone: string; position_level?: string }>('tenants', [
                  contract.tenant_id,
              ]).then((map) => map.get(contract.tenant_id) || null)
            : null;

        return {
            ...data,
            status: contract ? 'occupied' : data.status,
            current_tenant_id: tenant?.id || data.current_tenant_id || null,
            has_active_contract: !!contract,
            current_tenant: tenant,
            current_rent: contract?.monthly_rent || null,
        } as Room;
    },

    async createRoom(roomData: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<Room> {
        const roomRef = doc(collection(db, 'rooms'));
        const now = nowIso();
        const payload = { ...roomData, current_tenant_uid: null, created_at: now, updated_at: now };
        await setDoc(roomRef, payload);
        return { id: roomRef.id, ...payload } as unknown as Room;
    },

    async updateRoom(id: string, roomData: Partial<Room>): Promise<Room> {
        if (await roomHasActiveContract(id)) {
            throw new Error('ห้องนี้มีสัญญาใช้งานอยู่ ไม่สามารถแก้ไขข้อมูลห้องพักได้');
        }

        const updates = { ...roomData, updated_at: nowIso() };
        await updateDoc(doc(db, 'rooms', id), updates as Record<string, unknown>);
        const updated = await getDoc(doc(db, 'rooms', id));
        return withId<Room>(updated as any);
    },

    async deleteRoom(id: string): Promise<void> {
        if (await roomHasActiveContract(id)) {
            throw new Error('ห้องนี้มีสัญญาใช้งานอยู่ ไม่สามารถลบห้องพักได้');
        }
        await deleteDoc(doc(db, 'rooms', id));
    },

    async getRoomStats() {
        const snap = await getDocs(collection(db, 'rooms'));
        const rooms = snap.docs.map((d) => ({ id: d.id, status: d.data().status as RoomStatus }));

        const roomIds = rooms.map((r) => r.id);
        const activeContracts = await fetchWhereIn<{ room_id: string }>(
            'contracts',
            'room_id',
            roomIds,
            where('status', '==', 'active')
        );
        const occupiedRoomIds = new Set(activeContracts.map((contract) => contract.room_id));
        const effectiveRooms = rooms.map((room) => ({
            ...room,
            status: occupiedRoomIds.has(room.id) ? 'occupied' : room.status,
        }));

        return {
            total: effectiveRooms.length,
            available: effectiveRooms.filter((r) => r.status === 'available').length,
            occupied: effectiveRooms.filter((r) => r.status === 'occupied').length,
            reserved: effectiveRooms.filter((r) => r.status === 'reserved').length,
            maintenance: effectiveRooms.filter((r) => r.status === 'maintenance').length,
        };
    },

    async uploadRoomImage(roomId: string, file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const path = `room-images/${roomId}/${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    },

    async deleteRoomImage(url: string): Promise<void> {
        try {
            await deleteObject(ref(storage, url));
        } catch (error) {
            console.error('Error deleting room image:', error);
        }
    },

    // Admin-triggered repair job (not a startup job - there's no server to run
    // it automatically anymore). Terminates orphaned contracts (tenant
    // deleted) and corrects room status drift.
    async syncRoomStatuses(): Promise<number> {
        const roomsSnap = await getDocs(collection(db, 'rooms'));
        const rooms = roomsSnap.docs.map((d) => ({
            id: d.id,
            status: d.data().status as RoomStatus,
            current_tenant_id: d.data().current_tenant_id as string | null,
        }));
        if (rooms.length === 0) return 0;

        const roomIds = rooms.map((r) => r.id);
        const activeContracts = await fetchWhereIn<{ id: string; room_id: string; tenant_id: string }>(
            'contracts',
            'room_id',
            roomIds,
            where('status', '==', 'active')
        );

        const tenantIds = activeContracts.map((c) => c.tenant_id);
        const existingTenants = await fetchByIds<{ id: string }>('tenants', tenantIds);

        let fixCount = 0;
        const batch = writeBatch(db);
        const now = nowIso();

        const contractsByRoom = new Map<string, typeof activeContracts>();
        activeContracts.forEach((contract) => {
            const list = contractsByRoom.get(contract.room_id) || [];
            list.push(contract);
            contractsByRoom.set(contract.room_id, list);
        });

        for (const room of rooms) {
            const contracts = contractsByRoom.get(room.id) || [];
            let hasValidContract = false;
            let validTenantId: string | null = null;

            for (const contract of contracts) {
                if (existingTenants.has(contract.tenant_id)) {
                    hasValidContract = true;
                    validTenantId = contract.tenant_id;
                } else {
                    batch.update(doc(db, 'contracts', contract.id), { status: 'terminated', updated_at: now });
                    fixCount += 1;
                }
            }

            if (hasValidContract) {
                if (room.status !== 'occupied' || room.current_tenant_id !== validTenantId) {
                    batch.update(doc(db, 'rooms', room.id), {
                        status: 'occupied',
                        current_tenant_id: validTenantId,
                        current_tenant_uid: null,
                        updated_at: now,
                    });
                    fixCount += 1;
                }
            } else if (room.status === 'occupied') {
                batch.update(doc(db, 'rooms', room.id), {
                    status: 'available',
                    current_tenant_id: null,
                    current_tenant_uid: null,
                    updated_at: now,
                });
                fixCount += 1;
            }
        }

        if (fixCount > 0) await batch.commit();
        return fixCount;
    },

    async forceReleaseRoom(roomId: string): Promise<void> {
        if (await roomHasActiveContract(roomId)) {
            throw new Error('This room has an active contract and cannot be released from the rooms page.');
        }

        const staleContracts = await getDocs(
            query(collection(db, 'contracts'), where('room_id', '==', roomId), where('status', '==', 'active'))
        );
        const now = nowIso();
        await Promise.all(
            staleContracts.docs.map((d) => updateDoc(d.ref, { status: 'terminated', updated_at: now }))
        );

        await updateDoc(doc(db, 'rooms', roomId), {
            status: 'available',
            current_tenant_id: null,
            current_tenant_uid: null,
            updated_at: now,
        });
    },

    async getMeterHistory(roomId: string, year: number) {
        const snap = await getDocs(
            query(
                collection(db, 'history_meter'),
                where('room_id', '==', roomId),
                where('month', '>=', `${year}-01`),
                where('month', '<', `${year + 1}-01`),
                orderBy('month', 'asc')
            )
        );
        return snap.docs.map((d) => d.data());
    },

    async updateMeterHistory(roomId: string, month: string, water: number, elec: number) {
        const normalizedMonth = normalizeMonth(month);
        const ref = doc(db, 'history_meter', `${roomId}_${normalizedMonth}`);
        const payload = {
            room_id: roomId,
            month: normalizedMonth,
            water_meter: water,
            electricity_meter: elec,
            updated_at: nowIso(),
        };
        await setDoc(ref, payload, { merge: true });
        return payload;
    },
};
