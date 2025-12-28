import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantService, type TenantFilters } from '../services/tenantService';
import type { Tenant } from '../types';
import { toaster } from '../components/ui/toaster';

// Query keys
const tenantKeys = {
    all: ['tenants'] as const,
    lists: () => [...tenantKeys.all, 'list'] as const,
    list: (filters?: TenantFilters) => [...tenantKeys.lists(), filters] as const,
    details: () => [...tenantKeys.all, 'detail'] as const,
    detail: (id: string) => [...tenantKeys.details(), id] as const,
    stats: () => [...tenantKeys.all, 'stats'] as const,
};

// ดึงรายการผู้เช่า
export function useTenants(filters?: TenantFilters) {
    return useQuery({
        queryKey: tenantKeys.list(filters),
        queryFn: () => tenantService.getTenants(filters),
    });
}

// ดึงผู้เช่าเดียว
export function useTenant(id: string) {
    return useQuery({
        queryKey: tenantKeys.detail(id),
        queryFn: () => tenantService.getTenant(id),
        enabled: !!id,
    });
}

// ดึงสถิติผู้เช่า
export function useTenantStats() {
    return useQuery({
        queryKey: tenantKeys.stats(),
        queryFn: () => tenantService.getTenantStats(),
    });
}

// สร้างผู้เช่าใหม่
export function useCreateTenant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>) =>
            tenantService.createTenant(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
            queryClient.invalidateQueries({ queryKey: tenantKeys.stats() });
            toaster.create({
                title: 'สำเร็จ',
                description: 'เพิ่มผู้เช่าเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถเพิ่มผู้เช่าได้',
                type: 'error',
            });
        },
    });
}

// อัปเดตผู้เช่า
export function useUpdateTenant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Tenant, 'id' | 'created_at'>> }) =>
            tenantService.updateTenant(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
            queryClient.invalidateQueries({ queryKey: tenantKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: tenantKeys.stats() });
            toaster.create({
                title: 'สำเร็จ',
                description: 'อัปเดตข้อมูลผู้เช่าเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถอัปเดตข้อมูลผู้เช่าได้',
                type: 'error',
            });
        },
    });
}

// ลบผู้เช่า
export function useDeleteTenant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => tenantService.deleteTenant(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
            queryClient.invalidateQueries({ queryKey: tenantKeys.stats() });
            toaster.create({
                title: 'สำเร็จ',
                description: 'ลบผู้เช่าเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถลบผู้เช่าได้',
                type: 'error',
            });
        },
    });
}
