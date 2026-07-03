import React from 'react';
import {
    Box,
    Grid,
    Heading,
    Text,
    HStack,
    VStack,
    Badge,
    Icon,
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
import { Button } from '../ui/button';
import { LuPhone, LuMail, LuUser, LuCar, LuMapPin } from 'react-icons/lu';
import { tenantService } from '../../services/tenantService';
import { toaster } from '../ui/toaster';
import type { Tenant } from '../../types';
import { VEHICLE_TYPE_LABELS } from '../vehicles/vehicleMeta';

interface TenantDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    tenant: Tenant | null;
}

const getStatusColor = (status: 'active' | 'inactive' | 'pending'): string => {
    switch (status) {
        case 'active':
            return 'green';
        case 'inactive':
            return 'gray';
        case 'pending':
            return 'yellow';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: 'active' | 'inactive' | 'pending'): string => {
    switch (status) {
        case 'active':
            return 'กำลังเช่า';
        case 'inactive':
            return 'ไม่ได้เช่า';
        case 'pending':
            return 'รอดำเนินการ';
        default:
            return status;
    }
};

const getVehicleTypeLabel = (type: string): string => {
    return type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์';
};

export const TenantDetailsDialog: React.FC<TenantDetailsDialogProps> = ({
    open,
    onClose,
    tenant,
}) => {
    if (!tenant) return null;

    const statusColor = getStatusColor(tenant.status);
    const statusLabel = getStatusLabel(tenant.status);
    const [linking, setLinking] = React.useState(false);

    const handleLinkUser = async () => {
        if (!tenant) return;
        try {
            setLinking(true);
            const user = await tenantService.findMatchingUser(tenant.phone);

            if (!user) {
                toaster.create({
                    title: 'ไม่พบผู้ใช้งาน',
                    description: `ไม่พบผู้ใช้ที่เบอร์โทร ${tenant.phone} ในระบบ`,
                    type: 'error',
                });
                return;
            }

            if (confirm(`พบผู้ใช้งาน "${user.full_name}" ต้องการผูกบัญชีหรือไม่?`)) {
                await tenantService.linkUser(tenant.id, user.id);
                toaster.create({
                    title: 'ผูกบัญชีสำเร็จ',
                    description: 'ผู้เช่าสามารถเข้าถึงข้อมูลได้แล้ว',
                    type: 'success',
                });
                onClose(); // Close to refresh (ideally should invalidate query)
                // In a perfect world we would use useQueryClient to invalidate 'tenants'
            }
        } catch (error: any) {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message,
                type: 'error',
            });
        } finally {
            setLinking(false);
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogContent maxH="90vh" overflowY="auto">
                <DialogHeader>
                    <DialogTitle>รายละเอียดผู้เช่า</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <VStack align="stretch" gap={6}>
                        {/* Header */}
                        <HStack justify="space-between" align="start">
                            <VStack align="start" gap={1}>
                                <Heading size="xl">{tenant.full_name}</Heading>
                                <Text color="gray.600">ID: {tenant.id_card_number}</Text>
                            </VStack>
                            <Badge colorPalette={statusColor} size="lg">
                                {statusLabel}
                            </Badge>
                        </HStack>

                        {/* ข้อมูลติดต่อ */}
                        <VStack align="stretch" gap={3}>
                            <Heading size="md">ข้อมูลติดต่อ</Heading>

                            <HStack gap={3}>
                                <Icon color="blue.500">
                                    <LuPhone />
                                </Icon>
                                <VStack align="start" gap={0}>
                                    <Text fontSize="sm" color="gray.600">
                                        เบอร์โทร
                                    </Text>
                                    <Text fontWeight="medium">{tenant.phone}</Text>
                                </VStack>
                            </HStack>

                            {tenant.email && (
                                <HStack gap={3}>
                                    <Icon color="blue.500">
                                        <LuMail />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="gray.600">
                                            อีเมล
                                        </Text>
                                        <Text fontWeight="medium">{tenant.email}</Text>
                                    </VStack>
                                </HStack>
                            )}

                            {tenant.room && (
                                <HStack gap={3}>
                                    <Icon color="blue.500">
                                        <LuMapPin />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="gray.600">
                                            ห้องที่เช่า
                                        </Text>
                                        <Text fontWeight="medium">
                                            {tenant.room.room_number} ({tenant.room.room_type})
                                        </Text>
                                    </VStack>
                                </HStack>
                            )}
                        </VStack>

                        {/* ข้อมูลติดต่อฉุกเฉิน */}
                        {tenant.emergency_contact && (
                            <VStack align="stretch" gap={3}>
                                <Heading size="md">ข้อมูลติดต่อฉุกเฉิน</Heading>

                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <VStack align="start" gap={1}>
                                        <Text fontSize="sm" color="gray.600">
                                            ชื่อผู้ติดต่อ
                                        </Text>
                                        <Text fontWeight="medium">{tenant.emergency_contact.name}</Text>
                                    </VStack>

                                    <VStack align="start" gap={1}>
                                        <Text fontSize="sm" color="gray.600">
                                            เบอร์โทร
                                        </Text>
                                        <Text fontWeight="medium">{tenant.emergency_contact.phone}</Text>
                                    </VStack>
                                </Grid>

                                <VStack align="start" gap={1}>
                                    <Text fontSize="sm" color="gray.600">
                                        ความสัมพันธ์
                                    </Text>
                                    <Text fontWeight="medium">{tenant.emergency_contact.relationship}</Text>
                                </VStack>
                            </VStack>
                        )}

                        {/* ข้อมูลการทำงาน */}
                        {(tenant.position_title || tenant.position_level || tenant.workplace) && (
                            <VStack align="stretch" gap={3}>
                                <Heading size="md">ข้อมูลการทำงาน</Heading>

                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    {tenant.position_title && (
                                        <VStack align="start" gap={1}>
                                            <Text fontSize="sm" color="gray.600">
                                                ชื่อตำแหน่ง
                                            </Text>
                                            <Text fontWeight="medium">{tenant.position_title}</Text>
                                        </VStack>
                                    )}

                                    {tenant.position_level && (
                                        <VStack align="start" gap={1}>
                                            <Text fontSize="sm" color="gray.600">
                                                ระดับ
                                            </Text>
                                            <Text fontWeight="medium">{tenant.position_level}</Text>
                                        </VStack>
                                    )}
                                </Grid>

                                {tenant.workplace && (
                                    <VStack align="start" gap={1}>
                                        <Text fontSize="sm" color="gray.600">
                                            สถานที่ทำงาน
                                        </Text>
                                        <Text fontWeight="medium">{tenant.workplace}</Text>
                                    </VStack>
                                )}
                            </VStack>
                        )}

                        {/* ข้อมูลรถ */}
                        {tenant.vehicles && tenant.vehicles.length > 0 && (
                            <VStack align="stretch" gap={3}>
                                <Heading size="md">ข้อมูลรถ ({tenant.vehicles.length} คัน)</Heading>

                                <VStack align="stretch" gap={3}>
                                    {tenant.vehicles.map((vehicle, index) => (
                                        <Box
                                            key={index}
                                            p={4}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            borderColor="gray.200"
                                            bg="gray.50"
                                        >
                                            <VStack align="stretch" gap={2}>
                                                <HStack justify="space-between">
                                                    <HStack gap={2}>
                                                        <Icon color="blue.500">
                                                            <LuCar />
                                                        </Icon>
                                                        <Text fontWeight="bold">
                                                            {getVehicleTypeLabel(vehicle.type)}
                                                        </Text>
                                                    </HStack>
                                                    <Badge colorPalette="blue">คันที่ {index + 1}</Badge>
                                                </HStack>

                                                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                    <VStack align="start" gap={0}>
                                                        <Text fontSize="sm" color="gray.600">
                                                            ทะเบียน
                                                        </Text>
                                                        <Text fontWeight="medium">{vehicle.plate}</Text>
                                                    </VStack>

                                                    <VStack align="start" gap={0}>
                                                        <Text fontSize="sm" color="gray.600">
                                                            จังหวัด
                                                        </Text>
                                                        <Text fontWeight="medium">{vehicle.province}</Text>
                                                    </VStack>
                                                </Grid>

                                                {(vehicle.brand || vehicle.color) && (
                                                    <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                        {vehicle.brand && (
                                                            <VStack align="start" gap={0}>
                                                                <Text fontSize="sm" color="gray.600">
                                                                    ยี่ห้อ/รุ่น
                                                                </Text>
                                                                <Text fontWeight="medium">{vehicle.brand}</Text>
                                                            </VStack>
                                                        )}

                                                        {vehicle.color && (
                                                            <VStack align="start" gap={0}>
                                                                <Text fontSize="sm" color="gray.600">
                                                                    สี
                                                                </Text>
                                                                <Text fontWeight="medium">{vehicle.color}</Text>
                                                            </VStack>
                                                        )}
                                                    </Grid>
                                                )}
                                            </VStack>
                                        </Box>
                                    ))}
                                </VStack>
                            </VStack>
                        )}

                        {/* ทะเบียนคุมรถยนต์ (อ่านอย่างเดียว - จัดการที่หน้าทะเบียนคุมรถยนต์) */}
                        {tenant.registered_vehicles && tenant.registered_vehicles.length > 0 && (
                            <VStack align="stretch" gap={3}>
                                <Heading size="md">
                                    ทะเบียนคุมรถยนต์ ({tenant.registered_vehicles.length} คัน)
                                </Heading>

                                <VStack align="stretch" gap={3}>
                                    {tenant.registered_vehicles.map((vehicle) => (
                                        <Box
                                            key={vehicle.id}
                                            p={4}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            borderColor="gray.200"
                                            bg="gray.50"
                                        >
                                            <VStack align="stretch" gap={2}>
                                                <HStack justify="space-between">
                                                    <HStack gap={2}>
                                                        <Icon color="blue.500">
                                                            <LuCar />
                                                        </Icon>
                                                        <Text fontWeight="bold">
                                                            {VEHICLE_TYPE_LABELS[vehicle.type]}
                                                        </Text>
                                                    </HStack>
                                                    {vehicle.has_sticker ? (
                                                        <Badge colorPalette="green">มีสติ๊กเกอร์</Badge>
                                                    ) : (
                                                        <Badge colorPalette="gray">ไม่มีสติ๊กเกอร์</Badge>
                                                    )}
                                                </HStack>

                                                <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                    <VStack align="start" gap={0}>
                                                        <Text fontSize="sm" color="gray.600">
                                                            ทะเบียน
                                                        </Text>
                                                        <Text fontWeight="medium">{vehicle.plate}</Text>
                                                    </VStack>

                                                    <VStack align="start" gap={0}>
                                                        <Text fontSize="sm" color="gray.600">
                                                            จังหวัด
                                                        </Text>
                                                        <Text fontWeight="medium">{vehicle.province}</Text>
                                                    </VStack>
                                                </Grid>

                                                {(vehicle.brand || vehicle.color) && (
                                                    <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                        {vehicle.brand && (
                                                            <VStack align="start" gap={0}>
                                                                <Text fontSize="sm" color="gray.600">
                                                                    ยี่ห้อ/รุ่น
                                                                </Text>
                                                                <Text fontWeight="medium">{vehicle.brand}</Text>
                                                            </VStack>
                                                        )}

                                                        {vehicle.color && (
                                                            <VStack align="start" gap={0}>
                                                                <Text fontSize="sm" color="gray.600">
                                                                    สี
                                                                </Text>
                                                                <Text fontWeight="medium">{vehicle.color}</Text>
                                                            </VStack>
                                                        )}
                                                    </Grid>
                                                )}
                                            </VStack>
                                        </Box>
                                    ))}
                                </VStack>

                                <Text fontSize="xs" color="gray.500">
                                    จัดการรถกลุ่มนี้ได้ที่หน้า "ทะเบียนคุมรถยนต์"
                                </Text>
                            </VStack>
                        )}

                        {/* วันที่ */}
                        {(tenant.move_in_date || tenant.move_out_date) && (
                            <VStack align="stretch" gap={3}>
                                <Heading size="md">ข้อมูลการเช่า</Heading>

                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    {tenant.move_in_date && (
                                        <VStack align="start" gap={1}>
                                            <Text fontSize="sm" color="gray.600">
                                                วันที่เริ่มเช่า
                                            </Text>
                                            <Text fontWeight="medium">
                                                {new Date(tenant.move_in_date).toLocaleDateString('th-TH')}
                                            </Text>
                                        </VStack>
                                    )}

                                    {tenant.move_out_date && (
                                        <VStack align="start" gap={1}>
                                            <Text fontSize="sm" color="gray.600">
                                                วันที่สิ้นสุด
                                            </Text>
                                            <Text fontWeight="medium">
                                                {new Date(tenant.move_out_date).toLocaleDateString('th-TH')}
                                            </Text>
                                        </VStack>
                                    )}
                                </Grid>
                            </VStack>
                        )}

                        {/* Metadata */}
                        <VStack align="stretch" gap={2} pt={4} borderTop="1px" borderColor="gray.200">
                            {/* User Linking Section */}
                            <HStack justify="space-between" bg="gray.50" p={3} borderRadius="md">
                                <VStack align="start" gap={1}>
                                    <Text fontSize="sm" fontWeight="bold" color="gray.700">
                                        บัญชีผู้ใช้งาน
                                    </Text>
                                    {tenant.user_id ? (
                                        <HStack gap={2}>
                                            <Icon color="green.500">
                                                <LuUser />
                                            </Icon>
                                            <Text fontSize="sm" color="green.600" fontWeight="medium">
                                                ผูกบัญชีเรียบร้อยแล้ว
                                            </Text>
                                        </HStack>
                                    ) : (
                                        <Text fontSize="sm" color="orange.600">
                                            ยังไม่ได้ผูกบัญชี (ผู้เช่าจะไม่เห็นข้อมูล)
                                        </Text>
                                    )}
                                </VStack>
                                {!tenant.user_id && (
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        colorPalette="blue"
                                        onClick={handleLinkUser}
                                        loading={linking}
                                    >
                                        ผูกบัญชีอัตโนมัติ
                                    </Button>
                                )}
                            </HStack>

                            <Text fontSize="sm" color="gray.500">
                                สร้างเมื่อ: {new Date(tenant.created_at).toLocaleString('th-TH')}
                            </Text>
                            {tenant.updated_at && (
                                <Text fontSize="sm" color="gray.500">
                                    อัปเดตล่าสุด: {new Date(tenant.updated_at).toLocaleString('th-TH')}
                                </Text>
                            )}
                        </VStack>
                    </VStack>
                </DialogBody>

                <DialogFooter>
                    <DialogActionTrigger asChild>
                        <Button variant="outline" onClick={onClose}>
                            ปิด
                        </Button>
                    </DialogActionTrigger>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
