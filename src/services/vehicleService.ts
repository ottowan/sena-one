import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    updateDoc,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { nowIso, withId } from '../lib/firestoreUtils';
import { roomService } from './roomService';
import type { VehicleRegistration, VehicleRegistrationFormData } from '../types';

export interface VehicleRegistryFilters {
    plate?: string;
}

export const vehicleService = {
    async getVehicles(filters?: VehicleRegistryFilters): Promise<VehicleRegistration[]> {
        const snap = await getDocs(query(collection(db, 'vehicles'), orderBy('created_at', 'desc')));
        const vehicles = snap.docs.map((d) => withId<VehicleRegistration>(d));

        const rooms = await roomService.getRooms();
        const roomById = new Map(rooms.map((room) => [room.id, room]));

        let vehiclesWithRoom = vehicles.map((vehicle) => {
            const room = roomById.get(vehicle.room_id);
            return {
                ...vehicle,
                room: room
                    ? {
                          id: room.id,
                          room_number: room.room_number,
                          current_tenant_name: room.current_tenant?.full_name || null,
                      }
                    : undefined,
            };
        });

        if (filters?.plate) {
            const term = filters.plate.toLowerCase();
            vehiclesWithRoom = vehiclesWithRoom.filter((vehicle) => vehicle.plate?.toLowerCase().includes(term));
        }

        return vehiclesWithRoom;
    },

    async createVehicles(
        roomId: string,
        vehicles: VehicleRegistrationFormData[]
    ): Promise<void> {
        if (vehicles.length === 0) return;

        const batch = writeBatch(db);
        const now = nowIso();

        vehicles.forEach((vehicle) => {
            const ref = doc(collection(db, 'vehicles'));
            batch.set(ref, {
                room_id: roomId,
                type: vehicle.type,
                plate: vehicle.plate,
                province: vehicle.province,
                brand: vehicle.brand || null,
                color: vehicle.color || null,
                has_sticker: vehicle.has_sticker,
                created_at: now,
                updated_at: now,
            });
        });

        await batch.commit();
    },

    async updateVehicle(
        id: string,
        updates: Partial<VehicleRegistrationFormData> & { room_id?: string }
    ): Promise<void> {
        await updateDoc(doc(db, 'vehicles', id), { ...updates, updated_at: nowIso() });
    },

    async deleteVehicle(id: string): Promise<void> {
        await deleteDoc(doc(db, 'vehicles', id));
    },
};
