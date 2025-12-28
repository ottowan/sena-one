import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingService } from '../services/settingService';
import { toaster } from '../components/ui/toaster';

export const useRentRates = () => {
    return useQuery({
        queryKey: ['rent-rates'],
        queryFn: () => settingService.getRentRates(),
    });
};

export const useUpdateRentRate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ position, amount, commonFee }: { position: string; amount: number; commonFee: number }) =>
            settingService.updateRentRate(position, amount, commonFee),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rent-rates'] });
        },
        onError: (error: any) => {
            console.error('Error updating rent rate:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาดในการบันทึกค่าเช่า',
                type: 'error',
            });
        },
    });
};

export const useAppSettings = () => {
    return useQuery({
        queryKey: ['app-settings'],
        queryFn: () => settingService.getAppSettings(),
    });
};

export const useUpdateAppSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: any) => settingService.updateAppSettings(settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['app-settings'] });
            toaster.create({
                title: 'บันทึกการตั้งค่าระบบเรียบร้อย',
                type: 'success',
            });
        },
        onError: (error: any) => {
            console.error('Error updating app settings:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาดในการบันทึก',
                type: 'error',
            });
        },
    });
};
