import React, { useEffect, useMemo, useState } from 'react';
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
import { LuUsers, LuShield, LuPencil } from 'react-icons/lu';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { withId } from '../../lib/firestoreUtils';
import type { Profile, UserRole } from '../../types';
import { UserRole as UserRoleEnum } from '../../types';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { SearchInput } from '../../components/common/SearchInput';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
} from '../../components/ui/dialog';
import { toaster } from '../../components/ui/toaster';
import { UserFormDialog } from '../../components/users/UserFormDialog';
import { userService } from '../../services/userService';

export const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMutating, setIsMutating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false); // Used for Form Dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
    const [userToReset, setUserToReset] = useState<Profile | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const pageSize = 50;

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
            setPage(1);
        }, 250);

        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const snap = await getDocs(query(collection(db, 'users'), orderBy('created_at', 'desc')));
            setUsers(snap.docs.map((d) => withId<Profile>(d)));
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
            setIsMutating(true);
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
        } finally {
            setIsMutating(false);
        }
    };

    const handleResetPassword = async () => {
        if (!userToReset) return;

        if (newPassword.length < 6) {
            toaster.create({
                title: 'รหัสผ่านสั้นเกินไป',
                description: 'กรุณากำหนดรหัสผ่านอย่างน้อย 6 ตัวอักษร',
                type: 'warning',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toaster.create({
                title: 'รหัสผ่านไม่ตรงกัน',
                description: 'กรุณาตรวจสอบช่องยืนยันรหัสผ่านอีกครั้ง',
                type: 'warning',
            });
            return;
        }

        try {
            setIsMutating(true);
            await userService.resetUserPassword(userToReset.id, newPassword);
            toaster.create({
                title: 'Reset password completed',
                description: `${userToReset.full_name} can sign in with the new password now.`,
                type: 'success',
            });
            setUserToReset(null);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message,
                type: 'error',
            });
        } finally {
            setIsMutating(false);
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

    const filteredUsers = useMemo(() => {
        if (!debouncedSearchTerm) return users;

        return users.filter((user) =>
            user.full_name?.toLowerCase().includes(debouncedSearchTerm) ||
            user.phone?.toLowerCase().includes(debouncedSearchTerm) ||
            user.role?.toLowerCase().includes(debouncedSearchTerm) ||
            (user as any).username?.toLowerCase().includes(debouncedSearchTerm)
        );
    }, [users, debouncedSearchTerm]);

    const stats = useMemo(() => users.reduce(
        (acc, user) => {
            acc.total += 1;
            if (user.role === UserRoleEnum.ADMIN) acc.admins += 1;
            if (user.role === UserRoleEnum.OWNER) acc.owners += 1;
            if (user.role === UserRoleEnum.TENANT) acc.tenants += 1;
            return acc;
        },
        { total: 0, admins: 0, owners: 0, tenants: 0 }
    ), [users]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const pagedUsers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, page]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    return (
        <VStack align="stretch" gap={8}>
            {/* Header */}
            <HStack justify="space-between">
                <Box>
                    <Heading size="2xl" mb={2}>
                        จัดการสิทธิ์ผู้ใช้
                    </Heading>
                    <Text color="fg.muted" fontSize="lg">
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
                                <Text color="fg.muted" fontSize="sm">
                                    ผู้ใช้ทั้งหมด
                                </Text>
                                <Heading size="2xl">{stats.total}</Heading>
                            </VStack>
                            <Box
                                p={3}
                                borderRadius="lg"
                                bg="brand.muted"
                                color="brand.fg"
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
                                <Text color="fg.muted" fontSize="sm">
                                    ผู้ดูแลระบบ
                                </Text>
                                <Heading size="2xl">{stats.admins}</Heading>
                            </VStack>
                            <Box
                                p={3}
                                borderRadius="lg"
                                bg="red.subtle"
                                color="red.fg"
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
                                <Text color="fg.muted" fontSize="sm">
                                    เจ้าของหอพัก
                                </Text>
                                <Heading size="2xl">{stats.owners}</Heading>
                            </VStack>
                            <Box
                                p={3}
                                borderRadius="lg"
                                bg="blue.subtle"
                                color="blue.fg"
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
                                <Text color="fg.muted" fontSize="sm">
                                    ผู้เช่า
                                </Text>
                                <Heading size="2xl">{stats.tenants}</Heading>
                            </VStack>
                            <Box
                                p={3}
                                borderRadius="lg"
                                bg="green.subtle"
                                color="green.fg"
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
                        <Box flex={1}>
                            <SearchInput
                                placeholder="ค้นหาชื่อ, เบอร์โทร, หรือบทบาท..."
                                name="user-search"
                                autoComplete="off"
                                value={searchTerm}
                                onChange={setSearchTerm}
                                size="lg"
                            />
                        </Box>
                    </HStack>
                </Card.Body>
                {filteredUsers.length > pageSize && (
                    <Card.Footer>
                        <HStack justify="space-between" w="full">
                            <Text fontSize="sm" color="fg.muted">
                                แสดง {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredUsers.length)} จาก {filteredUsers.length} รายการ
                            </Text>
                            <HStack gap={2}>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page <= 1}
                                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                                >
                                    ก่อนหน้า
                                </Button>
                                <Text fontSize="sm">
                                    {page} / {totalPages}
                                </Text>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                >
                                    ถัดไป
                                </Button>
                            </HStack>
                        </HStack>
                    </Card.Footer>
                )}
            </Card.Root>

            {/* Users Table */}
            <Card.Root>
                <Card.Header>
                    <Heading size="md">รายชื่อผู้ใช้ ({filteredUsers.length})</Heading>
                </Card.Header>
                <Card.Body p={0}>
                    {loading ? (
                        <Box p={8} textAlign="center">
                            <Text color="fg.muted">กำลังโหลด...</Text>
                        </Box>
                    ) : filteredUsers.length === 0 ? (
                        <Box p={8} textAlign="center">
                            <Text color="fg.muted">ไม่พบผู้ใช้</Text>
                        </Box>
                    ) : (
                        <Table.Root variant="line">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>ชื่อ-นามสกุล</Table.ColumnHeader>
                                    <Table.ColumnHeader>ชื่อผู้ใช้</Table.ColumnHeader>
                                    <Table.ColumnHeader>เบอร์โทร</Table.ColumnHeader>
                                    <Table.ColumnHeader>บทบาท</Table.ColumnHeader>
                                    <Table.ColumnHeader>วันที่สมัคร</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="center">
                                        จัดการ
                                    </Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {pagedUsers.map((user) => (
                                    <Table.Row key={user.id}>
                                        <Table.Cell>
                                            <VStack align="start" gap={0}>
                                                <Text fontWeight="medium">{user.full_name}</Text>
                                                <Text fontSize="sm" color="fg.muted">
                                                    ID: {user.id.slice(0, 8)}...
                                                </Text>
                                            </VStack>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Text fontWeight="medium" color="brand.fg">
                                                {(user as any).username || '-'}
                                            </Text>
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
                                                        setNewPassword('');
                                                        setConfirmPassword('');
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
                            <Text as="span" color="red.fg" fontSize="sm">
                                * การลบนี้จะลบข้อมูลโปรไฟล์เท่านั้น บัญชีผู้ใช้อาจยังคงอยู่ในระบบ Auth
                            </Text>
                        </Text>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isMutating}>
                            ยกเลิก
                        </Button>
                        <Button colorPalette="red" loading={isMutating} onClick={handleDeleteUser}>
                            ยืนยันลบ
                        </Button>
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>

            {/* Reset Password Dialog */}
            <DialogRoot
                open={!!userToReset}
                onOpenChange={(e) => {
                    if (!e.open) {
                        setUserToReset(null);
                        setNewPassword('');
                        setConfirmPassword('');
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <VStack gap={4} align="stretch">
                            <Text>
                                ตั้งรหัสผ่านใหม่ให้ <strong>{userToReset?.full_name}</strong>
                            </Text>
                            <Input
                                type="password"
                                name="new-user-password"
                                autoComplete="new-password"
                                placeholder="รหัสผ่านใหม่"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <Input
                                type="password"
                                name="confirm-new-user-password"
                                autoComplete="new-password"
                                placeholder="ยืนยันรหัสผ่านใหม่"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            <Text fontSize="xs" color="fg.muted">
                                * รหัสผ่านจะถูกเปลี่ยนในฐานข้อมูล PGlite ทันที ไม่มีการส่งอีเมล
                            </Text>
                        </VStack>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setUserToReset(null);
                                setNewPassword('');
                                setConfirmPassword('');
                            }}
                            disabled={isMutating}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            colorPalette="blue"
                            loading={isMutating}
                            onClick={handleResetPassword}
                            disabled={!newPassword || !confirmPassword}
                        >
                            บันทึกรหัสผ่านใหม่
                        </Button>
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>
        </VStack>
    );
};
