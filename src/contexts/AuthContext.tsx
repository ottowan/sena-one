import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { authService, type CustomUser } from '../services/authService';

interface AuthContextType {
    user: CustomUser | null;
    profile: CustomUser | null; // Keep for backward compatibility
    loading: boolean;
    signIn: (loginInput: string, password: string) => Promise<{ user?: CustomUser; error?: string }>;
    signOut: () => void;
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
    const [user, setUser] = useState<CustomUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (!fbUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUser({ id: fbUser.uid, phone: data.phone, full_name: data.full_name, role: data.role });
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error('Error loading user profile:', error);
                setUser(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const signIn = async (loginInput: string, password: string) => {
        const { user: loggedInUser, error } = await authService.login(loginInput, password);

        if (error) {
            return { error };
        }

        setUser(loggedInUser || null);
        return { user: loggedInUser };
    };

    const signOut = () => {
        void authService.logout();
        setUser(null);
    };

    const value = {
        user,
        profile: user, // Alias for backward compatibility
        loading,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
