import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    contractService,
    type ContractFilters,
    type RenewalData,
    type TransferData,
    type CancellationData,
} from '../services/contractService';
import type { Contract } from '../types';
import { toaster } from '../components/ui/toaster';

// Query keys
const contractKeys = {
    all: ['contracts'] as const,
    lists: () => [...contractKeys.all, 'list'] as const,
    list: (filters?: ContractFilters) => [...contractKeys.lists(), filters] as const,
    details: () => [...contractKeys.all, 'detail'] as const,
    detail: (id: string) => [...contractKeys.details(), id] as const,
    stats: () => [...contractKeys.all, 'stats'] as const,
    expiring: (days: number) => [...contractKeys.all, 'expiring', days] as const,
};

// ดึงรายการสัญญา
export function useContracts(filters?: ContractFilters) {
    return useQuery({
        queryKey: contractKeys.list(filters),
        queryFn: () => contractService.getContracts(filters),
    });
}

// ดึงสัญญาเดียว
export function useContract(id: string) {
    return useQuery({
        queryKey: contractKeys.detail(id),
        queryFn: () => contractService.getContract(id),
        enabled: !!id,
    });
}

// ดึงสถิติสัญญา
export function useContractStats() {
    return useQuery({
        queryKey: contractKeys.stats(),
        queryFn: () => contractService.getContractStats(),
    });
}

// ดึงสัญญาที่ใกล้หมดอายุ
export function useExpiringContracts(days: number = 30) {
    return useQuery({
        queryKey: contractKeys.expiring(days),
        queryFn: () => contractService.getExpiringContracts(days),
    });
}

// สร้างสัญญาใหม่
export function useCreateContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Omit<Contract, 'id' | 'created_at' | 'tenant' | 'room'>) =>
            contractService.createContract(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
            queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            toaster.create({
                title: 'สำเร็จ',
                description: 'สร้างสัญญาเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถสร้างสัญญาได้',
                type: 'error',
            });
        },
    });
}

// อัปเดตสัญญา
export function useUpdateContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: Partial<Omit<Contract, 'id' | 'created_at' | 'tenant' | 'room'>>;
        }) => contractService.updateContract(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
            queryClient.invalidateQueries({ queryKey: contractKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            toaster.create({
                title: 'สำเร็จ',
                description: 'อัปเดตสัญญาเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถอัปเดตสัญญาได้',
                type: 'error',
            });
        },
    });
}

// ต่อสัญญา
export function useRenewContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: RenewalData }) =>
            contractService.renewContract(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
            queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            toaster.create({
                title: 'สำเร็จ',
                description: 'ต่อสัญญาเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถต่อสัญญาได้',
                type: 'error',
            });
        },
    });
}

// โอนสัญญา
export function useTransferContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: TransferData }) =>
            contractService.transferContract(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
            queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            toaster.create({
                title: 'สำเร็จ',
                description: 'โอนสัญญาเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถโอนสัญญาได้',
                type: 'error',
            });
        },
    });
}

// ยกเลิกสัญญา
export function useCancelContract() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: CancellationData }) =>
            contractService.cancelContract(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
            queryClient.invalidateQueries({ queryKey: contractKeys.stats() });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room-stats'] });
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            toaster.create({
                title: 'สำเร็จ',
                description: 'ยกเลิกสัญญาเรียบร้อยแล้ว',
                type: 'success',
            });
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถยกเลิกสัญญาได้',
                type: 'error',
            });
        },
    });
}
