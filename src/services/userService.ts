import { pgliteClient } from '../lib/pgliteClient';
import type { Profile, UserRole } from '../types';

export const userService = {
    // Determine user role logic (helper)
    // Note: In pgliteClient, creating a user usually requires SignUp.
    // If we want to create a user WITHOUT logging out the admin, we need a separate client instance
    // that doesn't persist the session to the same storage key or uses memory storage.

    createUserWithPhone: async (phone: string, password: string, fullName: string, role: UserRole) => {
        // ตรวจสอบว่าเบอร์โทรซ้ำหรือไม่
        const { data: existingUser } = await pgliteClient
            .from('users')
            .select('phone')
            .eq('phone', phone)
            .single();

        if (existingUser) {
            throw new Error('เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว');
        }

        // สร้างผู้ใช้ใหม่ผ่าน RPC function
        const { data, error } = await pgliteClient
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
        const { data: userId, error } = await pgliteClient
            .rpc('create_user', {
                phone_input: phone,
                password_input: password,
                full_name_input: fullName,
                role_input: role,
                email_input: email,
            });

        if (error) throw error;

        return { id: userId, email, phone, full_name: fullName, role };
    },

    updateUser: async (id: string, updates: Partial<Profile>) => {
        const { error } = await pgliteClient
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    },

    resetUserPassword: async (userId: string, newPassword: string) => {
        try {
            const { data, error } = await pgliteClient
                .rpc('update_user_password', {
                    user_id_input: userId,
                    new_password_input: newPassword
                });

            if (error) throw error;

            return {
                message: `รหัสผ่านใหม่คือ: ${newPassword}`,
                tempPassword: newPassword
            };
        } catch (error: any) {
            console.error('Update password error:', error);
            throw new Error('ไม่สามารถเปลี่ยนรหัสผ่านได้');
        }
    },

    deleteUser: async (id: string) => {
        const usersResult = await pgliteClient
            .from('users')
            .delete()
            .eq('id', id);

        if (usersResult.error) throw usersResult.error;

        const { error } = await pgliteClient
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

    getTenantUserOptions: async (): Promise<Array<{ id: string; full_name: string; phone: string; email?: string }>> => {
        const { data, error } = await pgliteClient
            .from('users')
            .select('id, full_name, phone, role')
            .eq('role', 'tenant')
            .order('full_name');

        if (error) {
            console.error('Error fetching tenant users:', error);
            throw error;
        }

        const { data: linkedTenants, error: tenantError } = await pgliteClient
            .from('tenants')
            .select('id, user_id, current_room_id')
            .neq('user_id', '');

        if (tenantError) {
            console.error('Error fetching linked tenants:', tenantError);
            throw tenantError;
        }

        const tenantIds = (linkedTenants || []).map((tenant: any) => tenant.id).filter(Boolean);
        const { data: activeContracts, error: contractError } = tenantIds.length
            ? await pgliteClient
                .from('contracts')
                .select('tenant_id, room_id')
                .in('tenant_id', tenantIds)
                .eq('status', 'active')
            : { data: [], error: null };

        if (contractError) {
            console.error('Error fetching linked tenant contracts:', contractError);
            throw contractError;
        }

        const activeContractTenantIds = new Set((activeContracts || []).map((contract: any) => contract.tenant_id));
        const unavailableUserIds = new Set(
            (linkedTenants || [])
                .filter((tenant: any) => tenant.user_id || tenant.current_room_id || activeContractTenantIds.has(tenant.id))
                .map((tenant: any) => tenant.user_id)
                .filter(Boolean)
        );

        return (data || []).filter((user: any) => !unavailableUserIds.has(user.id)).map((user: any) => ({
            id: user.id,
            full_name: user.full_name,
            phone: user.phone,
        }));
    },

    searchUsers: async (searchTerm: string): Promise<Profile[]> => {
        console.log('Searching users with term:', searchTerm);
        let query = pgliteClient
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
