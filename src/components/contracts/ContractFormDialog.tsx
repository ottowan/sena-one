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
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { useCreateContract, useUpdateContract, useContracts } from '../../hooks/useContracts';
import { useTenants } from '../../hooks/useTenants';
import { useRooms } from '../../hooks/useRooms';
import { useRentRates } from '../../hooks/useSettings';
import type { Contract, ContractStatus } from '../../types';

interface ContractFormDialogProps {
    open: boolean;
    onClose: () => void;
    contract?: Contract | null;
}

export const ContractFormDialog: React.FC<ContractFormDialogProps> = ({
    open,
    onClose,
    contract,
}) => {
    const isEdit = !!contract;
    const createContract = useCreateContract();
    const updateContract = useUpdateContract();

    // Fetch tenants and available rooms
    const { data: tenants } = useTenants();
    const { data: allRooms } = useRooms();
    const { data: allContracts } = useContracts();

    // Filter available rooms (exclude rooms with active contracts or maintenance)
    const availableRooms = allRooms?.filter((room) => {
        // If editing, allow the current room
        if (isEdit && contract && room.id === contract.room_id) {
            return true;
        }
        // Exclude rooms in maintenance status
        if (room.status === 'maintenance') {
            return false;
        }
        // Check if room has an active contract
        const hasActiveContract = allContracts?.some(
            (c) => c.room_id === room.id && c.status === 'active'
        );
        return !hasActiveContract;
    }) || [];
    
    const rooms = isEdit ? allRooms : availableRooms;

    // Filter available tenants (exclude tenants with active contracts)
    const availableTenants = tenants?.filter((tenant) => {
        // If editing, allow the current tenant
        if (isEdit && contract && tenant.id === contract.tenant_id) {
            return true;
        }
        // Check if tenant has an active contract
        const hasActiveContract = allContracts?.some(
            (c) => c.tenant_id === tenant.id && c.status === 'active'
        );
        return !hasActiveContract;
    }) || [];

    const [formData, setFormData] = useState({
        tenant_id: '',
        room_id: '',
        start_date: '',
        end_date: '',
        monthly_rent: '',
        deposit_amount: '',
        status: 'active' as ContractStatus,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize form data when contract changes
    useEffect(() => {
        if (contract) {
            setFormData({
                tenant_id: contract.tenant_id,
                room_id: contract.room_id,
                start_date: contract.start_date.split('T')[0],
                end_date: contract.end_date.split('T')[0],
                monthly_rent: contract.monthly_rent?.toString() || '',
                deposit_amount: contract.deposit_amount?.toString() || '',
                status: contract.status,
            });
        } else {
            setFormData({
                tenant_id: '',
                room_id: '',
                start_date: '',
                end_date: '',
                monthly_rent: '',
                deposit_amount: '',
                status: 'active' as ContractStatus,
            });
        }
        setErrors({});
    }, [contract, open]);

    // Fetch rent rates
    const { data: rentRates } = useRentRates();

    // Auto-calculate rent based on tenant position
    useEffect(() => {
        if (!isEdit && formData.tenant_id && tenants && rentRates) {
            const selectedTenant = tenants.find(t => t.id === formData.tenant_id);
            if (selectedTenant?.position_level) {
                const rate = rentRates.find(r => r.position_level === selectedTenant.position_level);

                if (rate && rate.rent_amount > 0) {
                    setFormData(prev => ({
                        ...prev,
                        monthly_rent: rate.rent_amount.toString()
                    }));
                }
            }
        }
    }, [formData.tenant_id, tenants, rentRates, isEdit]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.tenant_id) newErrors.tenant_id = 'กรุณาเลือกผู้เช่า';
        if (!formData.room_id) newErrors.room_id = 'กรุณาเลือกห้อง';
        if (!formData.start_date) newErrors.start_date = 'กรุณาระบุวันที่เริ่มสัญญา';
        if (!formData.end_date) newErrors.end_date = 'กรุณาระบุวันที่สิ้นสุดสัญญา';
        if (!formData.monthly_rent) newErrors.monthly_rent = 'กรุณาระบุค่าเช่า';
        if (!formData.deposit_amount) newErrors.deposit_amount = 'กรุณาระบุค่ามัดจำ';

        // Validate dates
        if (formData.start_date && formData.end_date) {
            const start = new Date(formData.start_date);
            const end = new Date(formData.end_date);
            if (end <= start) {
                newErrors.end_date = 'วันที่สิ้นสุดต้องมากกว่าวันที่เริ่มสัญญา';
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

        if (!validateForm()) return;

        const contractData = {
            tenant_id: formData.tenant_id,
            room_id: formData.room_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            monthly_rent: parseFloat(formData.monthly_rent),
            deposit_amount: parseFloat(formData.deposit_amount),
            status: formData.status,
        };

        if (isEdit && contract) {
            updateContract.mutate(
                { id: contract.id, data: contractData },
                {
                    onSuccess: () => {
                        onClose();
                    },
                }
            );
        } else {
            createContract.mutate(contractData as any, {
                onSuccess: () => {
                    onClose();
                },
            });
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'แก้ไขสัญญา' : 'สร้างสัญญาใหม่'}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <form onSubmit={handleSubmit} id="contract-form">
                        <VStack align="stretch" gap={4}>
                            {/* Tenant Selection */}
                            <Field
                                label="ผู้เช่า"
                                required
                                invalid={!!errors.tenant_id}
                                errorText={errors.tenant_id}
                            >
                                <NativeSelectRoot disabled={isEdit}>
                                    <NativeSelectField
                                        value={formData.tenant_id}
                                        onChange={(e) =>
                                            setFormData({ ...formData, tenant_id: e.target.value })
                                        }
                                    >
                                        <option value="">เลือกผู้เช่า</option>
                                        {availableTenants?.map((tenant) => (
                                            <option key={tenant.id} value={tenant.id}>
                                                {tenant.full_name} ({tenant.phone})
                                            </option>
                                        ))}
                                    </NativeSelectField>
                                </NativeSelectRoot>
                                {!isEdit && availableTenants.length === 0 && (
                                    <Text fontSize="sm" color="red.500" mt={1}>
                                        ไม่มีผู้เช่าที่สามารถทำสัญญาได้ในขณะนี้
                                    </Text>
                                )}
                            </Field>

                            {/* Room Selection */}
                            <Field
                                label="ห้อง"
                                required
                                invalid={!!errors.room_id}
                                errorText={errors.room_id}
                            >
                                <NativeSelectRoot disabled={isEdit}>
                                    <NativeSelectField
                                        value={formData.room_id}
                                        onChange={(e) =>
                                            setFormData({ ...formData, room_id: e.target.value })
                                        }
                                    >
                                        <option value="">เลือกห้อง</option>
                                        {availableRooms?.map((room) => (
                                            <option key={room.id} value={room.id}>
                                                {room.room_number} - {room.room_type} (฿
                                                {room.monthly_rent?.toLocaleString()})
                                            </option>
                                        ))}
                                    </NativeSelectField>
                                </NativeSelectRoot>
                                {!isEdit && availableRooms.length === 0 && (
                                    <Text fontSize="sm" color="red.500" mt={1}>
                                        ไม่มีห้องว่างในขณะนี้
                                    </Text>
                                )}
                            </Field>

                            {/* Dates */}
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <Field
                                    label="วันที่เริ่มสัญญา"
                                    required
                                    invalid={!!errors.start_date}
                                    errorText={errors.start_date}
                                >
                                    <Input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, start_date: e.target.value })
                                        }
                                    />
                                </Field>

                                <Field
                                    label="วันที่สิ้นสุดสัญญา"
                                    required
                                    invalid={!!errors.end_date}
                                    errorText={errors.end_date}
                                >
                                    <Input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, end_date: e.target.value })
                                        }
                                    />
                                </Field>
                            </Grid>

                            {/* Financial */}
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

                            {/* Status */}
                            {isEdit && (
                                <Field label="สถานะ" required>
                                    <NativeSelectRoot>
                                        <NativeSelectField
                                            value={formData.status}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    status: e.target.value as ContractStatus,
                                                })
                                            }
                                        >
                                            <option value="active">กำลังใช้งาน</option>
                                            <option value="expired">หมดอายุ</option>
                                            <option value="terminated">ยกเลิก</option>
                                            <option value="renewed">ต่ออายุแล้ว</option>
                                        </NativeSelectField>
                                    </NativeSelectRoot>
                                </Field>
                            )}
                        </VStack>
                    </form>
                </DialogBody>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        ยกเลิก
                    </Button>
                    <Button
                        type="submit"
                        form="contract-form"
                        colorPalette="blue"
                        disabled={createContract.isPending || updateContract.isPending}
                    >
                        {isEdit ? 'บันทึก' : 'สร้างสัญญา'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
