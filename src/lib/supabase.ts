import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ในไฟล์ .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions สำหรับ Storage
export const uploadFile = async (
    bucket: string,
    path: string,
    file: File
): Promise<{ url?: string; error?: string }> => {
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return { url: urlData.publicUrl };
    } catch (error: any) {
        return { error: error.message };
    }
};

export const deleteFile = async (
    bucket: string,
    path: string
): Promise<{ error?: string }> => {
    try {
        const { error } = await supabase.storage.from(bucket).remove([path]);
        if (error) throw error;
        return {};
    } catch (error: any) {
        return { error: error.message };
    }
};

export const getPublicUrl = (bucket: string, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};
