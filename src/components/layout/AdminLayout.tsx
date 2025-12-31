import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Container,
    Flex,
    Heading,
    HStack,
    Icon,
    IconButton,
    Text,
    VStack,
    Separator,
    useBreakpointValue,
} from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import {
    MenuContent,
    MenuItem,
    MenuRoot,
    MenuTrigger,
} from '../../components/ui/menu';
import {
    DrawerBackdrop,
    DrawerBody,
    DrawerCloseTrigger,
    DrawerContent,
    DrawerRoot,
    DrawerTrigger,
} from '../../components/ui/drawer';
import { Button } from '../ui/button';
import { ColorModeButton } from '../ui/color-mode';
import {
    LuLayoutDashboard, LuDoorOpen, LuUsers, LuFileText,
    LuDollarSign, LuWrench, LuClipboardList, LuLogOut,
    LuUser, LuSettings, LuShield, LuActivity, LuMenu
} from 'react-icons/lu';

interface NavItem {
    label: string;
    icon: any;
    path: string;
}

const navItems: NavItem[] = [
    { label: 'แดชบอร์ด', icon: LuLayoutDashboard, path: '/admin' },
    { label: 'จัดการสิทธิ์ผู้ใช้', icon: LuShield, path: '/admin/users' },
    { label: 'จัดการห้องพัก', icon: LuDoorOpen, path: '/admin/rooms' },
    { label: 'จัดการผู้เช่า', icon: LuUsers, path: '/admin/tenants' },
    { label: 'สัญญาเช่า', icon: LuFileText, path: '/admin/contracts' },
    { label: 'จัดการมิเตอร์', icon: LuActivity, path: '/admin/meters' },
    { label: 'การเงิน (ใบแจ้งหนี้)', icon: LuDollarSign, path: '/admin/invoices' },
    { label: 'แจ้งซ่อม', icon: LuWrench, path: '/admin/maintenance' },
    { label: 'รายงาน', icon: LuClipboardList, path: '/admin/reports' },
    { label: 'ตั้งค่าระบบ', icon: LuSettings, path: '/admin/settings' },
];

interface SidebarContentProps {
    onNavigate?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ onNavigate }) => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <VStack gap={0} align="stretch" h="full" bg="bg.canvas">
            {/* Logo */}
            <Box p={6} borderBottom="1px" borderColor="border.default">
                <HStack justify="space-between" mb={1}>
                    <Heading
                        size="xl"
                        bgGradient="to-r"
                        gradientFrom="brand.500"
                        gradientTo="brand.700"
                        bgClip="text"
                    >
                        Sena-One
                    </Heading>
                    <ColorModeButton />
                </HStack>
                <Text color="fg.muted" fontSize="sm">
                    ระบบจัดการหอพัก
                </Text>
            </Box>

            {/* Navigation */}
            <VStack gap={1} p={4} flex={1} overflowY="auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Button
                            key={item.path}
                            asChild
                            variant={isActive ? "subtle" : "ghost"}
                            colorPalette={isActive ? "brand" : undefined}
                            justifyContent="flex-start"
                            w="full"
                            size="lg"
                            onClick={onNavigate}
                        >
                            <RouterLink to={item.path}>
                                <Icon fontSize="xl" mr={3}>
                                    <item.icon />
                                </Icon>
                                {item.label}
                            </RouterLink>
                        </Button>
                    );
                })}
            </VStack>

            {/* User Menu */}
            <Box p={4} borderTop="1px" borderColor="border.default">
                <MenuRoot>
                    <MenuTrigger asChild>
                        <Button
                            variant="ghost"
                            w="full"
                            justifyContent="flex-start"
                            size="lg"
                        >
                            <HStack gap={3} w="full">
                                <Box
                                    w={8}
                                    h={8}
                                    borderRadius="full"
                                    bg="brand.500"
                                    color="white"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    fontWeight="bold"
                                    fontSize="sm"
                                >
                                    {profile?.full_name?.charAt(0) || 'U'}
                                </Box>
                                <VStack gap={0} align="start" flex={1}>
                                    <Text fontWeight="medium" fontSize="sm" truncate>
                                        {profile?.full_name}
                                    </Text>
                                    <Text color="gray.500" fontSize="xs">
                                        {profile?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าของหอพัก'}
                                    </Text>
                                </VStack>
                            </HStack>
                        </Button>
                    </MenuTrigger>
                    <MenuContent>
                        <MenuItem value="profile">
                            <Icon mr={2}>
                                <LuUser />
                            </Icon>
                            โปรไฟล์
                        </MenuItem>
                        <MenuItem value="settings">
                            <Icon mr={2}>
                                <LuSettings />
                            </Icon>
                            ตั้งค่า
                        </MenuItem>
                        <Separator />
                        <MenuItem value="logout" color="red.500" onClick={handleSignOut}>
                            <Icon mr={2}>
                                <LuLogOut />
                            </Icon>
                            ออกจากระบบ
                        </MenuItem>
                    </MenuContent>
                </MenuRoot>
            </Box>
        </VStack>
    );
};

export const AdminLayout: React.FC = () => {
    const [open, setOpen] = useState(false);

    return (
        <Flex minH="100vh" bg="bg.subtle">
            {/* Mobile Header */}
            <Box
                display={{ base: 'block', lg: 'none' }}
                position="fixed"
                top={0}
                left={0}
                right={0}
                zIndex={100}
                bg="bg.canvas"
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
                                    <LuMenu />
                                </IconButton>
                            </DrawerTrigger>
                            <DrawerContent>
                                <DrawerCloseTrigger />
                                <DrawerBody p={0}>
                                    <SidebarContent onNavigate={() => setOpen(false)} />
                                </DrawerBody>
                            </DrawerContent>
                        </DrawerRoot>
                        <Heading size="md" color="brand.600">Sena-One</Heading>
                    </HStack>
                    <ColorModeButton />
                </HStack>
            </Box>

            {/* Desktop Sidebar */}
            <Box
                display={{ base: 'none', lg: 'block' }}
                w="280px"
                bg="bg.canvas"
                borderRight="1px"
                borderColor="border.default"
                position="fixed"
                h="100vh"
                overflowY="auto"
            >
                <SidebarContent />
            </Box>

            {/* Main Content */}
            <Box
                ml={{ base: 0, lg: '280px' }}
                mt={{ base: '60px', lg: 0 }}
                flex={1}
                w="full"
            >
                <Box p={{ base: 4, md: 8 }}>
                    <Outlet />
                </Box>
            </Box>
        </Flex>
    );
};
