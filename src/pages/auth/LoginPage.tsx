import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Container,
    Heading,
    HStack,
    Icon,
    IconButton,
    Input,
    Text,
    Card,
    VStack,
} from '@chakra-ui/react';
import { LuEye, LuEyeOff } from 'react-icons/lu';
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
        <Box
            minH="100vh"
            bgGradient="to-br"
            gradientFrom="brand.subtle"
            gradientTo="brand.muted"
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={4}
        >
            <Container maxW="md">
                <VStack gap={8}>
                    <VStack gap={2}>
                        <Heading
                            size="2xl"
                            bgGradient="to-r"
                            gradientFrom="brand.500"
                            gradientTo="brand.700"
                            bgClip="text"
                        >
                            Sena-One
                        </Heading>
                        <Text color="fg.muted" fontSize="lg">
                            ระบบจัดการหอพัก
                        </Text>
                    </VStack>

                    <Card.Root w="full" shadow="xl">
                        <Card.Body p={8}>
                            <form onSubmit={handleSubmit}>
                                <VStack gap={6}>
                                    <Heading size="lg" textAlign="center">
                                        เข้าสู่ระบบ
                                    </Heading>

                                    <Field label="ชื่อผู้ใช้" required>
                                        <Input
                                            type="text"
                                            placeholder="sena301"
                                            value={username}
                                            onChange={(event) => setUsername(event.target.value)}
                                            size="lg"
                                            autoComplete="username"
                                            required
                                        />
                                    </Field>

                                    <Field label="รหัสผ่าน" required>
                                        <HStack w="full">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)}
                                                size="lg"
                                                autoComplete="current-password"
                                                required
                                            />
                                            <IconButton
                                                variant="ghost"
                                                size="lg"
                                                type="button"
                                                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                                                onClick={() => setShowPassword((prev) => !prev)}
                                            >
                                                <Icon>{showPassword ? <LuEyeOff /> : <LuEye />}</Icon>
                                            </IconButton>
                                        </HStack>
                                    </Field>

                                    <Button
                                        type="submit"
                                        colorPalette="brand"
                                        size="lg"
                                        w="full"
                                        disabled={loading}
                                    >
                                        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                                    </Button>

                                    <Text color="fg.muted" fontSize="sm" textAlign="center">
                                        ติดต่อผู้ดูแลระบบหากไม่สามารถเข้าสู่ระบบได้
                                    </Text>
                                </VStack>
                            </form>
                        </Card.Body>
                    </Card.Root>

                    <Text color="fg.muted" fontSize="sm" textAlign="center">
                        © 2024 Sena-One. All rights reserved.
                    </Text>
                </VStack>
            </Container>
        </Box>
    );
};
