import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomService, type RoomFilters } from '../services/roomService';
import type { Room, RoomEquipmentItem } from '../types';
import { toaster } from '../components/ui/toaster';

export const useRooms = (filters?: RoomFilters) => {
    return useQuery({
        queryKey: ['rooms', filters],
        queryFn: () => roomService.getRooms(filters),
    });
};

export const useRoom = (id: string) => {
    return useQuery({
        queryKey: ['room', id],
        queryFn: () => roomService.getRoom(id),
        enabled: !!id,
    });
};

export const useRoomStats = () => {
    return useQuery({
        queryKey: ['room-stats'],
        queryFn: () => roomService.getRoomStats(),
    });
};

export const useCreateRoom = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<Room, 'id' | 'created_at' | 'updated_at'>) =>
            roomService.createRoom(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            toaster.create({
                title: 'สร้างห้องสำเร็จ',
                description: 'เพิ่มห้องพักใหม่เรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถสร้างห้องได้',
                type: 'error',
            });
        },
    });
};

export const useUpdateRoom = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Room> }) =>
            roomService.updateRoom(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            toaster.create({
                title: 'อัปเดตห้องสำเร็จ',
                description: 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถอัปเดตห้องได้',
                type: 'error',
            });
        },
    });
};

export const useDeleteRoom = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => roomService.deleteRoom(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            toaster.create({
                title: 'ลบห้องสำเร็จ',
                description: 'ลบห้องพักออกจากระบบแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถลบห้องได้',
                type: 'error',
            });
        },
    });
};

export const useForceReleaseRoom = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => roomService.forceReleaseRoom(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            toaster.create({
                title: 'คืนห้องสำเร็จ',
                description: 'สถานะห้องถูกปรับเป็นว่างเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถคืนห้องได้',
                type: 'error',
            });
        },
    });
};

export const useUpdateRoomEquipment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, equipment }: { id: string; equipment: RoomEquipmentItem[] }) =>
            roomService.updateRoomEquipment(id, equipment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toaster.create({
                title: 'สำเร็จ',
                description: 'บันทึกรายการครุภัณฑ์เรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถบันทึกรายการครุภัณฑ์ได้',
                type: 'error',
            });
        },
    });
};

export const useSeedDefaultEquipment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => roomService.seedDefaultEquipment(),
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            toaster.create({
                title: 'สำเร็จ',
                description: `เพิ่มรายการครุภัณฑ์เริ่มต้นให้ ${count} ห้อง`,
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถเพิ่มรายการครุภัณฑ์ได้',
                type: 'error',
            });
        },
    });
};
