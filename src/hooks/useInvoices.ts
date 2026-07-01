import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../services/invoiceService';
import type { InvoiceFormData } from '../types';
import { toaster } from '../components/ui/toaster';

interface UseInvoicesOptions {
    searchTerm?: string;
    status?: string;
    month?: string;
}

export const useInvoices = (options: UseInvoicesOptions = {}) => {
    return useQuery({
        queryKey: ['invoices', options],
        queryFn: () => invoiceService.getInvoices(options.searchTerm, options.status, options.month),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });
};

export const useInvoice = (id: string) => {
    return useQuery({
        queryKey: ['invoice', id],
        queryFn: () => invoiceService.getInvoice(id),
        enabled: !!id,
    });
};

export const useCreateInvoice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: InvoiceFormData) => invoiceService.createInvoice(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toaster.create({
                title: 'สร้างใบแจ้งหนี้สำเร็จ',
                type: 'success',
            });
        },
        onError: (error: any) => {
            console.error('Error creating invoice:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถสร้างใบแจ้งหนี้ได้',
                type: 'error',
            });
        },
    });
};

export const useUpdateInvoiceStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            invoiceService.updateInvoiceStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toaster.create({
                title: 'อัปเดตสถานะสำเร็จ',
                type: 'success',
            });
        },
        onError: (error: any) => {
            console.error('Error updating invoice status:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถอัปเดตสถานะได้',
                type: 'error',
            });
        },
    });
};

export const useDeleteInvoice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => invoiceService.deleteInvoice(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toaster.create({
                title: 'ลบใบแจ้งหนี้สำเร็จ',
                type: 'success',
            });
        },
        onError: (error: any) => {
            console.error('Error deleting invoice:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถลบใบแจ้งหนี้ได้',
                type: 'error',
            });
        },
    });
};
export const useLastMeterReading = (roomId: string) => {
    return useQuery({
        queryKey: ['last-meter-reading', roomId],
        queryFn: () => invoiceService.getLastMeterReading(roomId),
        enabled: !!roomId,
    });
};

export const useMeterReadingByMonth = (roomId: string, month: string) => {
    return useQuery({
        queryKey: ['meter-reading-month', roomId, month],
        queryFn: () => invoiceService.getMeterReadingByMonth(roomId, month),
        enabled: !!roomId && !!month,
        retry: false,
    });
};
