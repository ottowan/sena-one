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
import { useCancelContract } from '../../hooks/useContracts';
import type { Contract } from '../../types';

interface CancelContractDialogProps {
    open: boolean;
    onClose: () => void;
    contract: Contract | null;
}

export const CancelContractDialog: React.FC<CancelContractDialogProps> = ({
    open,
    onClose,
    contract,
}) => {
    const cancelContract = useCancelContract();

    const [formData, setFormData] = useState({
        cancellation_date: '',
        reason: '',
        refund_deposit: 'true',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (contract && open) {
            setFormData({
                cancellation_date: new Date().toISOString().split('T')[0],
                reason: '',
                refund_deposit: 'true',
            });
            setErrors({});
        }
    }, [contract, open]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.cancellation_date) {
            newErrors.cancellation_date = 'กรุณาระบุวันที่ยกเลิก';
        }
        if (!formData.reason.trim()) {
            newErrors.reason = 'กรุณาระบุเหตุผลในการยกเลิก';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contract || !validateForm()) return;

        cancelContract.mutate(
            {
                id: contract.id,
                data: {
                    cancellation_date: formData.cancellation_date,
                    reason: formData.reason,
                    refund_deposit: formData.refund_deposit === 'true',
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
                    <DialogTitle>ยกเลิกสัญญา</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <form onSubmit={handleSubmit} id="cancel-contract-form">
                        <VStack align="stretch" gap={4}>
                            <Text fontSize="sm" color="fg.muted">
                                ยกเลิกสัญญาสำหรับ: <strong>{contract.tenant?.full_name}</strong>
                            </Text>
                            <Text fontSize="sm" color="fg.muted">
                                ห้อง: <strong>{contract.room?.room_number}</strong>
                            </Text>
                            <Text fontSize="sm" color="fg.muted">
                                ค่ามัดจำ:{' '}
                                <strong>฿{contract.deposit_amount?.toLocaleString() || '0'}</strong>
                            </Text>

                            <Field
                                label="วันที่ยกเลิก"
                                required
                                invalid={!!errors.cancellation_date}
                                errorText={errors.cancellation_date}
                            >
                                <Input
                                    type="date"
                                    value={formData.cancellation_date}
                                    onChange={(e) =>
                                        setFormData({ ...formData, cancellation_date: e.target.value })
                                    }
                                />
                            </Field>

                            <Field
                                label="เหตุผลในการยกเลิก"
                                required
                                invalid={!!errors.reason}
                                errorText={errors.reason}
                            >
                                <Textarea
                                    value={formData.reason}
                                    onChange={(e) =>
                                        setFormData({ ...formData, reason: e.target.value })
                                    }
                                    placeholder="ระบุเหตุผลในการยกเลิกสัญญา..."
                                    rows={4}
                                />
                            </Field>

                            <Field label="คืนค่ามัดจำ" required>
                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={formData.refund_deposit}
                                        onChange={(e) =>
                                            setFormData({ ...formData, refund_deposit: e.target.value })
                                        }
                                    >
                                        <option value="true">คืนค่ามัดจำ</option>
                                        <option value="false">ไม่คืนค่ามัดจำ</option>
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Field>

                            <Text fontSize="sm" color="red.fg" fontWeight="medium">
                                คำเตือน: การยกเลิกสัญญาจะทำให้ห้องกลับมาว่างและผู้เช่าจะมีสถานะเป็น
                                "ไม่ได้เช่า"
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
                        form="cancel-contract-form"
                        colorPalette="red"
                        disabled={cancelContract.isPending}
                    >
                        ยืนยันการยกเลิก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
