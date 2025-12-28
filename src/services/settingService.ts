import { supabase } from '../lib/supabase';
import type { RentRate, AppSettings } from '../types';

export const settingService = {
    // Get all rent rates
    getRentRates: async (): Promise<RentRate[]> => {
        const { data, error } = await supabase
            .from('position_rent_rates')
            .select('*')
            .order('position_level', { ascending: true }); // Or custom sort if we add sort_order

        if (error) {
            // Handle table not found (during migration) by returning defaults
            if (error.code === '42P01') {
                return [];
            }
            throw error;
        }

        return data as RentRate[];
    },

    // Update rent rate
    updateRentRate: async (position_level: string, rent_amount: number, common_fee: number): Promise<void> => {
        const { error } = await supabase
            .from('position_rent_rates')
            .upsert({ position_level, rent_amount, common_fee, updated_at: new Date().toISOString() })
            .select();

        if (error) throw error;
    },

    // Get App Settings
    getAppSettings: async (): Promise<AppSettings> => {
        const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .single();

        if (error) {
            // Handle table not found or empty (return default)
            if (error.code === '42P01' || error.code === 'PGRST116') {
                return {
                    id: 1,
                    common_fee: 0,
                    water_rate: 18,
                    water_maintenance_fee: 0,
                    electricity_rate: 8,
                    updated_at: new Date().toISOString()
                };
            }
            throw error;
        }

        return data as AppSettings;
    },

    // Update App Settings
    updateAppSettings: async (settings: Partial<AppSettings>): Promise<void> => {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ ...settings, id: 1, updated_at: new Date().toISOString() })
            .select();

        if (error) throw error;
    }
};
