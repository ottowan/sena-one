import React from 'react';
import { Box, Flex, VStack, Text, Button, Container, Icon, HStack, IconButton } from '@chakra-ui/react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LuLayoutDashboard,
    LuFileText,
    LuWrench,
    LuUser,
    LuLogOut,
    LuMenu
} from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { Toaster, toaster } from '../ui/toaster';
import { ColorModeButton } from '../ui/color-mode';
import {
    DrawerBackdrop,
    DrawerBody,
    DrawerCloseTrigger,
    DrawerContent,
    DrawerRoot,
    DrawerTrigger,
} from '../../components/ui/drawer';

const SidebarItem = ({ icon, label, to, onClick }: { icon: any; label: string; to: string; onClick?: () => void }) => {
    return (
        <NavLink to={to} style={{ width: '100%' }} onClick={onClick}>
            {({ isActive }) => (
                <Button
                    variant={isActive ? 'subtle' : 'ghost'}
                    colorPalette={isActive ? 'brand' : 'gray'}
                    bg={isActive ? 'brand.50' : undefined}
                    color={isActive ? 'brand.800' : undefined}
                    borderLeft="3px solid"
                    borderColor={isActive ? 'brand.500' : 'transparent'}
                    _hover={{ bg: 'brand.50', color: 'brand.800' }}
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

const TenantSidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
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
        <VStack h="full" justify="space-between" align="stretch" bg="white">
            <Box>
                <HStack justify="space-between" mb={8} px={6} pt={6} pb={5} borderBottom="1px solid" borderColor="border.default">
                    <Flex align="center" gap={3}>
                        <Box w={8} h={8} bg="brand.600" borderRadius="md" />
                        <Text fontSize="xl" fontWeight="bold" color="brand.700">Sena-One</Text>
                    </Flex>
                    <ColorModeButton />
                </HStack>

                <VStack align="stretch" gap={1} px={4}>
                    <Text fontSize="xs" color="gray.500" px={2} mb={2} fontWeight="bold">MENU</Text>
                    <SidebarItem icon={<LuLayoutDashboard />} label="หน้าหลัก" to="/tenant" onClick={onNavigate} />
                    <SidebarItem icon={<LuFileText />} label="บิลและการชำระเงิน" to="/tenant/bills" onClick={onNavigate} />
                    <SidebarItem icon={<LuWrench />} label="แจ้งซ่อม" to="/tenant/maintenance" onClick={onNavigate} />
                    <SidebarItem icon={<LuUser />} label="ข้อมูลสัญญา" to="/tenant/contract" onClick={onNavigate} />
                </VStack>
            </Box>

            <Box p={4}>
                <Box p={4} bg="brand.50" borderRadius="md" mb={4}>
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
    );
};

export const TenantLayout: React.FC = () => {
    const [open, setOpen] = React.useState(false);

    return (
        <Flex minH="100vh" bg="bg.canvas">
            {/* Mobile Header */}
            <Box
                display={{ base: 'block', md: 'none' }}
                position="fixed"
                top={0}
                left={0}
                right={0}
                zIndex={100}
                bg="white"
                borderBottom="1px"
                borderColor="border.default"
                px={4}
                py={3}
            >
                <HStack justify="space-between">
                    <HStack>
                        <DrawerRoot open={open} onOpenChange={(e) => setOpen(e.open)} placement="start">
                            <DrawerBackdrop />
                            <DrawerTrigger asChild>
                                <IconButton variant="ghost" aria-label="Open menu">
                                    <Icon><LuMenu /></Icon>
                                </IconButton>
                            </DrawerTrigger>
                            <DrawerContent>
                                <DrawerCloseTrigger />
                                <DrawerBody p={0}>
                                    <TenantSidebarContent onNavigate={() => setOpen(false)} />
                                </DrawerBody>
                            </DrawerContent>
                        </DrawerRoot>
                        <Text fontWeight="bold" fontSize="lg" color="brand.700">Sena-One</Text>
                    </HStack>
                    <ColorModeButton />
                </HStack>
            </Box>

            {/* Desktop Sidebar */}
            <Box
                w="250px"
                bg="white"
                borderRight="1px solid"
                borderColor="border.default"
                display={{ base: 'none', md: 'block' }}
                position="fixed"
                h="100vh"
            >
                <TenantSidebarContent />
            </Box>

            {/* Main Content */}
            <Box
                ml={{ base: 0, md: '250px' }}
                mt={{ base: '60px', md: 0 }}
                flex="1"
                position="relative"
                overflow="hidden"
                bg="#F8FBFA"
                minH="100vh"
            >
                <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    h={{ base: '170px', md: '230px' }}
                    bg="linear-gradient(135deg, #D9ECE9 0%, #FFF7ED 54%, #F8FBFA 100%)"
                    borderBottom="1px solid"
                    borderColor="border.muted"
                />
                <Box position="relative" zIndex={1} p={{ base: 4, md: 8 }}>
                    <Container maxW="container.xl">
                        <Outlet />
                    </Container>
                </Box>
            </Box>

            <Toaster />
        </Flex>
    );
};
