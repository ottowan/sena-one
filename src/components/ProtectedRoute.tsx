import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Box, Spinner, Center } from '@chakra-ui/react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
}) => {
    const { user, profile, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <Center h="100vh">
                <Spinner size="xl" color="brand.500" />
            </Center>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // ถ้าไม่มีสิทธิ์เข้าถึง redirect ไปหน้าที่เหมาะสม
        if (profile.role === UserRole.TENANT) {
            return <Navigate to="/tenant" replace />;
        }
        return <Navigate to="/admin" replace />;
    }

    return <>{children}</>;
};
