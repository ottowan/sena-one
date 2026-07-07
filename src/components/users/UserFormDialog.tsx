import React, { useState, useEffect } from 'react';
import {
    VStack,
    Input,
    Button,
    HStack,
    Icon,
    IconButton,
    Text,
} from '@chakra-ui/react';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
} from '../../components/ui/dialog';
import { Field } from '../../components/ui/field';
import {
    NativeSelectField,
    NativeSelectRoot,
} from '../../components/ui/native-select';
import { toaster } from '../../components/ui/toaster';
import { userService } from '../../services/userService';
import type { Profile, UserRole } from '../../types';
import { UserRole as UserRoleEnum } from '../../types';

interface UserFormDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    user?: Profile | null; // If provided, Edit mode. If null, Create mode.
}

export const UserFormDialog: React.FC<UserFormDialogProps> = ({
    open,
    onClose,
    onSuccess,
    user,
}) => {
    const isEdit = !!user;
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [changePassword, setChangePassword] = useState(false);

    const [formData, setFormData] = useState({
        phone: '',
        password: '',
        full_name: '',
        role: UserRoleEnum.TENANT as UserRole
    });

    useEffect(() => {
        if (open) {
            setShowPassword(false);
            setChangePassword(false);
            
            if (user) {
                setFormData({
                    phone: user.phone || '',
                    password: '',
                    full_name: user.full_name,
                    role: user.role
                });
            } else {
                setFormData({
                    phone: '',
                    password: '',
                    full_name: '',
                    role: UserRoleEnum.TENANT
                });
            }
        }
    }, [open, user]);

    const handleSubmit = async () => {
        try {
            setLoading(true);

            if (isEdit && user) {
                // Update
                await userService.updateUser(user.id, {
                    full_name: formData.full_name,
                    phone: formData.phone,
                    role: formData.role
                });
                
// รีเซ็ตรหัสผ่านถ้ามีการร้องขอ
                if (changePassword && formData.password) {
                    const result = await userService.resetUserPassword(user.id, formData.password);
                    toaster.create({
                        title: 'เปลี่ยนรหัสผ่านสำเร็จ',
                        description: `รหัสผ่านใหม่: ${result.tempPassword}`,
                        type: 'success',
                        duration: 10000, // แสดงนานขึ้นเพื่อให้มีเวลาจด
                    });
                }
                
                toaster.create({
                    title: 'บันทึกข้อมูลสำเร็จ',
                    type: 'success',
                });
            } else {
                // Create
                if (!formData.phone || !formData.password || !formData.full_name) {
                    throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน');
                }
                await userService.createUserWithPhone(
                    formData.phone,
                    formData.password,
                    formData.full_name,
                    formData.role
                );
                toaster.create({
                    title: 'สร้างผู้ใช้สำเร็จ',
                    description: 'ผู้ใช้สามารถเข้าสู่ระบบได้ทันที',
                    type: 'success',
                });
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถบันทึกข้อมูลได้',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'แก้ไขข้อมูลผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <VStack gap={4}>
                        <Field label="เบอร์โทรศัพท์" required>
                            <Input
                                placeholder="08xxxxxxxx"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                disabled={isEdit}
                                required
                            />
                        </Field>
                        
                        {!isEdit && (
                            <Field label="รหัสผ่าน" required>
                                <HStack>
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="ตั้งรหัสผ่าน"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        flex={1}
                                    />
                                    <IconButton
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <Icon>
                                            {showPassword ? <LuEyeOff /> : <LuEye />}
                                        </Icon>
                                    </IconButton>
                                </HStack>
                            </Field>
                        )}
                        
                        {isEdit && (
                            <>
                                <Field label="รหัสผ่าน">
                                    <VStack align="start" gap={2}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setChangePassword(!changePassword);
                                                if (!changePassword) setFormData({ ...formData, password: '' });
                                            }}
                                            colorPalette={changePassword ? "red" : "blue"}
                                        >
                                            {changePassword ? "ยกเลิก" : "เปลี่ยนรหัสผ่าน"}
                                        </Button>
                                        {changePassword && (
                                            <VStack align="start" gap={2} w="full">
                                                <Text fontSize="sm" color="blue.fg">
                                                    ตั้งรหัสผ่านใหม่สำหรับผู้ใช้
                                                </Text>
                                                <HStack w="full">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="รหัสผ่านใหม่"
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        flex={1}
                                                    />
                                                    <IconButton
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        <Icon>
                                                            {showPassword ? <LuEyeOff /> : <LuEye />}
                                                        </Icon>
                                                    </IconButton>
                                                </HStack>
                                                <Text fontSize="xs" color="fg.muted">
                                                    รหัสผ่านจะถูกแสดงในการแจ้งเตือนหลังบันทึก
                                                </Text>
                                            </VStack>
                                        )}
                                    </VStack>
                                </Field>
                            </>
                        )}

                        <Field label="ชื่อ-นามสกุล" required>
                            <Input
                                placeholder="สมชาย ใจดี"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </Field>

                        <Field label="เบอร์โทรศัพท์">
                            <Input
                                placeholder="08xxxxxxxx"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </Field>

                        <Field label="สิทธิ์การใช้งาน">
                            <NativeSelectRoot>
                                <NativeSelectField
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                >
                                    <option value={UserRoleEnum.TENANT}>ผู้เช่า</option>
                                    <option value={UserRoleEnum.OWNER}>เจ้าของหอพัก</option>
                                    <option value={UserRoleEnum.ADMIN}>ผู้ดูแลระบบ</option>
                                </NativeSelectField>
                            </NativeSelectRoot>
                        </Field>
                    </VStack>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        ยกเลิก
                    </Button>
                    <Button colorPalette="brand" loading={loading} onClick={handleSubmit}>
                        บันทึก
                    </Button>
                </DialogFooter>
                <DialogCloseTrigger />
            </DialogContent>
        </DialogRoot>
    );
};
