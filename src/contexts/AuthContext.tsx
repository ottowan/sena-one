import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, type CustomUser } from '../services/authService';
import type { UserRole } from '../types';

interface AuthContextType {
    user: CustomUser | null;
    profile: CustomUser | null; // Keep for backward compatibility
    loading: boolean;
    signIn: (phone: string, password: string) => Promise<{ user?: CustomUser; error?: string }>;
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
        // Check for existing session on mount
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        setLoading(false);
        void authService.warmUp();
    }, []);

    const signIn = async (phone: string, password: string) => {
        const { user: loggedInUser, error } = await authService.login(phone, password);

        if (error) {
            return { error };
        }

        setUser(loggedInUser || null);
        return { user: loggedInUser };
    };

    const signOut = () => {
        authService.logout();
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
