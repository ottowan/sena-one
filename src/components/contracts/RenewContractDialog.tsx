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
import { Input, VStack, Grid, Text } from '@chakra-ui/react';
import { Field } from '../ui/field';
import { useRenewContract } from '../../hooks/useContracts';
import type { Contract } from '../../types';
import { formatThaiShortDate } from '../../lib/utils';

interface RenewContractDialogProps {
    open: boolean;
    onClose: () => void;
    contract: Contract | null;
}

export const RenewContractDialog: React.FC<RenewContractDialogProps> = ({
    open,
    onClose,
    contract,
}) => {
    const renewContract = useRenewContract();

    const [formData, setFormData] = useState({
        end_date: '',
        monthly_rent: '',
        deposit_amount: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (contract && open) {
            // Calculate new end date (4 years from current end date)
            const currentEndDate = new Date(contract.end_date);
            const newEndDate = new Date(currentEndDate);
            newEndDate.setFullYear(newEndDate.getFullYear() + 4);

            setFormData({
                end_date: newEndDate.toISOString().split('T')[0],
                monthly_rent: contract.monthly_rent?.toString() || '',
                deposit_amount: contract.deposit_amount?.toString() || '',
            });
            setErrors({});
        }
    }, [contract, open]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.end_date) newErrors.end_date = 'กรุณาระบุวันที่สิ้นสุดสัญญาใหม่';
        if (!formData.monthly_rent) newErrors.monthly_rent = 'กรุณาระบุค่าเช่า';
        if (!formData.deposit_amount) newErrors.deposit_amount = 'กรุณาระบุค่ามัดจำ';

        // Validate end date is after current end date
        if (contract && formData.end_date) {
            const currentEndDate = new Date(contract.end_date);
            const newEndDate = new Date(formData.end_date);
            if (newEndDate <= currentEndDate) {
                newErrors.end_date = 'วันที่สิ้นสุดใหม่ต้องมากกว่าวันที่สิ้นสุดเดิม';
            }
        }

        // Validate numbers
        if (formData.monthly_rent && parseFloat(formData.monthly_rent) <= 0) {
            newErrors.monthly_rent = 'ค่าเช่าต้องมากกว่า 0';
        }
        if (formData.deposit_amount && parseFloat(formData.deposit_amount) < 0) {
            newErrors.deposit_amount = 'ค่ามัดจำต้องไม่ติดลบ';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contract || !validateForm()) return;

        // Confirmation dialog
        const confirmed = window.confirm(
            `ยืนยันการต่อสัญญา?\n\n` +
            `ผู้เช่า: ${contract.tenant?.full_name}\n` +
            `ห้อง: ${contract.room?.room_number}\n` +
            `วันสิ้นสุดใหม่: ${formatThaiShortDate(formData.end_date)}\n` +
            `ค่าเช่า: ฿${parseFloat(formData.monthly_rent).toLocaleString()}\n\n` +
            `การต่อสัญญาจะสร้างสัญญาใหม่และทำให้สัญญาเดิมมีสถานะ "ต่ออายุแล้ว"`
        );

        if (!confirmed) return;

        renewContract.mutate(
            {
                id: contract.id,
                data: {
                    end_date: formData.end_date,
                    monthly_rent: parseFloat(formData.monthly_rent),
                    deposit_amount: parseFloat(formData.deposit_amount),
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
                    <DialogTitle>ต่อสัญญา</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <form onSubmit={handleSubmit} id="renew-contract-form">
                        <VStack align="stretch" gap={4}>
                            <Text fontSize="sm" color="fg.muted">
                                ต่อสัญญาสำหรับ: <strong>{contract.tenant?.full_name}</strong>
                            </Text>
                            <Text fontSize="sm" color="fg.muted">
                                ห้อง: <strong>{contract.room?.room_number}</strong>
                            </Text>
                            <Text fontSize="sm" color="fg.muted">
                                สัญญาเดิมสิ้นสุด:{' '}
                                <strong>
                                    {formatThaiShortDate(contract.end_date)}
                                </strong>
                            </Text>

                            <Field
                                label="วันที่สิ้นสุดสัญญาใหม่"
                                required
                                invalid={!!errors.end_date}
                                errorText={errors.end_date}
                                helperText="ค่าเริ่มต้น: +4 ปี จากสัญญาเดิม"
                            >
                                <Input
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) =>
                                        setFormData({ ...formData, end_date: e.target.value })
                                    }
                                />
                            </Field>

                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <Field
                                    label="ค่าเช่า/เดือน (บาท)"
                                    required
                                    invalid={!!errors.monthly_rent}
                                    errorText={errors.monthly_rent}
                                >
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.monthly_rent}
                                        onChange={(e) =>
                                            setFormData({ ...formData, monthly_rent: e.target.value })
                                        }
                                    />
                                </Field>

                                <Field
                                    label="ค่ามัดจำ (บาท)"
                                    required
                                    invalid={!!errors.deposit_amount}
                                    errorText={errors.deposit_amount}
                                >
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.deposit_amount}
                                        onChange={(e) =>
                                            setFormData({ ...formData, deposit_amount: e.target.value })
                                        }
                                    />
                                </Field>
                            </Grid>

                            <Text fontSize="sm" color="orange.fg" fontWeight="medium">
                                หมายเหตุ: การต่อสัญญาจะสร้างสัญญาใหม่และทำให้สัญญาเดิมมีสถานะ "ต่ออายุแล้ว"
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
                        form="renew-contract-form"
                        colorPalette="blue"
                        disabled={renewContract.isPending}
                    >
                        ต่อสัญญา
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
