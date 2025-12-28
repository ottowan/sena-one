import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import { UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    signIn: (phone: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ตรวจสอบ session ปัจจุบัน
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // ฟัง auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (phone: string, password: string) => {
        try {
            // ค้นหา email จากเบอร์โทรศัพท์
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('phone', phone)
                .single();
                
            if (profileError || !profileData?.email) {
                throw new Error('ไม่พบเบอร์โทรศัพท์นี้ในระบบ');
            }
            
            // Login ด้วย email ที่ได้จาก profiles
            const { error } = await supabase.auth.signInWithPassword({
                email: profileData.email,
                password,
            });
            if (error) throw error;
            
            return {};
        } catch (error: any) {
            return { error: error.message };
        }
    };



    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return { error: 'ไม่พบผู้ใช้' };

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) throw error;

            // อัปเดต local state
            setProfile((prev) => (prev ? { ...prev, ...updates } : null));

            return {};
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const value = {
        user,
        profile,
        session,
        loading,
        signIn,
        signOut,
        updateProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
