import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { Box, Flex, Heading, HStack, Icon, IconButton, Text, VStack } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../services/reportService';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '../ui/menu';
import { DrawerBackdrop, DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerRoot, DrawerTrigger } from '../ui/drawer';
import { Button } from '../ui/button';
import { ColorModeButton } from '../ui/color-mode';
import {
    LuLayoutDashboard, LuDoorOpen, LuUsers, LuFileText, LuWallet, LuWrench,
    LuChartNoAxesCombined, LuLogOut, LuSettings, LuShield, LuActivity,
    LuMenu, LuCarFront, LuBoxes, LuBuilding2, LuChevronDown, LuChevronRight,
} from 'react-icons/lu';

const navGroups = [
    { title: 'ภาพรวม', items: [{ label: 'หน้าหลัก', icon: LuLayoutDashboard, path: '/admin' }] },
    { title: 'ห้องพักและผู้พักอาศัย', items: [
        { label: 'ห้องพัก', icon: LuDoorOpen, path: '/admin/rooms' },
        { label: 'ผู้เช่า', icon: LuUsers, path: '/admin/tenants' },
        { label: 'สัญญาเช่า', icon: LuFileText, path: '/admin/contracts' },
        { label: 'ทะเบียนรถ', icon: LuCarFront, path: '/admin/vehicles' },
        { label: 'ครุภัณฑ์', icon: LuBoxes, path: '/admin/equipment' },
    ] },
    { title: 'การเงินและบริการ', items: [
        { label: 'จดมิเตอร์', icon: LuActivity, path: '/admin/meters' },
        { label: 'ใบแจ้งหนี้', icon: LuWallet, path: '/admin/invoices' },
        { label: 'แจ้งซ่อม', icon: LuWrench, path: '/admin/maintenance' },
        { label: 'รายงาน', icon: LuChartNoAxesCombined, path: '/admin/reports' },
    ] },
    { title: 'ระบบ', items: [
        { label: 'สิทธิ์ผู้ใช้', icon: LuShield, path: '/admin/users' },
        { label: 'ตั้งค่า', icon: LuSettings, path: '/admin/settings' },
    ] },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    return (
        <VStack align="stretch" gap={0} h="full" bg="nav.bg" color="nav.fg">
            <HStack px={5} py={6} gap={3}>
                <Flex w={10} h={10} bg="brand.500" color="white" borderRadius="xl" align="center" justify="center"><LuBuilding2 size={23} /></Flex>
                <Box><Heading size="lg" color="white" letterSpacing="-0.04em">Sena-One<span style={{ color: '#5EEAD4' }}>.</span></Heading><Text fontSize="xs" color="nav.muted">ระบบจัดการอาคารพักอาศัย</Text></Box>
            </HStack>
            <Box as="nav" aria-label="เมนูผู้ดูแลระบบ" flex={1} overflowY="auto" px={3} pb={4}>
                {navGroups.map(group => (
                    <Box key={group.title} mb={4}>
                        <Text fontSize="xs" color="nav.muted" px={3} mb={2} mt={2}>{group.title}</Text>
                        <VStack gap={1} align="stretch">
                            {group.items.map(item => {
                                const active = location.pathname === item.path;
                                return (
                                    <Button key={item.path} asChild variant="ghost" justifyContent="flex-start" h="42px" fontSize="sm"
                                        fontWeight={active ? 'semibold' : 'normal'} color={active ? 'white' : 'nav.fg'} bg={active ? 'nav.active' : 'transparent'}
                                        _hover={{ bg: 'nav.active', color: 'white' }} onClick={onNavigate}>
                                        <RouterLink to={item.path} aria-current={active ? 'page' : undefined}>
                                            <Icon fontSize="lg" color={active ? 'brand.300' : 'nav.muted'}><item.icon /></Icon>
                                            {item.label}
                                            {active && <Box ml="auto" w="5px" h="5px" bg="brand.300" borderRadius="full" />}
                                        </RouterLink>
                                    </Button>
                                );
                            })}
                        </VStack>
                    </Box>
                ))}
            </Box>
            <Box p={3} borderTopWidth="1px" borderColor="whiteAlpha.100">
                <MenuRoot>
                    <MenuTrigger asChild>
                        <Button variant="ghost" color="nav.fg" w="full" h="auto" py={3} px={2} _hover={{ bg: 'nav.active' }}>
                            <Flex w={9} h={9} borderRadius="full" bg="nav.active" color="brand.200" align="center" justify="center">{profile?.full_name?.charAt(0) || 'S'}</Flex>
                            <Box textAlign="left" flex={1} minW={0}><Text truncate fontSize="sm">{profile?.full_name || 'ผู้ดูแลระบบ'}</Text><Text fontSize="xs" color="nav.muted">{profile?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าของอาคาร'}</Text></Box>
                            <LuChevronDown />
                        </Button>
                    </MenuTrigger>
                    <MenuContent>
                        <MenuItem value="settings" onClick={() => { navigate('/admin/settings'); onNavigate?.(); }}><LuSettings /> ตั้งค่าระบบ</MenuItem>
                        <MenuItem value="logout" color="danger.fg" onClick={async () => { await signOut(); navigate('/login'); }}><LuLogOut /> ออกจากระบบ</MenuItem>
                    </MenuContent>
                </MenuRoot>
            </Box>
        </VStack>
    );
}

export const AdminLayout: React.FC = () => {
    const [open, setOpen] = useState(false);
    const location = useLocation();
    const current = navGroups.flatMap(group => group.items).find(item => item.path === location.pathname);
    React.useEffect(() => {
        reportService.getDashboardStats().catch(error => console.error('Error preloading dashboard stats:', error));
    }, []);
    return (
        <Flex minH="100dvh" bg="bg.canvas">
            <Box className="app-sidebar" display={{ base: 'none', lg: 'block' }} w="248px" position="fixed" inset="0 auto 0 0" h="100dvh" zIndex={40}>
                <SidebarContent />
            </Box>
            <Box className="app-main" ml={{ base: 0, lg: '248px' }} flex={1} minW={0}>
                <HStack className="app-topbar" as="header" position="sticky" top={0} zIndex={30} bg="bg.panel" borderBottomWidth="1px" borderColor="border.default"
                    h="72px" px={{ base: 4, md: 7 }} justify="space-between">
                    <HStack gap={3}>
                        <Box display={{ base: 'block', lg: 'none' }}>
                            <DrawerRoot open={open} onOpenChange={e => setOpen(e.open)} placement="start">
                                <DrawerBackdrop /><DrawerTrigger asChild><IconButton variant="ghost" aria-label="เปิดเมนู"><LuMenu /></IconButton></DrawerTrigger>
                                <DrawerContent maxW="290px"><DrawerCloseTrigger color="white" /><DrawerBody p={0}><SidebarContent onNavigate={() => setOpen(false)} /></DrawerBody></DrawerContent>
                            </DrawerRoot>
                        </Box>
                        <HStack gap={2} fontSize="sm">
                            <Text color="fg.muted" display={{ base: 'none', md: 'block' }}>พื้นที่ผู้ดูแลระบบ</Text>
                            <Icon color="fg.subtle" display={{ base: 'none', md: 'block' }}><LuChevronRight /></Icon>
                            <Text fontWeight="semibold">{current?.label || 'Sena-One'}</Text>
                        </HStack>
                    </HStack>
                    <HStack gap={3}>
                        <Text color="fg.muted" fontSize="xs" display={{ base: 'none', md: 'block' }}>{new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                        <ColorModeButton />
                    </HStack>
                </HStack>
                <Box as="main" id="main-content" className="app-page" maxW="1600px" mx="auto" p={{ base: 4, md: 7, xl: 8 }} pb={10}>
                    <Outlet />
                </Box>
            </Box>
        </Flex>
    );
};
