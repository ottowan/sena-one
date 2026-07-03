import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleService, type VehicleRegistryFilters } from '../services/vehicleService';
import type { VehicleRegistrationFormData } from '../types';
import { toaster } from '../components/ui/toaster';

const vehicleKeys = {
    all: ['vehicle-registry'] as const,
    list: (filters?: VehicleRegistryFilters) => [...vehicleKeys.all, 'list', filters] as const,
};

export function useVehicleRegistry(filters?: VehicleRegistryFilters) {
    return useQuery({
        queryKey: vehicleKeys.list(filters),
        queryFn: () => vehicleService.getVehicles(filters),
    });
}

export function useAddVehicles() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ roomId, vehicles }: { roomId: string; vehicles: VehicleRegistrationFormData[] }) =>
            vehicleService.createVehicles(roomId, vehicles),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
            toaster.create({
                title: 'สำเร็จ',
                description: 'เพิ่มข้อมูลรถเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถเพิ่มข้อมูลรถได้',
                type: 'error',
            });
        },
    });
}

export function useUpdateVehicle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: Partial<VehicleRegistrationFormData> & { room_id?: string };
        }) => vehicleService.updateVehicle(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
            toaster.create({
                title: 'สำเร็จ',
                description: 'บันทึกข้อมูลรถเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถบันทึกข้อมูลรถได้',
                type: 'error',
            });
        },
    });
}

export function useDeleteVehicle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => vehicleService.deleteVehicle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
            toaster.create({
                title: 'สำเร็จ',
                description: 'ลบข้อมูลรถเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถลบข้อมูลรถได้',
                type: 'error',
            });
        },
    });
}
