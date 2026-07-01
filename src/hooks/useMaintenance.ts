import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceFormData, MaintenanceStatus } from '../types';
import { toaster } from '../components/ui/toaster';

export const useMaintenanceRequests = (status?: string, searchTerm?: string) => {
    return useQuery({
        queryKey: ['maintenance-requests', status, searchTerm],
        queryFn: () => maintenanceService.getMaintenanceRequests(status, searchTerm),
    });
};

export const useCreateMaintenanceRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ data, images }: { data: MaintenanceFormData; images?: File[] }) =>
            maintenanceService.createMaintenanceRequest(data, images),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            toaster.create({
                title: 'สร้างรายการแจ้งซ่อมสำเร็จ',
                type: 'success',
            });
        },
        onError: (error: any) => {
            console.error('Error creating maintenance request:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถสร้างรายการแจ้งซ่อมได้',
                type: 'error',
            });
        },
    });
};

export const useUpdateMaintenanceStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
            maintenanceService.updateStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            toaster.create({
                title: 'อัปเดตสถานะสำเร็จ',
                type: 'success',
            });
        },
        onError: (error: any) => {
            console.error('Error updating status:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถอัปเดตสถานะได้',
                type: 'error',
            });
        },
    });
};
