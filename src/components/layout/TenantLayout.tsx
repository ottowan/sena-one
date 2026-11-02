import React from 'react';
import { Box, Flex, VStack, Text, Button, HStack, IconButton } from '@chakra-ui/react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LuLayoutDashboard, LuFileText, LuWrench, LuLogOut, LuMenu, LuBoxes, LuDroplet, LuBuilding2 } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { toaster } from '../ui/toaster';
import { ColorModeButton } from '../ui/color-mode';
import { DrawerBackdrop, DrawerBody, DrawerCloseTrigger, DrawerContent, DrawerRoot, DrawerTrigger } from '../ui/drawer';

const items = [
    { icon: LuLayoutDashboard, label: 'หน้าหลัก', to: '/tenant' },
    { icon: LuFileText, label: 'บิลและการชำระเงิน', to: '/tenant/bills' },
    { icon: LuDroplet, label: 'มิเตอร์น้ำ', to: '/tenant/water-meter' },
    { icon: LuWrench, label: 'แจ้งซ่อม', to: '/tenant/maintenance' },
    { icon: LuBoxes, label: 'ครุภัณฑ์', to: '/tenant/equipment' },
];

function TenantSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    return (
        <VStack h="full" align="stretch" gap={0} bg="nav.bg" color="nav.fg">
            <HStack px={5} py={6} gap={3}>
                <Flex w={10} h={10} bg="brand.500" color="white" borderRadius="xl" align="center" justify="center"><LuBuilding2 size={23} /></Flex>
                <Box><Text fontSize="xl" fontWeight="semibold" color="white">Sena-One<span style={{ color: '#5EEAD4' }}>.</span></Text><Text fontSize="xs" color="nav.muted">พื้นที่ผู้พักอาศัย</Text></Box>
            </HStack>
            <VStack as="nav" aria-label="เมนูผู้พักอาศัย" align="stretch" gap={1} px={3} flex={1}>
                <Text fontSize="xs" color="nav.muted" px={3} my={2}>บริการสำหรับคุณ</Text>
                {items.map(item => {
                    const active = location.pathname === item.to;
                    return <Button key={item.to} asChild variant="ghost" justifyContent="flex-start" h="44px" fontSize="sm"
                        bg={active ? 'nav.active' : 'transparent'} color={active ? 'white' : 'nav.fg'} fontWeight={active ? 'semibold' : 'normal'}
                        _hover={{ bg: 'nav.active', color: 'white' }} onClick={onNavigate}>
                        <Link to={item.to} aria-current={active ? 'page' : undefined}><item.icon size={19} />{item.label}</Link>
                    </Button>;
                })}
            </VStack>
            <Box p={4} borderTopWidth="1px" borderColor="whiteAlpha.100">
                <Text fontSize="sm" fontWeight="semibold" truncate>{profile?.full_name || 'ผู้พักอาศัย'}</Text>
                <Text color="nav.muted" fontSize="xs" mb={3}>บัญชีผู้พักอาศัย</Text>
                <Button variant="ghost" color="nav.fg" _hover={{ bg: 'nav.active' }} justifyContent="flex-start" w="full" onClick={async () => {
                    try { await signOut(); navigate('/login'); }
                    catch { toaster.create({ title: 'ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง', type: 'error' }); }
                }}><LuLogOut /> ออกจากระบบ</Button>
            </Box>
        </VStack>
    );
}

export const TenantLayout: React.FC = () => {
    const [open, setOpen] = React.useState(false);
    const location = useLocation();
    const current = items.find(item => item.to === location.pathname);
    return (
        <Flex minH="100dvh" bg="bg.canvas">
            <Box className="app-sidebar" display={{ base: 'none', lg: 'block' }} w="248px" position="fixed" inset="0 auto 0 0" h="100dvh">
                <TenantSidebarContent />
            </Box>
            <Box className="app-main" ml={{ base: 0, lg: '248px' }} flex={1} minW={0}>
                <HStack as="header" className="app-topbar" bg="bg.panel" borderBottomWidth="1px" borderColor="border.default" h="72px" px={{ base: 4, md: 7 }}
                    position="sticky" top={0} zIndex={30} justify="space-between">
                    <HStack gap={3}>
                        <Box display={{ base: 'block', lg: 'none' }}>
                            <DrawerRoot open={open} onOpenChange={e => setOpen(e.open)} placement="start">
                                <DrawerBackdrop /><DrawerTrigger asChild><IconButton variant="ghost" aria-label="เปิดเมนู"><LuMenu /></IconButton></DrawerTrigger>
                                <DrawerContent maxW="290px"><DrawerCloseTrigger color="white" /><DrawerBody p={0}><TenantSidebarContent onNavigate={() => setOpen(false)} /></DrawerBody></DrawerContent>
                            </DrawerRoot>
                        </Box>
                        <Text fontWeight="semibold" fontSize="sm">{current?.label || 'Sena-One'}</Text>
                    </HStack>
                    <ColorModeButton />
                </HStack>
                <Box as="main" className="app-page" maxW="1440px" mx="auto" p={{ base: 4, md: 7 }} pb={{ base: '100px', lg: 8 }}><Outlet /></Box>
            </Box>
            <HStack as="nav" aria-label="เมนูด่วน" className="mobile-nav" display={{ base: 'flex', lg: 'none' }} position="fixed" bottom={0} left={0} right={0}
                zIndex={40} bg="bg.panel" borderTopWidth="1px" borderColor="border.default" px={2} pt={2} pb="max(8px, env(safe-area-inset-bottom))" justify="space-around">
                {items.slice(0, 4).map(item => {
                    const active = location.pathname === item.to;
                    return <Flex key={item.to} asChild direction="column" align="center" gap={1} py={1} px={2} minW="64px" borderRadius="lg"
                        bg={active ? 'brand.subtle' : undefined} color={active ? 'brand.fg' : 'fg.muted'}>
                        <Link to={item.to} aria-current={active ? 'page' : undefined}><item.icon size={21} /><Text fontSize="10px">{item.label === 'บิลและการชำระเงิน' ? 'บิลของฉัน' : item.label}</Text></Link>
                    </Flex>;
                })}
            </HStack>
        </Flex>
    );
};
