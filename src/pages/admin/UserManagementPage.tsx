import React, { useEffect, useState } from 'react';
import {
    Box,
    Grid,
    Heading,
    Text,
    Card,
    HStack,
    VStack,
    Icon,
    Badge,
    Table,
    Input,
} from '@chakra-ui/react';
import { LuUsers, LuSearch, LuShield, LuPencil } from 'react-icons/lu';
import { supabase } from '../../lib/supabase';
import type { Profile, UserRole } from '../../types';
import { UserRole as UserRoleEnum } from '../../types';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import {
    DialogRoot,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
} from '../../components/ui/dialog';
import {
    NativeSelectField,
    NativeSelectRoot,
} from '../../components/ui/native-select';
import { toaster } from '../../components/ui/toaster';
import { UserFormDialog } from '../../components/users/UserFormDialog';
import { userService } from '../../services/userService';

export const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false); // Used for Form Dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
    const [userToReset, setUserToReset] = useState<Profile | null>(null);
    const [resetEmail, setResetEmail] = useState('');

    // Services
    // const { userService } = require('../../services/userService'); // Removed dynamic import

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message,
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await userService.deleteUser(userToDelete.id);
            toaster.create({
                title: 'ลบผู้ใช้สำเร็จ',
                description: 'ข้อมูลของโปรไฟล์ถูกลบแล้ว',
                type: 'success',
            });
            fetchUsers();
            setDeleteDialogOpen(false);
        } catch (error: any) {
            toaster.create({
                title: 'ไม่สามารถลบผู้ใช้ได้',
                description: error.message,
                type: 'error',
            });
        }
    };

    const handleResetPassword = async (email: string) => {
        try {
            setLoading(true);
            await userService.resetPasswordEmail(email);
            toaster.create({
                title: 'ส่งอีเมลรีเซ็ทรหัสผ่านแล้ว',
                description: `ส่งลิงก์ไปที่ ${email} เรียบร้อย`,
                type: 'success',
            });
            setUserToReset(null);
            setResetEmail('');
        } catch (error: any) {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message,
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const getRoleLabel = (role: UserRole): string => {
        switch (role) {
            case UserRoleEnum.ADMIN:
                return 'ผู้ดูแลระบบ';
            case UserRoleEnum.OWNER:
                return 'เจ้าของหอพัก';
            case UserRoleEnum.TENANT:
                return 'ผู้เช่า';
            default:
                return role;
        }
    };

    const getRoleBadgeColor = (role: UserRole): string => {
        switch (role) {
            case UserRoleEnum.ADMIN:
                return 'red';
            case UserRoleEnum.OWNER:
                return 'blue';
            case UserRoleEnum.TENANT:
                return 'green';
            default:
                return 'gray';
        }
    };

    const filteredUsers = users.filter(
        (user) =>
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: users.length,
        admins: users.filter((u) => u.role === UserRoleEnum.ADMIN).length,
        owners: users.filter((u) => u.role === UserRoleEnum.OWNER).length,
        tenants: users.filter((u) => u.role === UserRoleEnum.TENANT).length,
    };

    return (
        <VStack align="stretch" gap={8}>
            {/* Header */}
            <HStack justify="space-between">
                <Box>
                    <Heading size="2xl" mb={2}>
                        จัดการสิทธิ์ผู้ใช้
                    </Heading>
                    <Text color="gray.600" fontSize="lg">
                        จัดการบทบาทและสิทธิ์การเข้าถึงของผู้ใช้ในระบบ
                    </Text>
                </Box>
                <Button
                    colorPalette="blue"
                    onClick={() => {
                        setSelectedUser(null);
                        setDialogOpen(true);
                    }}
                >
                    <Icon mr={2}>
                        <LuUsers />
                    </Icon>
                    เพิ่มผู้ใช้ใหม่
                </Button>
            </HStack>

            {/* Stats */}
            <Grid
                templateColumns={{
                    base: '1fr',
                    md: 'repeat(2, 1fr)',
                    lg: 'repeat(4, 1fr)',
                }}
                gap={6}
            >
                <Card.Root>
                    <Card.Body>
                        <HStack justify="space-between">
                            <VStack align="start" gap={1}>
                                <Text color="gray.600" fontSize="sm">
                                    ผู้ใช้ทั้งหมด
                                </Text>
                                <Heading size="2xl">{stats.total}</Heading>
                            </VStack>
                            <Box
                                p={3}
                                borderRadius="lg"
                                bg="brand.100"
                                color="brand.600"
                            >
                                <Icon fontSize="2xl">
                                    <LuUsers />
                                </Icon>
                            </Box>
                        </HStack>
                    </Card.Body>
                </Card.Root>

                <Card.Root>
                    <Card.Body>
                        <HStack justify="space-between">
                            <VStack align="start" gap={1}>
                                <Text color="gray.600" fontSize="sm">
                                    ผู้ดูแลระบบ
                                </Text>
                                <Heading size="2xl">{stats.admins}</Heading>
                            </VStack>
                            <Box
                                p={3}
                                borderRadius="lg"
                                bg="red.100"
                                color="red.600"
                            >
                                <Icon fontSize="2xl">
                                    <LuShield />
                                </Icon>
                            </Box>
                        </HStack>
                    </Card.Body>
                </Card.Root>

                <Card.Root>
                    <Card.Body>
                        <HStack justify="space-between">
                            <VStack align="start" gap={1}>
                                <Text color="gray.600" fontSize="sm">
                                    เจ้าของหอพัก
                                </Text>
                                <Heading size="2xl">{stats.owners}</Heading>
                            </VStack>
                            <Box
                                p={3}
                                borderRadius="lg"
                                bg="blue.100"
                                color="blue.600"
                            >
                                <Icon fontSize="2xl">
                                    <LuShield />
                                </Icon>
                            </Box>
                        </HStack>
                    </Card.Body>
                </Card.Root>

                <Card.Root>
                    <Card.Body>
                        <HStack justify="space-between">
                            <VStack align="start" gap={1}>
                                <Text color="gray.600" fontSize="sm">
                                    ผู้เช่า
                                </Text>
                                <Heading size="2xl">{stats.tenants}</Heading>
                            </VStack>
                            <Box
                                p={3}
                                borderRadius="lg"
                                bg="green.100"
                                color="green.600"
                            >
                                <Icon fontSize="2xl">
                                    <LuUsers />
                                </Icon>
                            </Box>
                        </HStack>
                    </Card.Body>
                </Card.Root>
            </Grid>

            {/* Search */}
            <Card.Root>
                <Card.Body>
                    <HStack gap={4}>
                        <Box position="relative" flex={1}>
                            <Icon
                                position="absolute"
                                left={3}
                                top="50%"
                                transform="translateY(-50%)"
                                color="gray.400"
                            >
                                <LuSearch />
                            </Icon>
                            <Input
                                placeholder="ค้นหาชื่อ, เบอร์โทร, หรือบทบาท..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                pl={10}
                                size="lg"
                            />
                        </Box>
                    </HStack>
                </Card.Body>
            </Card.Root>

            {/* Users Table */}
            <Card.Root>
                <Card.Header>
                    <Heading size="md">รายชื่อผู้ใช้ ({filteredUsers.length})</Heading>
                </Card.Header>
                <Card.Body p={0}>
                    {loading ? (
                        <Box p={8} textAlign="center">
                            <Text color="gray.500">กำลังโหลด...</Text>
                        </Box>
                    ) : filteredUsers.length === 0 ? (
                        <Box p={8} textAlign="center">
                            <Text color="gray.500">ไม่พบผู้ใช้</Text>
                        </Box>
                    ) : (
                        <Table.Root variant="line">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>ชื่อ-นามสกุล</Table.ColumnHeader>
                                    <Table.ColumnHeader>เบอร์โทร</Table.ColumnHeader>
                                    <Table.ColumnHeader>บทบาท</Table.ColumnHeader>
                                    <Table.ColumnHeader>วันที่สมัคร</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="center">
                                        จัดการ
                                    </Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {filteredUsers.map((user) => (
                                    <Table.Row key={user.id}>
                                        <Table.Cell>
                                            <VStack align="start" gap={0}>
                                                <Text fontWeight="medium">{user.full_name}</Text>
                                                <Text fontSize="sm" color="gray.500">
                                                    ID: {user.id.slice(0, 8)}...
                                                </Text>
                                            </VStack>
                                        </Table.Cell>
                                        <Table.Cell>{user.phone || '-'}</Table.Cell>
                                        <Table.Cell>
                                            <Badge colorPalette={getRoleBadgeColor(user.role)}>
                                                {getRoleLabel(user.role)}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {formatDate(user.created_at, 'short')}
                                        </Table.Cell>
                                        <Table.Cell textAlign="center">
                                            <HStack justify="center" gap={2}>
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setDialogOpen(true);
                                                    }}
                                                >
                                                    <Icon mr={1}>
                                                        <LuPencil />
                                                    </Icon>
                                                    แก้ไข
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    colorPalette="blue"
                                                    onClick={() => {
                                                        setUserToReset(user);
                                                        setResetEmail(''); // Reset email input
                                                    }}
                                                >
                                                    <Icon mr={1}>
                                                        <LuShield />
                                                    </Icon>
                                                    รีเซ็ท
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="ghost"
                                                    colorPalette="red"
                                                    onClick={() => {
                                                        setUserToDelete(user);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    ลบ
                                                </Button>
                                            </HStack>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table.Root>
                    )}
                </Card.Body>
            </Card.Root>

            {/* User Form Dialog (Add/Edit) */}
            {dialogOpen && (
                <UserFormDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    onSuccess={fetchUsers}
                    user={selectedUser}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <DialogRoot open={deleteDialogOpen} onOpenChange={(e) => setDeleteDialogOpen(e.open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>ยืนยันการลบผู้ใช้</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <Text>
                            คุณต้องการลบผู้ใช้ <strong>{userToDelete?.full_name}</strong> ใช่หรือไม่?
                            <br />
                            <Text as="span" color="red.500" fontSize="sm">
                                * การลบนี้จะลบข้อมูลโปรไฟล์เท่านั้น บัญชีผู้ใช้อาจยังคงอยู่ในระบบ Auth
                            </Text>
                        </Text>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
                            ยกเลิก
                        </Button>
                        <Button colorPalette="red" isLoading={loading} onClick={handleDeleteUser}>
                            ยืนยันลบ
                        </Button>
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>

            {/* Reset Password Dialog */}
            <DialogRoot open={!!userToReset} onOpenChange={(e) => !e.open && setUserToReset(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>รีเซ็ทรหัสผ่าน</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <VStack gap={4}>
                            <Text>
                                กรุณาระบุอีเมลของ <strong>{userToReset?.full_name}</strong> เพื่อส่งลิงก์รีเซ็ทรหัสผ่าน
                            </Text>
                            <Input
                                placeholder="ระบุอีเมลผู้ใช้ (เช่น user@example.com)"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                            />
                            <Text fontSize="xs" color="gray.500">
                                * ระบบจะส่งอีเมลพร้อมลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังที่อยู่ที่ระบุ
                            </Text>
                        </VStack>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUserToReset(null)} disabled={loading}>
                            ยกเลิก
                        </Button>
                        <Button
                            colorPalette="blue"
                            isLoading={loading}
                            onClick={() => {
                                if (resetEmail) handleResetPassword(resetEmail);
                            }}
                            disabled={!resetEmail}
                        >
                            ส่งลิงก์รีเซ็ท
                        </Button>
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>
        </VStack>
    );
};
