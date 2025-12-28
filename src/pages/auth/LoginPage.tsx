import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Container,
    Heading,
    Input,
    Stack,
    Text,
    Link,
    Card,
    VStack,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { Field } from '../../components/ui/field';
import { toaster } from '../../components/ui/toaster';
import { Button } from '../../components/ui/button';

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, profile } = useAuth();

    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const from = (location.state as any)?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await signIn(phone, password);

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

        // Redirect based on role
        if (profile?.role === UserRole.TENANT) {
            navigate('/tenant');
        } else {
            navigate('/admin');
        }
    };

    return (
        <Box
            minH="100vh"
            bgGradient="to-br"
            gradientFrom="brand.50"
            gradientTo="brand.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={4}
        >
            <Container maxW="md">
                <VStack gap={8}>
                    {/* Logo / Header */}
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
                        <Text color="gray.600" fontSize="lg">
                            ระบบจัดการหอพัก
                        </Text>
                    </VStack>

                    {/* Login Card */}
                    <Card.Root w="full" shadow="xl">
                        <Card.Body p={8}>
                            <form onSubmit={handleSubmit}>
                                <VStack gap={6}>
                                    <Heading size="lg" textAlign="center">
                                        เข้าสู่ระบบ
                                    </Heading>

                                    <Field label="เบอร์โทรศัพท์" required>
                                        <Input
                                            type="text"
                                            placeholder="0812345678"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            size="lg"
                                            required
                                        />
                                    </Field>

                                    <Field label="รหัสผ่าน" required>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            size="lg"
                                            required
                                        />
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

                                    <Text color="gray.500" fontSize="sm" textAlign="center">
                                        ติดต่อผู้ดูแลระบบหากไม่สามารถเข้าสู่ระบบได้
                                    </Text>
                                </VStack>
                            </form>
                        </Card.Body>
                    </Card.Root>

                    {/* Footer */}
                    <Text color="gray.500" fontSize="sm" textAlign="center">
                        © 2024 Sena-One. All rights reserved.
                    </Text>
                </VStack>
            </Container>
        </Box>
    );
};
