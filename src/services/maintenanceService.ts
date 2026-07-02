import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { fetchByIds, nowIso, withId } from '../lib/firestoreUtils';
import type { MaintenanceFormData, MaintenanceRequest, MaintenanceStatus } from '../types';

async function attachRelations(requests: MaintenanceRequest[]): Promise<MaintenanceRequest[]> {
    const tenantIds = requests.map((r) => r.tenant_id);
    const directRoomIds = requests.map((r) => r.room_id);

    const tenantById = await fetchByIds<any>('tenants', tenantIds);
    // Nested embed (tenant.room via tenant.current_room_id) needs a second
    // fan-out pass once tenant docs are known - Firestore has no server-side
    // joins, so this mirrors the old server's two-level relation attach.
    const tenantRoomIds = [...tenantById.values()].map((t) => t.current_room_id).filter(Boolean);
    const roomById = await fetchByIds<any>('rooms', [...directRoomIds, ...tenantRoomIds]);

    return requests.map((request) => {
        const tenant = tenantById.get(request.tenant_id);
        return {
            ...request,
            room: roomById.get(request.room_id),
            tenant: tenant
                ? { ...tenant, room: tenant.current_room_id ? roomById.get(tenant.current_room_id) : undefined }
                : undefined,
        };
    });
}

export const maintenanceService = {
    getMaintenanceRequests: async (status?: string, searchTerm?: string): Promise<MaintenanceRequest[]> => {
        const constraints = status && status !== 'all' ? [where('status', '==', status)] : [];
        const snap = await getDocs(
            query(collection(db, 'maintenance_requests'), ...constraints, orderBy('created_at', 'desc'))
        );
        let requests = await attachRelations(snap.docs.map((d) => withId<MaintenanceRequest>(d)));

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            requests = requests.filter(
                (req) =>
                    req.title.toLowerCase().includes(lowerTerm) ||
                    req.description.toLowerCase().includes(lowerTerm) ||
                    req.tenant?.full_name.toLowerCase().includes(lowerTerm) ||
                    req.room?.room_number.toLowerCase().includes(lowerTerm)
            );
        }

        return requests;
    },

    getMaintenanceRequest: async (id: string): Promise<MaintenanceRequest> => {
        const snap = await getDoc(doc(db, 'maintenance_requests', id));
        if (!snap.exists()) throw new Error('Maintenance request not found');
        const [request] = await attachRelations([withId<MaintenanceRequest>(snap as any)]);
        return request;
    },

    createMaintenanceRequest: async (data: MaintenanceFormData, images?: File[]): Promise<MaintenanceRequest> => {
        // Resolve tenant_id/tenant_uid from the room's own denormalized
        // current_tenant fields (kept in sync by contractService's
        // transactions) rather than querying `contracts` directly: a tenant
        // caller can only ever `get()` a single room document under the
        // Security Rules (allowed when they own it), not run an
        // unconstrained `contracts` list query - a single-document read
        // here keeps this working for both admin and tenant callers.
        const roomSnap = await getDoc(doc(db, 'rooms', data.room_id));
        if (!roomSnap.exists() || !roomSnap.data().current_tenant_id) {
            throw new Error('Cannot create maintenance request: No active tenant found for this room.');
        }
        const room = roomSnap.data();
        const tenantId = room.current_tenant_id as string;
        const tenantUid = (room.current_tenant_uid as string | null) ?? null;

        const uploadedImages = images?.length
            ? await Promise.all(images.map((file) => maintenanceService.uploadMaintenanceImage(file)))
            : [];

        const requestRef = doc(collection(db, 'maintenance_requests'));
        const now = nowIso();
        const payload = {
            room_id: data.room_id,
            tenant_id: tenantId,
            tenant_uid: tenantUid,
            title: data.title,
            description: data.description,
            priority: data.priority,
            images: [...(data.images || []), ...uploadedImages],
            status: 'pending',
            created_at: now,
            updated_at: now,
        };
        await setDoc(requestRef, payload);
        return { id: requestRef.id, ...payload } as unknown as MaintenanceRequest;
    },

    updateMaintenanceRequest: async (id: string, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> => {
        await updateDoc(doc(db, 'maintenance_requests', id), { ...updates, updated_at: nowIso() } as Record<string, unknown>);
        const updated = await getDoc(doc(db, 'maintenance_requests', id));
        return withId<MaintenanceRequest>(updated as any);
    },

    updateStatus: async (id: string, status: MaintenanceStatus): Promise<MaintenanceRequest> => {
        return maintenanceService.updateMaintenanceRequest(id, { status });
    },

    deleteMaintenanceRequest: async (id: string): Promise<void> => {
        await deleteDoc(doc(db, 'maintenance_requests', id));
    },

    uploadMaintenanceImage: async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const storageRef = ref(storage, `maintenance-images/${fileName}`);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    },
};
