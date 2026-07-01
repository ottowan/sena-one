import React, { useState, useEffect } from 'react';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogBackdrop,
    DialogCloseTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input, VStack, Text, Textarea } from '@chakra-ui/react';
import { Field } from '../ui/field';
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { useTransferContract } from '../../hooks/useContracts';
import { useRooms } from '../../hooks/useRooms';
import type { Contract } from '../../types';
import { formatThaiShortDate } from '../../lib/utils';

interface TransferContractDialogProps {
    open: boolean;
    onClose: () => void;
    contract: Contract | null;
}

export const TransferContractDialog: React.FC<TransferContractDialogProps> = ({
    open,
    onClose,
    contract,
}) => {
    const transferContract = useTransferContract();
    const { data: allRooms } = useRooms();

    // Filter available rooms (exclude current room)
    const availableRooms = allRooms?.filter(
        (room) => room.status === 'available' && room.id !== contract?.room_id
    ) || [];

    const [formData, setFormData] = useState({
        new_room_id: '',
        transfer_date: '',
        reason: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (contract && open) {
            setFormData({
                new_room_id: '',
                transfer_date: new Date().toISOString().split('T')[0],
                reason: '',
            });
            setErrors({});
        }
    }, [contract, open]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.new_room_id) {
            newErrors.new_room_id = 'กรุณาเลือกห้องใหม่';
        }
        if (!formData.transfer_date) {
            newErrors.transfer_date = 'กรุณาระบุวันที่โอน';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contract || !validateForm()) return;

        const newRoom = allRooms?.find((r) => r.id === formData.new_room_id);

        // Confirmation dialog
        const confirmed = window.confirm(
            `ยืนยันการย้ายห้อง?\n\n` +
            `ผู้เช่า: ${contract.tenant?.full_name}\n` +
            `จากห้อง: ${contract.room?.room_number}\n` +
            `ไปห้อง: ${newRoom?.room_number}\n` +
            `วันที่โอน: ${formatThaiShortDate(formData.transfer_date)}\n\n` +
            `การย้ายห้องจะอัปเดตสัญญาและสถานะห้องทั้งสองห้อง`
        );

        if (!confirmed) return;

        transferContract.mutate(
            {
                id: contract.id,
                data: {
                    new_room_id: formData.new_room_id,
                    transfer_date: formData.transfer_date,
                    reason: formData.reason,
                },
            },
            {
                onSuccess: () => {
                    onClose();
                },
            }
        );
    };

    if (!contract) return null;

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ย้ายห้อง</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <form onSubmit={handleSubmit} id="transfer-contract-form">
                        <VStack align="stretch" gap={4}>
                            <Text fontSize="sm" color="gray.600">
                                ย้ายห้องสำหรับ: <strong>{contract.tenant?.full_name}</strong>
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                                ห้องปัจจุบัน: <strong>{contract.room?.room_number}</strong>
                            </Text>

                            <Field
                                label="ห้องใหม่"
                                required
                                invalid={!!errors.new_room_id}
                                errorText={errors.new_room_id}
                            >
                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={formData.new_room_id}
                                        onChange={(e) =>
                                            setFormData({ ...formData, new_room_id: e.target.value })
                                        }
                                    >
                                        <option value="">เลือกห้องใหม่</option>
                                        {availableRooms.map((room) => (
                                            <option key={room.id} value={room.id}>
                                                {room.room_number} - {room.room_type} (฿
                                                {room.monthly_rent?.toLocaleString()})
                                            </option>
                                        ))}
                                    </NativeSelectField>
                                </NativeSelectRoot>
                                {availableRooms.length === 0 && (
                                    <Text fontSize="sm" color="red.500" mt={1}>
                                        ไม่มีห้องว่างในขณะนี้
                                    </Text>
                                )}
                            </Field>

                            <Field
                                label="วันที่โอน"
                                required
                                invalid={!!errors.transfer_date}
                                errorText={errors.transfer_date}
                            >
                                <Input
                                    type="date"
                                    value={formData.transfer_date}
                                    onChange={(e) =>
                                        setFormData({ ...formData, transfer_date: e.target.value })
                                    }
                                />
                            </Field>

                            <Field label="เหตุผล (ถ้ามี)">
                                <Textarea
                                    value={formData.reason}
                                    onChange={(e) =>
                                        setFormData({ ...formData, reason: e.target.value })
                                    }
                                    placeholder="ระบุเหตุผลในการย้ายห้อง..."
                                    rows={3}
                                />
                            </Field>

                            <Text fontSize="sm" color="orange.600" fontWeight="medium">
                                หมายเหตุ: การย้ายห้องจะทำให้ห้องเดิมว่างและห้องใหม่ถูกจอง
                            </Text>
                        </VStack>
                    </form>
                </DialogBody>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        ยกเลิก
                    </Button>
                    <Button
                        type="submit"
                        form="transfer-contract-form"
                        colorPalette="blue"
                        disabled={transferContract.isPending || availableRooms.length === 0}
                    >
                        ย้ายห้อง
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
