import React from 'react';
import { Box, Flex, VStack, Text, Button, Container, Icon } from '@chakra-ui/react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LuLayoutDashboard,
    LuFileText,
    LuWrench,
    LuUser,
    LuLogOut
} from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { Toaster, toaster } from '../ui/toaster';

const SidebarItem = ({ icon, label, to }: { icon: any; label: string; to: string }) => {
    return (
        <NavLink to={to} style={{ width: '100%' }}>
            {({ isActive }) => (
                <Button
                    variant={isActive ? 'subtle' : 'ghost'}
                    colorPalette={isActive ? 'brand' : 'gray'}
                    justifyContent="flex-start"
                    width="full"
                    size="lg"
                >
                    <Icon mr={2}>{icon}</Icon>
                    {label}
                </Button>
            )}
        </NavLink>
    );
};

export const TenantLayout: React.FC = () => {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error signing out:', error);
            toaster.create({ title: 'เกิดข้อผิดพลาดในการออกจากระบบ', type: 'error' });
        }
    };

    return (
        <Flex minH="100vh" bg="gray.50">
            {/* Sidebar */}
            <Box
                w="250px"
                bg="white"
                borderRight="1px solid"
                borderColor="gray.200"
                display={{ base: 'none', md: 'block' }}
                position="fixed"
                h="100vh"
            >
                <VStack h="full" p={4} justify="space-between" align="stretch">
                    <Box>
                        <Flex align="center" gap={3} mb={8} px={2}>
                            <Box w={8} h={8} bg="brand.500" borderRadius="md" />
                            <Text fontSize="xl" fontWeight="bold">Sena-One</Text>
                        </Flex>

                        <VStack align="stretch" gap={1}>
                            <Text fontSize="xs" color="gray.500" px={2} mb={2} fontWeight="bold">MENU</Text>
                            <SidebarItem icon={<LuLayoutDashboard />} label="หน้าหลัก" to="/tenant" />
                            <SidebarItem icon={<LuFileText />} label="บิลและการชำระเงิน" to="/tenant/bills" />
                            <SidebarItem icon={<LuWrench />} label="แจ้งซ่อม" to="/tenant/maintenance" />
                            <SidebarItem icon={<LuUser />} label="ข้อมูลสัญญา" to="/tenant/contract" />
                        </VStack>
                    </Box>

                    <Box>
                        <Box p={4} bg="gray.50" borderRadius="md" mb={4}>
                            <Text fontSize="sm" fontWeight="bold" truncate>{profile?.full_name || 'Tenant'}</Text>
                            <Text fontSize="xs" color="gray.500">ผู้เช่า</Text>
                        </Box>
                        <Button
                            variant="outline"
                            colorPalette="red"
                            width="full"
                            onClick={handleSignOut}
                        >
                            <Icon mr={2}><LuLogOut /></Icon>
                            ออกจากระบบ
                        </Button>
                    </Box>
                </VStack>
            </Box>

            {/* Main Content */}
            <Box ml={{ base: 0, md: '250px' }} flex="1" p={8}>
                <Container maxW="container.xl">
                    <Outlet />
                </Container>
            </Box>

            <Toaster />
        </Flex>
    );
};
