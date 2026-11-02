import type { ReactNode } from 'react';
export function AuthProvider({ children }: { children: ReactNode }) { return children; }
export function useAuth() {
    const tenant = window.location.pathname.startsWith('/tenant');
    return {
        loading: false, user: { uid: 'preview' },
        profile: { id: 'preview', role: tenant ? 'tenant' : 'admin', full_name: 'สมชาย ใจดี', phone: '0812345678' },
        signOut: async () => {}, signIn: async () => ({ user: { role: 'admin' } }),
    };
}
