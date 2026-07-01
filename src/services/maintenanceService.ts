import { pgliteClient } from '../lib/pgliteClient';
import type { MaintenanceRequest, MaintenanceFormData, MaintenanceStatus } from '../types';

export const maintenanceService = {
    // Get all requests
    getMaintenanceRequests: async (
        status?: string,
        searchTerm?: string
    ): Promise<MaintenanceRequest[]> => {
        let query = pgliteClient
            .from('maintenance_requests')
            .select(`
                *,
                tenant:tenants(id, full_name, phone, room:rooms(room_number)),
                room:rooms(id, room_number)
            `)
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        let requests = data as MaintenanceRequest[];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            requests = requests.filter(req =>
                req.title.toLowerCase().includes(lowerTerm) ||
                req.description.toLowerCase().includes(lowerTerm) ||
                req.tenant?.full_name.toLowerCase().includes(lowerTerm) ||
                req.room?.room_number.toLowerCase().includes(lowerTerm)
            );
        }

        return requests;
    },

    // Get single request
    getMaintenanceRequest: async (id: string): Promise<MaintenanceRequest> => {
        const { data, error } = await pgliteClient
            .from('maintenance_requests')
            .select(`
                *,
                tenant:tenants(*),
                room:rooms(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as MaintenanceRequest;
    },

    // Create request
    createMaintenanceRequest: async (data: MaintenanceFormData, images?: File[]): Promise<MaintenanceRequest> => {
        // Need to find tenant_id for the room if not provided?
        // Usually, a request is linked to a room AND a tenant.
        // If the admin creates it, they pick a room. We should optionally auto-fill tenant_id from current tenant of that room.

        // This logic assumes we only create requests for Occupied rooms.

        let tenantId = '';

        const { data: roomData } = await pgliteClient
            .from('rooms')
            .select('current_tenant:tenants(id)')
            .eq('id', data.room_id)
            .single();

        if (roomData?.current_tenant) {
            // calculated property might be array or object depending on pgliteClient client version/types
            const tenant: any = roomData.current_tenant;
            if (Array.isArray(tenant) && tenant.length > 0) {
                tenantId = tenant[0].id;
            } else if (tenant?.id) {
                tenantId = tenant.id;
            }
        }

        // Revised Logic to find Tenant
        const { data: contractData } = await pgliteClient
            .from('contracts')
            .select('tenant_id')
            .eq('room_id', data.room_id)
            .eq('status', 'active')
            .single();

        if (contractData?.tenant_id) {
            tenantId = contractData.tenant_id;
        } else {
            // Note: If admin wants to log maintenance for empty room, we might skip tenant_id check? 
            // But schema says tenant_id is NOT NULL?
            // "tenant_id UUID NOT NULL REFERENCES tenants(id)"
            // So we MUST have a tenant.
            throw new Error("Cannot create maintenance request: No active tenant found for this room.");
        }

        const uploadedImages = images?.length
            ? await Promise.all(images.map((file) => maintenanceService.uploadMaintenanceImage(file)))
            : [];

        const { data: newRequest, error } = await pgliteClient
            .from('maintenance_requests')
            .insert({
                room_id: data.room_id,
                tenant_id: tenantId,
                title: data.title,
                description: data.description,
                priority: data.priority,
                images: [...(data.images || []), ...uploadedImages],
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return newRequest as MaintenanceRequest;
    },

    // Update request
    updateMaintenanceRequest: async (id: string, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> => {
        const { data, error } = await pgliteClient
            .from('maintenance_requests')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as MaintenanceRequest;
    },

    updateStatus: async (id: string, status: MaintenanceStatus): Promise<MaintenanceRequest> => {
        return maintenanceService.updateMaintenanceRequest(id, { status });
    },

    // Delete request
    deleteMaintenanceRequest: async (id: string): Promise<void> => {
        const { error } = await pgliteClient
            .from('maintenance_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
    // Upload image
    uploadMaintenanceImage: async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await pgliteClient.storage
            .from('maintenance-images')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = pgliteClient.storage
            .from('maintenance-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
