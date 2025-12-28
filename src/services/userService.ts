import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const userService = {
    // Determine user role logic (helper)
    // Note: In Supabase, creating a user usually requires SignUp.
    // If we want to create a user WITHOUT logging out the admin, we need a separate client instance
    // that doesn't persist the session to the same storage key or uses memory storage.

    createUserWithPhone: async (phone: string, password: string, fullName: string, role: UserRole) => {
        // ตรวจสอบว่าเบอร์โทรซ้ำหรือไม่
        const { data: existingUser } = await supabase
            .from('users')
            .select('phone')
            .eq('phone', phone)
            .single();

        if (existingUser) {
            throw new Error('เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว');
        }

        // สร้างผู้ใช้ใหม่ผ่าน RPC function
        const { data, error } = await supabase
            .rpc('create_user', {
                phone_input: phone,
                password_input: password,
                full_name_input: fullName,
                role_input: role
            });

        if (error) {
            console.error('Create user error:', error);
            throw error;
        }

        return { id: data };
    },

    // เก็บฟังก์ชันเก่าไว้เพื่อ backward compatibility
    createUser: async (email: string, password: string, fullName: string, phone: string, role: UserRole) => {
        // Create a temporary client with no persistence to avoid overwriting Admin's session
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: false, // Don't save session
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });

        // 1. Sign Up the new user
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role // Save role in metadata as well for triggers if any
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        const userId = authData.user.id;

        // 2. Update the profile with additional details including email
        // Note: The 'profiles' row might be created by a trigger automatically.
        // We should wait a bit or try to update it. 
        // Or we can just insert/update manually if no trigger exists.
        // Assuming there IS a trigger (often is), we update. If not, we insert.
        // Let's try upsert.

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email: email,
                full_name: fullName,
                phone: phone,
                role: role,
                updated_at: new Date().toISOString()
            });

        if (profileError) {
            // Check if error is because user can't update other profiles?
            // Since we are Admin, RLS "Admins can view all profiles" and "Users can update own profile".
            // We need an "Admins can update all profiles" policy.
            // If that policy is missing, this will fail.
            // For now, let's assume we have or will add the policy.
            console.error('Profile update error:', profileError);
            throw profileError;
        }

        return authData.user;
    },

    updateUser: async (id: string, updates: Partial<Profile>) => {
        const { error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    },

    resetUserPassword: async (userId: string, newPassword: string) => {
        // ในระบบที่ไม่ใช้ email Admin สามารถรีเซ็ตรหัสผ่านโดยตรงได้
        // เนื่องจากต้องใช้ service role key ที่ไม่ควรเปิดเผยใน client
        // จึงจำลองอัปเดทผ่าน profile ให้ผู้ใช้รีเซ็ตเอง
        const tempPassword = `temp-${Date.now()}`;

        // อัปเดทข้อมูลใน profiles เพื่อแจ้งผู้ใช้ว่ารหัสผ่านถูกเปลี่ยน
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('phone, full_name')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            throw new Error('ไม่พบข้อมูลผู้ใช้');
        }

        // เก็บรหัสผ่านใหม่ไว้ใน profiles สำหรับผู้ใช้ที่ยังไม่ได้ตั้งรหัสผ่าน
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                temp_password: newPassword,
                password_reset_required: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        return {
            message: `รหัสผ่านใหม่คือ: ${newPassword}`,
            phone: profile.phone,
            tempPassword: newPassword
        };
    },

    deleteUser: async (id: string) => {
        // We can only delete the profile. The Auth User will remain but become "orphaned".
        // This is a limitation of client-side Admin.
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    notifyPasswordChange: async (phone: string, tempPassword: string) => {
        // ในระบบจริง ควรมีการส่ง SMS หรือ Line notification
        // สำหรับตอนนี้จะ return ข้อมูลเพื่อแสดงให้ admin
        console.log(`รหัสผ่านชั่วคราวสำหรับ ${phone}: ${tempPassword}`);
        return { phone, tempPassword };
    },

    searchUsers: async (searchTerm: string): Promise<Profile[]> => {
        console.log('Searching users with term:', searchTerm);
        let query = supabase
            .from('profiles')
            .select('*')
            .limit(20);

        if (searchTerm) {
            query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error searching users:', error);
            throw error; // Throw so UI can see it
        }
        console.log('Found users:', data?.length);
        return data || [];
    }
};
