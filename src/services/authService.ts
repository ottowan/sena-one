import { pgliteClient } from '../lib/pgliteClient';
import type { UserRole } from '../types';

export interface CustomUser {
    id: string;
    phone: string;
    full_name: string;
    role: UserRole;
}

const SESSION_KEY = 'sena_user_session';

export const authService = {
    // Login with username (room number format: sena301) and password
    login: async (username: string, password: string): Promise<{ user?: CustomUser; error?: string }> => {
        try {
            const { data, error } = await pgliteClient
                .rpc('verify_password', {
                    login_input: username,
                    password_input: password
                });

            if (error) throw error;

            if (!data || data.length === 0) {
                return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
            }

            const userData = data[0];
            const user: CustomUser = {
                id: userData.user_id,
                phone: userData.user_phone,
                full_name: userData.user_name,
                role: userData.user_role
            };

            // Save to localStorage
            localStorage.setItem(SESSION_KEY, JSON.stringify(user));

            return { user };
        } catch (error: any) {
            console.error('Login error:', error);
            return { error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
        }
    },

    // Logout
    logout: () => {
        localStorage.removeItem(SESSION_KEY);
    },

    // Get current user from localStorage
    getCurrentUser: (): CustomUser | null => {
        try {
            const userStr = localStorage.getItem(SESSION_KEY);
            if (!userStr) return null;
            return JSON.parse(userStr);
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    createUser: async (
        phone: string,
        password: string,
        fullName: string,
        role: UserRole = 'tenant' as UserRole
    ): Promise<{ userId?: string; error?: string }> => {
        try {
            const { data, error } = await pgliteClient
                .rpc('create_user', {
                    phone_input: phone,
                    password_input: password,
                    full_name_input: fullName,
                    role_input: role
                });

            if (error) throw error;

            return { userId: data };
        } catch (error: any) {
            console.error('Create user error:', error);
            return { error: error.message || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' };
        }
    },

    // Update user password
    updatePassword: async (userId: string, newPassword: string): Promise<{ error?: string }> => {
        try {
            const { error } = await pgliteClient
                .from('users')
                .update({
                    password_hash: pgliteClient.rpc('crypt', {
                        password: newPassword,
                        salt: pgliteClient.rpc('gen_salt', { type: 'bf' })
                    })
                })
                .eq('id', userId);

            if (error) throw error;

            return {};
        } catch (error: any) {
            console.error('Update password error:', error);
            return { error: error.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' };
        }
    }
};
