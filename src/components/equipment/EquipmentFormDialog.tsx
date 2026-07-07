import React, { useEffect, useState } from 'react';
import { HStack, Icon, IconButton, Input, Text, VStack } from '@chakra-ui/react';
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
import { Button } from '../ui/button';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { useRooms } from '../../hooks/useRooms';
import { useUpdateRoomEquipment } from '../../hooks/useRooms';
import { createDefaultRoomEquipment, ROOM_EQUIPMENT_NAMES } from '../../lib/defaultRoomEquipment';
import { getRoomEquipmentIcon, getRoomEquipmentColor } from '../rooms/roomEquipmentMeta';
import type { Room, RoomEquipmentItem } from '../../types';

interface EquipmentFormDialogProps {
    open: boolean;
    onClose: () => void;
    room?: Room | null;
}

function uid(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

export const EquipmentFormDialog: React.FC<EquipmentFormDialogProps> = ({ open, onClose, room }) => {
    const [roomId, setRoomId] = useState('');
    const [items, setItems] = useState<RoomEquipmentItem[]>([]);

    const { data: rooms } = useRooms();
    const updateRoomEquipment = useUpdateRoomEquipment();

    const selectedRoom = (rooms || []).find((r) => r.id === roomId) || room || null;

    useEffect(() => {
        if (!open) return;

        if (room) {
            setRoomId(room.id);
            setItems(room.equipment && room.equipment.length > 0 ? room.equipment : createDefaultRoomEquipment());
        } else {
            setRoomId('');
            setItems([]);
        }
    }, [open, room]);

    const handleRoomChange = (newRoomId: string) => {
        setRoomId(newRoomId);
        const target = (rooms || []).find((r) => r.id === newRoomId);
        setItems(target?.equipment && target.equipment.length > 0 ? target.equipment : createDefaultRoomEquipment());
    };

    const handleAddItem = () => setItems([...items, { id: uid(), name: ROOM_EQUIPMENT_NAMES[0], asset_number: '' }]);
    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const handleItemChange = (index: number, field: keyof RoomEquipmentItem, value: string) => {
        const next = [...items];
        next[index] = { ...next[index], [field]: value };
        setItems(next);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId) return;

        await updateRoomEquipment.mutateAsync({ id: roomId, equipment: items });
        onClose();
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="xl">
            <DialogContent maxH="90vh" overflowY="auto">
                <DialogHeader>
                    <DialogTitle>
                        {selectedRoom ? `ครุภัณฑ์ประจำห้อง ${selectedRoom.room_number}` : 'เพิ่ม/แก้ไขครุภัณฑ์'}
                    </DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <DialogBody>
                        <VStack align="stretch" gap={4}>
                            <Field label="เลขห้อง" required>
                                <NativeSelectRoot disabled={!!room}>
                                    <NativeSelectField value={roomId} onChange={(e) => handleRoomChange(e.target.value)}>
                                        <option value="">เลือกเลขห้อง</option>
                                        {(rooms || []).map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.room_number}
                                                {r.current_tenant ? ` (${r.current_tenant.full_name})` : ''}
                                            </option>
                                        ))}
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Field>

                            {roomId && (
                                <VStack align="stretch" gap={3}>
                                    {items.map((item, index) => {
                                        const ItemIcon = getRoomEquipmentIcon(item.name);
                                        return (
                                            <HStack key={item.id} gap={3} p={2} borderBottomWidth="1px" borderColor="border.muted">
                                                <Icon fontSize="xl" color={getRoomEquipmentColor(item.name)}>
                                                    <ItemIcon />
                                                </Icon>

                                                <NativeSelectRoot flex={1}>
                                                    <NativeSelectField
                                                        value={item.name}
                                                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                    >
                                                        {ROOM_EQUIPMENT_NAMES.map((name) => (
                                                            <option key={name} value={name}>
                                                                {name}
                                                            </option>
                                                        ))}
                                                    </NativeSelectField>
                                                </NativeSelectRoot>

                                                <Input
                                                    value={item.asset_number || ''}
                                                    onChange={(e) => handleItemChange(index, 'asset_number', e.target.value)}
                                                    placeholder="เลขครุภัณฑ์"
                                                    flex={1}
                                                    minW="220px"
                                                />

                                                <IconButton
                                                    size="sm"
                                                    colorPalette="red"
                                                    variant="ghost"
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    aria-label="ลบรายการ"
                                                >
                                                    <LuTrash2 />
                                                </IconButton>
                                            </HStack>
                                        );
                                    })}

                                    <Button size="sm" type="button" alignSelf="flex-start" onClick={handleAddItem}>
                                        <Icon mr={1}>
                                            <LuPlus />
                                        </Icon>
                                        เพิ่มรายการ
                                    </Button>

                                    {items.length === 0 && (
                                        <Text color="fg.muted" fontSize="sm">
                                            ยังไม่มีรายการครุภัณฑ์
                                        </Text>
                                    )}
                                </VStack>
                            )}
                        </VStack>
                    </DialogBody>

                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline" onClick={onClose}>
                                ยกเลิก
                            </Button>
                        </DialogActionTrigger>
                        <Button type="submit" colorPalette="blue" disabled={!roomId || updateRoomEquipment.isPending}>
                            บันทึก
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </DialogRoot>
    );
};
