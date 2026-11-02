import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Heading,
    HStack,
    Icon,
    IconButton,
    Input,
    Text,
    Card,
    VStack,
} from '@chakra-ui/react';
import { LuEye, LuEyeOff, LuBuilding2, LuDoorOpen, LuActivity, LuWallet, LuArrowRight } from 'react-icons/lu';
import { ColorModeButton } from '../../components/ui/color-mode';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { Field } from '../../components/ui/field';
import { toaster } from '../../components/ui/toaster';
import { Button } from '../../components/ui/button';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const from = (location.state as any)?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { user, error } = await signIn(username.trim(), password);

        if (error) {
            toaster.create({
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                description: error,
                type: 'error',
            });
            setLoading(false);
            return;
        }

        toaster.create({
            title: 'เข้าสู่ระบบสำเร็จ',
            description: 'ยินดีต้อนรับเข้าสู่ระบบ Sena-One',
            type: 'success',
        });

        if (user?.role === UserRole.TENANT) {
            navigate(from.startsWith('/tenant') ? from : '/tenant', { replace: true });
            return;
        }

        navigate(from === '/login' || from === '/' ? '/admin' : from, { replace: true });
    };

    return (
        <Box minH="100dvh" display="grid" gridTemplateColumns={{ base: '1fr', lg: '1fr 1fr' }} bg="bg.canvas">
            <VStack display={{ base: 'none', lg: 'flex' }} bg="nav.bg" color="white" align="stretch" justify="space-between" p={{ lg: 12, xl: 20 }}>
                <HStack gap={3}><Box bg="brand.500" p={3} borderRadius="xl"><LuBuilding2 size={25} /></Box><Heading size="xl">Sena-One.</Heading></HStack>
                <Box py={12}>
                    <Text color="brand.200" fontSize="sm" mb={4}>อาคารพักอาศัยเสนานิคม 1</Text>
                    <Heading size="4xl" lineHeight={1.5} mb={5}>ดูแลงานอาคาร<br />ให้เป็นเรื่องง่าย</Heading>
                    <Text color="nav.fg" maxW="400px">รวมข้อมูลห้องพัก ผู้เช่า มิเตอร์ และการชำระเงิน เพื่อให้ทุกวันจัดการได้สะดวกขึ้น</Text>
                    <VStack align="stretch" gap={5} mt={10}>
                        {[{ icon: LuDoorOpen, text: 'ข้อมูลห้องและสัญญาในที่เดียว' }, { icon: LuActivity, text: 'จดมิเตอร์และตรวจสอบยอดใช้' }, { icon: LuWallet, text: 'ติดตามใบแจ้งหนี้และการชำระเงิน' }].map(item =>
                            <HStack key={item.text} gap={3}><Icon color="brand.200" fontSize="xl"><item.icon /></Icon><Text fontSize="sm" color="nav.fg">{item.text}</Text></HStack>
                        )}
                    </VStack>
                </Box>
                <Text fontSize="xs" color="nav.muted">Sena-One · ระบบจัดการอาคารพักอาศัย</Text>
            </VStack>
            <VStack justify="center" minH="100dvh" gap={6} p={{ base: 5, md: 10 }}>
                <Box w="full" maxW="420px">
                    <HStack mb={8} display={{ base: 'flex', lg: 'none' }} color="brand.fg"><LuBuilding2 size={25} /><Heading size="xl">Sena-One.</Heading></HStack>
                    <Text color="brand.fg" fontSize="sm" fontWeight="semibold" mb={2}>ยินดีต้อนรับกลับ</Text>
                    <Heading size="2xl" mb={2}>เข้าสู่ระบบ</Heading>
                    <Text color="fg.muted" fontSize="sm" mb={8}>ใช้บัญชีของคุณเพื่อจัดการหรือดูข้อมูลที่พัก</Text>
                    <Card.Root><Card.Body p={{ base: 5, md: 7 }}>
                        <form onSubmit={handleSubmit}>
                            <VStack gap={5}>
                                <Field label="ชื่อผู้ใช้" required>
                                    <Input type="text" placeholder="เช่น sena301" value={username} onChange={event => setUsername(event.target.value)} size="lg" autoComplete="username" required />
                                </Field>
                                <Field label="รหัสผ่าน" required>
                                    <HStack w="full">
                                        <Input type={showPassword ? 'text' : 'password'} placeholder="กรอกรหัสผ่าน" value={password} onChange={event => setPassword(event.target.value)} size="lg" autoComplete="current-password" required />
                                        <IconButton variant="ghost" size="lg" type="button" aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick={() => setShowPassword(prev => !prev)}>{showPassword ? <LuEyeOff /> : <LuEye />}</IconButton>
                                    </HStack>
                                </Field>
                                <Button type="submit" colorPalette="brand" size="lg" w="full" loading={loading} disabled={loading}>เข้าสู่ระบบ <LuArrowRight /></Button>
                                <Text color="fg.muted" fontSize="xs" textAlign="center">หากไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อผู้ดูแลอาคาร</Text>
                            </VStack>
                        </form>
                    </Card.Body></Card.Root>
                    <HStack justify="space-between" mt={6}><Text color="fg.subtle" fontSize="xs">© {new Date().getFullYear()} Sena-One</Text><ColorModeButton /></HStack>
                </Box>
            </VStack>
        </Box>
    );
};
