import React, { useEffect, useState } from 'react';
import { Box, Grid, HStack, Heading, Icon, IconButton, Input, Text, VStack } from '@chakra-ui/react';
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
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { useRooms } from '../../hooks/useRooms';
import { useVehicleRegistry, useAddVehicles, useUpdateVehicle } from '../../hooks/useVehicleRegistry';
import { THAI_PROVINCES } from '../../lib/constants';
import { VehicleType, type VehicleRegistration, type VehicleRegistrationFormData } from '../../types';
import { VEHICLE_TYPE_LABELS } from './vehicleMeta';

interface VehicleFormDialogProps {
    open: boolean;
    onClose: () => void;
    vehicle?: VehicleRegistration | null;
}

const emptyRow = (): VehicleRegistrationFormData => ({
    type: VehicleType.CAR,
    plate: '',
    province: 'กรุงเทพมหานคร',
    brand: '',
    color: '',
    has_sticker: false,
});

export const VehicleFormDialog: React.FC<VehicleFormDialogProps> = ({ open, onClose, vehicle }) => {
    const isEdit = !!vehicle;
    const [roomId, setRoomId] = useState('');
    const [rows, setRows] = useState<VehicleRegistrationFormData[]>([emptyRow()]);

    const { data: rooms } = useRooms();
    const { data: vehicles } = useVehicleRegistry();
    const addVehicles = useAddVehicles();
    const updateVehicle = useUpdateVehicle();

    useEffect(() => {
        if (!open) return;

        if (vehicle) {
            setRoomId(vehicle.room_id);
            setRows([
                {
                    type: vehicle.type,
                    plate: vehicle.plate,
                    province: vehicle.province,
                    brand: vehicle.brand || '',
                    color: vehicle.color || '',
                    has_sticker: vehicle.has_sticker,
                },
            ]);
        } else {
            setRoomId('');
            setRows([emptyRow()]);
        }
    }, [open, vehicle]);

    const currentRoomVehicles = roomId
        ? (vehicles || []).filter((v) => v.room_id === roomId && v.id !== vehicle?.id)
        : [];

    const handleAddRow = () => setRows([...rows, emptyRow()]);
    const handleRemoveRow = (index: number) => setRows(rows.filter((_, i) => i !== index));
    const handleRowChange = (index: number, field: keyof VehicleRegistrationFormData, value: string | boolean) => {
        const next = [...rows];
        next[index] = { ...next[index], [field]: value };
        setRows(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId) return;

        if (isEdit && vehicle) {
            if (rows[0].plate.trim() === '') return;
            await updateVehicle.mutateAsync({ id: vehicle.id, data: { room_id: roomId, ...rows[0] } });
            onClose();
            return;
        }

        const validRows = rows.filter((row) => row.plate.trim() !== '');
        if (validRows.length === 0) return;

        await addVehicles.mutateAsync({ roomId, vehicles: validRows });
        onClose();
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogContent maxH="90vh" overflowY="auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'แก้ไขข้อมูลรถ' : 'เพิ่มข้อมูลรถ'}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <DialogBody>
                        <VStack gap={6} align="stretch">
                            <Field label="เลขห้อง" required>
                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={roomId}
                                        onChange={(e) => setRoomId(e.target.value)}
                                    >
                                        <option value="">เลือกเลขห้อง</option>
                                        {(rooms || []).map((room) => (
                                            <option key={room.id} value={room.id}>
                                                {room.room_number}
                                                {room.current_tenant ? ` (${room.current_tenant.full_name})` : ''}
                                            </option>
                                        ))}
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Field>

                            {roomId && (
                                <Box>
                                    <Text fontWeight="medium" fontSize="sm" mb={2}>
                                        {isEdit ? 'รถคันอื่นในห้องนี้' : 'รถที่มีปัจจุบันในห้องนี้'} ({currentRoomVehicles.length} คัน)
                                    </Text>
                                    {currentRoomVehicles.length === 0 ? (
                                        <Text color="fg.muted" fontSize="sm">
                                            ยังไม่มีรถลงทะเบียนสำหรับห้องนี้
                                        </Text>
                                    ) : (
                                        <VStack align="stretch" gap={1}>
                                            {currentRoomVehicles.map((vehicle) => (
                                                <HStack key={vehicle.id} fontSize="sm" color="fg.muted" justify="space-between">
                                                    <Text>{VEHICLE_TYPE_LABELS[vehicle.type]}</Text>
                                                    <Text>{vehicle.plate}</Text>
                                                    <Text>{vehicle.province}</Text>
                                                    <Text>{vehicle.brand || '-'}</Text>
                                                    <Text>{vehicle.color || '-'}</Text>
                                                </HStack>
                                            ))}
                                        </VStack>
                                    )}
                                </Box>
                            )}

                            <VStack align="stretch" gap={4}>
                                <HStack justify="space-between">
                                    <Heading size="md">{isEdit ? 'ข้อมูลรถ' : 'เพิ่มรถ'}</Heading>
                                    {!isEdit && (
                                        <Button size="sm" type="button" onClick={handleAddRow}>
                                            <Icon mr={1}>
                                                <LuPlus />
                                            </Icon>
                                            เพิ่มอีกคัน
                                        </Button>
                                    )}
                                </HStack>

                                <VStack align="stretch" gap={4}>
                                    {rows.map((row, index) => (
                                        <VStack
                                            key={index}
                                            align="stretch"
                                            gap={3}
                                            p={4}
                                            borderWidth="1px"
                                            borderRadius="md"
                                            borderColor="border.default"
                                        >
                                            <HStack justify="space-between">
                                                <Text fontWeight="medium">รถคันที่ {index + 1}</Text>
                                                {rows.length > 1 && (
                                                    <IconButton
                                                        size="sm"
                                                        colorPalette="red"
                                                        variant="ghost"
                                                        type="button"
                                                        onClick={() => handleRemoveRow(index)}
                                                        aria-label="ลบรถ"
                                                    >
                                                        <LuTrash2 />
                                                    </IconButton>
                                                )}
                                            </HStack>

                                            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                <Field label="ประเภทรถ" required>
                                                    <NativeSelectRoot>
                                                        <NativeSelectField
                                                            value={row.type}
                                                            onChange={(e) =>
                                                                handleRowChange(index, 'type', e.target.value)
                                                            }
                                                        >
                                                            <option value={VehicleType.PICKUP}>รถกระบะ</option>
                                                            <option value={VehicleType.CAR}>รถเก๋ง</option>
                                                            <option value={VehicleType.MOTORCYCLE}>รถมอเตอร์ไซค์</option>
                                                        </NativeSelectField>
                                                    </NativeSelectRoot>
                                                </Field>

                                                <Field label="เลขทะเบียน" required>
                                                    <Input
                                                        value={row.plate}
                                                        onChange={(e) => handleRowChange(index, 'plate', e.target.value)}
                                                        placeholder="เช่น กข 1234"
                                                    />
                                                </Field>
                                            </Grid>

                                            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                                <Field label="จังหวัด" required>
                                                    <NativeSelectRoot>
                                                        <NativeSelectField
                                                            value={row.province}
                                                            onChange={(e) =>
                                                                handleRowChange(index, 'province', e.target.value)
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
                                                        value={row.brand}
                                                        onChange={(e) => handleRowChange(index, 'brand', e.target.value)}
                                                        placeholder="เช่น Toyota Hilux"
                                                    />
                                                </Field>
                                            </Grid>

                                            <Field label="สี">
                                                <Input
                                                    value={row.color}
                                                    onChange={(e) => handleRowChange(index, 'color', e.target.value)}
                                                    placeholder="เช่น ขาว, ดำ, แดง"
                                                />
                                            </Field>

                                            <Checkbox
                                                checked={row.has_sticker}
                                                onCheckedChange={(e) =>
                                                    handleRowChange(index, 'has_sticker', !!e.checked)
                                                }
                                            >
                                                มีสติ๊กเกอร์
                                            </Checkbox>
                                        </VStack>
                                    ))}
                                </VStack>
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
                            disabled={!roomId || addVehicles.isPending || updateVehicle.isPending}
                        >
                            บันทึก
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </DialogRoot>
    );
};
