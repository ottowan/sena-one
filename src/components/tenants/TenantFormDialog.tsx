import React, { useState, useEffect } from 'react';
import {
    Box,
    Input,
    Textarea,
    Grid,
    VStack,
    HStack,
    Heading,
    Text,
    Icon,
    IconButton,
} from '@chakra-ui/react';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
    DialogActionTrigger,
} from '../ui/dialog';
import { Field } from '../ui/field';
import {
    NativeSelectField,
    NativeSelectRoot,
} from '../ui/native-select';
import { Button } from '../ui/button';
import { LuPlus, LuTrash2, LuUser } from 'react-icons/lu';
import type { Tenant, Vehicle, VehicleType, PositionLevel } from '../../types';
import { useCreateTenant, useUpdateTenant } from '../../hooks/useTenants';
import { userService } from '../../services/userService';
import { tenantService } from '../../services/tenantService';

interface TenantFormDialogProps {
    open: boolean;
    onClose: () => void;
    tenant?: Tenant | null;
}

const THAI_PROVINCES = [
    'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร',
    'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ',
    'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
    'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์',
    'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี',
    'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พังงา',
    'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่',
    'พะเยา', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร',
    'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี', 'ลพบุรี', 'ลำปาง',
    'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
    'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย',
    'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู',
    'อ่างทอง', 'อุดรธานี', 'อุทัยธานี', 'อุตรดิตถ์', 'อุบลราชธานี', 'อำนาจเจริญ',
];

// ... existing imports

export const TenantFormDialog: React.FC<TenantFormDialogProps> = ({
    open,
    onClose,
    tenant,
}) => {
    const isEdit = !!tenant;
    const createTenant = useCreateTenant();
    const updateTenant = useUpdateTenant();

    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        email: '',
        id_card_number: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        position_title: '',
        position_level: '' as PositionLevel | '',
        workplace: '',
        status: 'active' as 'active' | 'inactive' | 'pending',
    });

    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [matchingUser, setMatchingUser] = useState<any | null>(null);

    // User search state
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [foundUsers, setFoundUsers] = useState<any[]>([]);
    const [showUserResults, setShowUserResults] = useState(false);
    const [debugError, setDebugError] = useState<string | null>(null);

    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (userSearchTerm) {
                try {
                    const users = await userService.searchUsers(userSearchTerm);
                    setFoundUsers(users);
                    setDebugError(null);
                } catch (err: any) {
                    console.error("Search failed", err);
                    setDebugError(err.message || JSON.stringify(err));
                    setFoundUsers([]);
                }
            } else {
                setFoundUsers([]);
                setDebugError(null);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [userSearchTerm]);

    useEffect(() => {
        if (tenant) {
            // ... existing setFormData logic

            setFormData({
                full_name: tenant.full_name,
                phone: tenant.phone,
                email: tenant.email || '',
                id_card_number: tenant.id_card_number,
                emergency_contact_name: tenant.emergency_contact?.name || '',
                emergency_contact_phone: tenant.emergency_contact?.phone || '',
                emergency_contact_relationship: tenant.emergency_contact?.relationship || '',
                position_title: tenant.position_title || '',
                position_level: tenant.position_level || '',
                workplace: tenant.workplace || '',
                status: tenant.status,
            });
            setVehicles(tenant.vehicles || []);
        } else {
            setFormData({
                full_name: '',
                phone: '',
                email: '',
                id_card_number: '',
                emergency_contact_name: '',
                emergency_contact_phone: '',
                emergency_contact_relationship: '',
                position_title: '',
                position_level: '',
                workplace: '',
                status: 'active',
            });
            setVehicles([]);
        }
        setErrors({});
    }, [tenant, open]);

    const handleAddVehicle = () => {
        setVehicles([
            ...vehicles,
            {
                type: 'car' as VehicleType,
                plate: '',
                province: 'กรุงเทพมหานคร',
                brand: '',
                color: '',
            },
        ]);
    };

    const handleRemoveVehicle = (index: number) => {
        setVehicles(vehicles.filter((_, i) => i !== index));
    };

    const handleVehicleChange = (index: number, field: keyof Vehicle, value: string) => {
        const newVehicles = [...vehicles];
        newVehicles[index] = { ...newVehicles[index], [field]: value };
        setVehicles(newVehicles);
    };

    const validate = async () => {
        const newErrors: Record<string, string> = {};

        if (!formData.full_name.trim()) {
            newErrors.full_name = 'กรุณากรอกชื่อ-นามสกุล';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'กรุณากรอกเบอร์โทร';
        } else {
            const isDuplicate = await tenantService.checkPhoneDuplicate(
                formData.phone,
                tenant?.id
            );
            if (isDuplicate) {
                newErrors.phone = 'เบอร์โทรนี้มีในระบบแล้ว';
            }
        }

        if (!formData.id_card_number.trim()) {
            newErrors.id_card_number = 'กรุณากรอกเลขบัตรประชาชน';
        } else if (formData.id_card_number.length !== 13) {
            newErrors.id_card_number = 'เลขบัตรประชาชนต้องมี 13 หลัก';
        } else {
            const isDuplicate = await tenantService.checkIdCardDuplicate(
                formData.id_card_number,
                tenant?.id
            );
            if (isDuplicate) {
                newErrors.id_card_number = 'เลขบัตรประชาชนนี้มีในระบบแล้ว';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isValid = await validate();
        if (!isValid) return;

        const tenantData = {
            full_name: formData.full_name,
            phone: formData.phone,
            email: formData.email || undefined,
            id_card_number: formData.id_card_number,
            emergency_contact: formData.emergency_contact_name
                ? {
                    name: formData.emergency_contact_name,
                    phone: formData.emergency_contact_phone,
                    relationship: formData.emergency_contact_relationship,
                }
                : undefined,
            vehicles: vehicles.filter((v) => v.plate.trim() !== ''),
            position_title: formData.position_title || undefined,
            position_level: formData.position_level || undefined,
            workplace: formData.workplace || undefined,
            status: formData.status,
        };

        try {
            if (isEdit && tenant) {
                await updateTenant.mutateAsync({ id: tenant.id, data: tenantData });
            } else {
                await createTenant.mutateAsync(tenantData as any);
            }
            onClose();
        } catch (error) {
            console.error('Error saving tenant:', error);
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="xl">
            <DialogContent maxH="90vh" overflowY="auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'แก้ไขผู้เช่า' : 'เพิ่มผู้เช่า'}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <DialogBody>
                        <VStack gap={6} align="stretch">
                            {/* เลือกผู้ใช้งาน (เฉพาะเพิ่มใหม่) */}
                            {!isEdit && (
                                <Box p={4} bg="gray.50" borderRadius="md" border="1px dashed" borderColor="gray.300">
                                    <Heading size="sm" mb={2}>ดึงข้อมูลจากผู้ใช้งาน (Optional)</Heading>
                                    <Box position="relative">
                                        <Input
                                            placeholder="พิมพ์ชื่อ หรือเบอร์โทร เพื่อค้นหา..."
                                            value={userSearchTerm}
                                            onChange={(e) => {
                                                console.log('Search term changed:', e.target.value);
                                                setUserSearchTerm(e.target.value);
                                                setShowUserResults(true);
                                            }}
                                            onFocus={() => setShowUserResults(true)}
                                            onBlur={() => setTimeout(() => setShowUserResults(false), 200)}
                                        />
                                        {debugError && (
                                            <Text color="red.500" fontSize="xs" mt={1}>
                                                System Error: {debugError}
                                            </Text>
                                        )}
                                        {showUserResults && userSearchTerm && (
                                            <Box
                                                position="absolute"
                                                top="100%"
                                                left={0}
                                                right={0}
                                                zIndex={1500} // High z-index
                                                bg="white"
                                                boxShadow="lg"
                                                borderRadius="md"
                                                maxH="200px"
                                                overflowY="auto"
                                                mt={1}
                                                border="1px solid"
                                                borderColor="gray.200"
                                            >
                                                <VStack gap={0} align="stretch">
                                                    {foundUsers.length > 0 ? (
                                                        foundUsers.map((user) => (
                                                            <Box
                                                                key={user.id}
                                                                p={3}
                                                                cursor="pointer"
                                                                _hover={{ bg: 'blue.50' }}
                                                                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                                                onClick={() => {
                                                                    console.log('Selected user:', user);
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        full_name: user.full_name || prev.full_name,
                                                                        phone: user.phone || prev.phone,
                                                                        email: user.email || prev.email,
                                                                    }));
                                                                    setMatchingUser(user);
                                                                    setUserSearchTerm(`${user.full_name} (${user.phone})`);
                                                                    setShowUserResults(false);
                                                                }}
                                                            >
                                                                <Text fontWeight="medium" fontSize="sm">{user.full_name}</Text>
                                                                <Text fontSize="xs" color="gray.500">{user.phone}</Text>
                                                            </Box>
                                                        ))
                                                    ) : (
                                                        <Box p={3} color="gray.500">
                                                            <Text fontSize="sm">ไม่พบข้อมูลผู้ใช้งาน</Text>
                                                        </Box>
                                                    )}
                                                </VStack>
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            )}

                            {/* ข้อมูลส่วนตัว */}
                            <VStack align="stretch" gap={4}>
                                <Heading size="md">ข้อมูลส่วนตัว</Heading>

                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <Field label="ชื่อ-นามสกุล" required invalid={!!errors.full_name} errorText={errors.full_name}>
                                        <Input
                                            value={formData.full_name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, full_name: e.target.value })
                                            }
                                            placeholder="เช่น สมชาย ใจดี"
                                        />
                                    </Field>

                                    <Field label="เบอร์โทร" required invalid={!!errors.phone} errorText={errors.phone}>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const newPhone = e.target.value;
                                                setFormData({ ...formData, phone: newPhone });
                                                // Debounce or direct check could go here, but doing simple effect for now
                                            }}
                                            placeholder="เช่น 0812345678"
                                        />
                                        {matchingUser && (
                                            <HStack gap={1} mt={1} color="green.600" fontSize="xs">
                                                <Icon fontSize="xs">
                                                    <LuUser />
                                                </Icon>
                                                <Text>พบผู้ใช้งาน: {matchingUser.full_name || matchingUser.email}</Text>
                                            </HStack>
                                        )}
                                    </Field>
                                </Grid>

                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <Field label="อีเมล">
                                        <Input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) =>
                                                setFormData({ ...formData, email: e.target.value })
                                            }
                                            placeholder="example@email.com"
                                        />
                                    </Field>

                                    <Field label="เลขบัตรประชาชน" required invalid={!!errors.id_card_number} errorText={errors.id_card_number}>
                                        <Input
                                            value={formData.id_card_number}
                                            onChange={(e) =>
                                                setFormData({ ...formData, id_card_number: e.target.value })
                                            }
                                            placeholder="13 หลัก"
                                            maxLength={13}
                                        />
                                    </Field>
                                </Grid>

                                <Field label="สถานะ" required>
                                    <NativeSelectRoot>
                                        <NativeSelectField
                                            value={formData.status}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    status: e.target.value as 'active' | 'inactive' | 'pending',
                                                })
                                            }
                                        >
                                            <option value="active">กำลังเช่า</option>
                                            <option value="inactive">ไม่ได้เช่า</option>
                                            <option value="pending">รอดำเนินการ</option>
                                        </NativeSelectField>
                                    </NativeSelectRoot>
                                </Field>
                            </VStack>

                            {/* ข้อมูลติดต่อฉุกเฉิน */}
                            <VStack align="stretch" gap={4}>
                                <Heading size="md">ข้อมูลติดต่อฉุกเฉิน</Heading>

                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <Field label="ชื่อผู้ติดต่อ">
                                        <Input
                                            value={formData.emergency_contact_name}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    emergency_contact_name: e.target.value,
                                                })
                                            }
                                            placeholder="ชื่อผู้ติดต่อฉุกเฉิน"
                                        />
                                    </Field>

                                    <Field label="เบอร์โทร">
                                        <Input
                                            value={formData.emergency_contact_phone}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    emergency_contact_phone: e.target.value,
                                                })
                                            }
                                            placeholder="เบอร์โทรผู้ติดต่อ"
                                        />
                                    </Field>
                                </Grid>

                                <Field label="ความสัมพันธ์">
                                    <Input
                                        value={formData.emergency_contact_relationship}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                emergency_contact_relationship: e.target.value,
                                            })
                                        }
                                        placeholder="เช่น พ่อ, แม่, พี่, น้อง"
                                    />
                                </Field>
                            </VStack>

                            {/* ข้อมูลการทำงาน */}
                            <VStack align="stretch" gap={4}>
                                <Heading size="md">ข้อมูลการทำงาน</Heading>

                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <Field label="ชื่อตำแหน่ง">
                                        <Input
                                            value={formData.position_title}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    position_title: e.target.value,
                                                })
                                            }
                                            placeholder="เช่น นักวิชาการคอมพิวเตอร์"
                                        />
                                    </Field>

                                    <Field label="ระดับ">
                                        <NativeSelectRoot>
                                            <NativeSelectField
                                                value={formData.position_level}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        position_level: e.target.value as PositionLevel | '',
                                                    })
                                                }
                                            >
                                                <option value="">เลือกระดับ</option>
                                                <option value="ปฏิบัติการ">ปฏิบัติการ</option>
                                                <option value="ชำนาญการ">ชำนาญการ</option>
                                                <option value="ชำนาญการพิเศษ">ชำนาญการพิเศษ</option>
                                                <option value="เชี่ยวชาญ">เชี่ยวชาญ</option>
                                            </NativeSelectField>
                                        </NativeSelectRoot>
                                    </Field>
                                </Grid>

                                <Field label="สถานที่ทำงาน">
                                    <Input
                                        value={formData.workplace}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                workplace: e.target.value,
                                            })
                                        }
                                        placeholder="เช่น กรมพัฒนาที่ดิน"
                                    />
                                </Field>
                            </VStack>

                            {/* ข้อมูลรถ */}
                            <VStack align="stretch" gap={4}>
                                <HStack justify="space-between">
                                    <Heading size="md">ข้อมูลรถ</Heading>
                                    <Button size="sm" onClick={handleAddVehicle}>
                                        <Icon mr={1}>
                                            <LuPlus />
                                        </Icon>
                                        เพิ่มรถ
                                    </Button>
                                </HStack>

                                {vehicles.length === 0 ? (
                                    <Text color="gray.500" fontSize="sm">
                                        ยังไม่มีข้อมูลรถ คลิก "เพิ่มรถ" เพื่อเพิ่มข้อมูล
                                    </Text>
                                ) : (
                                    <VStack align="stretch" gap={4}>
                                        {vehicles.map((vehicle, index) => (
                                            <VStack
                                                key={index}
                                                align="stretch"
                                                gap={3}
                                                p={4}
                                                borderWidth="1px"
                                                borderRadius="md"
                                                borderColor="gray.200"
                                            >
                                                <HStack justify="space-between">
                                                    <Text fontWeight="medium">รถคันที่ {index + 1}</Text>
                                                    <IconButton
                                                        size="sm"
                                                        colorPalette="red"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveVehicle(index)}
                                                        aria-label="ลบรถ"
                                                    >
                                                        <LuTrash2 />
                                                    </IconButton>
                                                </HStack>

                                                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                    <Field label="ประเภท" required>
                                                        <NativeSelectRoot>
                                                            <NativeSelectField
                                                                value={vehicle.type}
                                                                onChange={(e) =>
                                                                    handleVehicleChange(index, 'type', e.target.value)
                                                                }
                                                            >
                                                                <option value="car">รถยนต์</option>
                                                                <option value="motorcycle">มอเตอร์ไซค์</option>
                                                            </NativeSelectField>
                                                        </NativeSelectRoot>
                                                    </Field>

                                                    <Field label="ทะเบียน" required>
                                                        <Input
                                                            value={vehicle.plate}
                                                            onChange={(e) =>
                                                                handleVehicleChange(index, 'plate', e.target.value)
                                                            }
                                                            placeholder="เช่น กข 1234"
                                                        />
                                                    </Field>
                                                </Grid>

                                                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                    <Field label="จังหวัด" required>
                                                        <NativeSelectRoot>
                                                            <NativeSelectField
                                                                value={vehicle.province}
                                                                onChange={(e) =>
                                                                    handleVehicleChange(index, 'province', e.target.value)
                                                                }
                                                            >
                                                                {THAI_PROVINCES.map((province) => (
                                                                    <option key={province} value={province}>
                                                                        {province}
                                                                    </option>
                                                                ))}
                                                            </NativeSelectField>
                                                        </NativeSelectRoot>
                                                    </Field>

                                                    <Field label="ยี่ห้อ/รุ่น">
                                                        <Input
                                                            value={vehicle.brand}
                                                            onChange={(e) =>
                                                                handleVehicleChange(index, 'brand', e.target.value)
                                                            }
                                                            placeholder="เช่น Toyota Camry"
                                                        />
                                                    </Field>
                                                </Grid>

                                                <Field label="สี">
                                                    <Input
                                                        value={vehicle.color}
                                                        onChange={(e) =>
                                                            handleVehicleChange(index, 'color', e.target.value)
                                                        }
                                                        placeholder="เช่น ขาว, ดำ, แดง"
                                                    />
                                                </Field>
                                            </VStack>
                                        ))}
                                    </VStack>
                                )}
                            </VStack>
                        </VStack>
                    </DialogBody>

                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline" onClick={onClose}>
                                ยกเลิก
                            </Button>
                        </DialogActionTrigger>
                        <Button
                            type="submit"
                            colorPalette="blue"
                            disabled={createTenant.isPending || updateTenant.isPending}
                        >
                            {isEdit ? 'บันทึก' : 'เพิ่มผู้เช่า'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </DialogRoot>
    );
};
