import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserRole } from '../types';

export interface CustomUser {
    id: string;
    phone: string;
    full_name: string;
    role: UserRole;
}

export function normalizePhone(value: string | null | undefined): string {
    return String(value || '').replace(/\D/g, '');
}

async function resolveLoginEmail(loginInput: string): Promise<string | null> {
    const usernameDoc = await getDoc(doc(db, 'username_lookup', loginInput));
    if (usernameDoc.exists()) {
        return usernameDoc.data().email as string;
    }

    const normalizedPhone = normalizePhone(loginInput);
    if (normalizedPhone) {
        const phoneDoc = await getDoc(doc(db, 'phone_lookup', normalizedPhone));
        if (phoneDoc.exists()) {
            return phoneDoc.data().email as string;
        }
    }

    return null;
}

function userFromDoc(uid: string, data: Record<string, any>): CustomUser {
    return {
        id: uid,
        phone: data.phone,
        full_name: data.full_name,
        role: data.role,
    };
}

export const authService = {
    // Login with username (e.g. sena301) or phone number, resolved to the
    // account's synthetic Firebase Auth email via the lookup collections.
    login: async (loginInput: string, password: string): Promise<{ user?: CustomUser; error?: string }> => {
        try {
            const email = await resolveLoginEmail(loginInput.trim());
            if (!email) {
                return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
            }

            const credential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
            if (!userDoc.exists()) {
                await signOut(auth);
                return { error: 'ไม่พบข้อมูลผู้ใช้' };
            }

            return { user: userFromDoc(credential.user.uid, userDoc.data()) };
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                return { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
            }
            return { error: error.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
        }
    },

    logout: async () => {
        await signOut(auth);
    },

    // Reads the current session's user profile from Firestore. Used on
    // mount before onAuthStateChanged's own doc read settles, and by code
    // that needs a one-off fresh copy of the current user.
    getCurrentUser: async (): Promise<CustomUser | null> => {
        const fbUser = auth.currentUser;
        if (!fbUser) return null;
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (!userDoc.exists()) return null;
        return userFromDoc(fbUser.uid, userDoc.data());
    },
};
