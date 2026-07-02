import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { createSecondaryAuthContext, db, functions } from '../lib/firebase';
import { normalizePhone } from './authService';
import { nowIso, withId } from '../lib/firestoreUtils';
import type { Profile, UserRole } from '../types';

async function createFirebaseAuthUser(email: string, password: string): Promise<string> {
    // Creating another user's Auth account on the *default* app would sign the
    // admin out of their own session. A throwaway secondary app instance lets
    // sign-up happen in isolation, with no Cloud Function/Admin SDK needed.
    const { auth: secondaryAuth, dispose } = createSecondaryAuthContext();
    try {
        const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        return credential.user.uid;
    } finally {
        await dispose();
    }
}

export const userService = {
    createUserWithPhone: async (phone: string, password: string, fullName: string, role: UserRole) => {
        const existing = await getDocs(query(collection(db, 'users'), where('phone', '==', phone)));
        if (!existing.empty) {
            throw new Error('เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว');
        }

        const syntheticEmail = `${crypto.randomUUID()}@sena-one.local`;
        const uid = await createFirebaseAuthUser(syntheticEmail, password);
        const normalizedPhone = normalizePhone(phone);
        const now = nowIso();

        await setDoc(doc(db, 'users', uid), {
            phone,
            normalized_phone: normalizedPhone,
            username: null,
            full_name: fullName,
            role,
            email: syntheticEmail,
            created_at: now,
            updated_at: now,
        });

        if (normalizedPhone) {
            await setDoc(doc(db, 'phone_lookup', normalizedPhone), { uid, email: syntheticEmail });
        }

        return { id: uid };
    },

    updateUser: async (id: string, updates: Partial<Profile>) => {
        await updateDoc(doc(db, 'users', id), {
            ...updates,
            updated_at: nowIso(),
        });
    },

    // Resetting *another* user's password needs the Admin SDK (the client
    // SDK can only change the currently signed-in user's own password) -
    // the one narrow reason this app runs a Cloud Function.
    resetUserPassword: async (userId: string, newPassword: string) => {
        try {
            const call = httpsCallable<{ uid: string; newPassword: string }, { ok: boolean }>(
                functions,
                'adminResetUserPassword'
            );
            await call({ uid: userId, newPassword });

            return {
                message: `รหัสผ่านใหม่คือ: ${newPassword}`,
                tempPassword: newPassword,
            };
        } catch (error: any) {
            console.error('Update password error:', error);
            throw new Error('ไม่สามารถเปลี่ยนรหัสผ่านได้');
        }
    },

    // Deleting *another* user's Auth account also needs the Admin SDK.
    deleteUser: async (id: string) => {
        const call = httpsCallable<{ uid: string }, { ok: boolean }>(functions, 'adminDeleteUserAccount');
        await call({ uid: id });
    },

    getTenantUserOptions: async (): Promise<Array<{ id: string; full_name: string; phone: string; email?: string }>> => {
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'tenant')));
        const tenantUsers = usersSnap.docs.map((d) => withId<any>(d));

        const tenantsSnap = await getDocs(collection(db, 'tenants'));
        const linkedTenants = tenantsSnap.docs.map((d) => withId<any>(d)).filter((t) => t.user_id);

        const tenantIds = linkedTenants.map((t) => t.id);
        let activeContractTenantIds = new Set<string>();
        if (tenantIds.length > 0) {
            const chunks: string[][] = [];
            for (let i = 0; i < tenantIds.length; i += 30) chunks.push(tenantIds.slice(i, i + 30));
            const contractSnaps = await Promise.all(
                chunks.map((chunkIds) =>
                    getDocs(
                        query(
                            collection(db, 'contracts'),
                            where('tenant_id', 'in', chunkIds),
                            where('status', '==', 'active')
                        )
                    )
                )
            );
            contractSnaps.forEach((snap) => snap.forEach((d) => activeContractTenantIds.add(d.data().tenant_id)));
        }

        const unavailableUserIds = new Set(
            linkedTenants
                .filter((t) => t.user_id || t.current_room_id || activeContractTenantIds.has(t.id))
                .map((t) => t.user_id)
                .filter(Boolean)
        );

        return tenantUsers
            .filter((user) => !unavailableUserIds.has(user.id))
            .map((user) => ({ id: user.id, full_name: user.full_name, phone: user.phone }))
            .sort((a, b) => a.full_name.localeCompare(b.full_name, 'th'));
    },
};
