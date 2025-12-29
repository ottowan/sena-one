import React, { useState, useEffect } from 'react';
import {
    DialogRoot,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
    DialogCloseTrigger,
    DialogBackdrop,
} from '../../components/ui/dialog';
import {
    Button,
    Input,
    VStack,
    HStack,
    Text,
    Box,
    Grid,
    NativeSelectRoot,
    NativeSelectField,
    createListCollection,
    IconButton,
    Icon,
} from '@chakra-ui/react';
import { Field } from '../../components/ui/field';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoiceService } from '../../services/invoiceService';
import type { InvoiceFormData, AdditionalCharge } from '../../types';
import { toaster } from '../../components/ui/toaster';
import { useContracts } from '../../hooks/useContracts';
import { useAppSettings, useRentRates } from '../../hooks/useSettings';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { useLastMeterReading, useMeterReadingByMonth } from '../../hooks/useInvoices'; // Assume this hook exists or we import standard query

interface InvoiceFormDialogProps {
    open: boolean;
    onClose: () => void;
}

export const InvoiceFormDialog: React.FC<InvoiceFormDialogProps> = ({ open, onClose }) => {
    const queryClient = useQueryClient();
    const { data: contracts } = useContracts();
    const [formData, setFormData] = useState({
        contract_id: '',
        billing_month: new Date().toISOString().slice(0, 7),
        water_usage: '',
        water_meter_last: '0',
        water_meter_current: '',
        electricity_usage: '',
        electricity_meter_last: '0',
        electricity_meter_current: '',
        due_date: new Date().toISOString().slice(0, 8) + '05',
    });
    const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
    const [calculatedRent, setCalculatedRent] = useState<number>(0);

    const createInvoice = useMutation({
        mutationFn: invoiceService.createInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toaster.create({
                title: 'สร้างใบแจ้งหนี้สำเร็จ',
                type: 'success',
            });
            onClose();
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message,
                type: 'error',
            });
        },
    });

    // Get selected contract's room ID
    const selectedContract = contracts?.find(c => c.id === formData.contract_id);
    const roomId = selectedContract?.room_id || '';

    // Fetch last meter reading (Fallback)
    const { data: lastReading } = useLastMeterReading(roomId);

    // Fetch Meter Reading for the Billing Month (Target Current)
    const { data: currentMonthReading } = useMeterReadingByMonth(roomId, formData.billing_month);

    // Fetch Meter Reading for Previous Month (Target Last)
    // Calculate previous month string safely regardless of timezone
    const [y, m] = formData.billing_month.split('-').map(Number);
    let prevY = y;
    let prevM = m - 1;
    if (prevM === 0) {
        prevM = 12;
        prevY -= 1;
    }
    const prevMonthStr = `${prevY}-${prevM.toString().padStart(2, '0')}`;

    // Fetch Meter Reading for Previous Month
    const { data: prevMonthReading } = useMeterReadingByMonth(roomId, prevMonthStr);


    // Update form when readings fetched
    useEffect(() => {
        if (!open) return;

        // Default: Use what we found
        let newWaterCurrent = formData.water_meter_current;
        let newElecCurrent = formData.electricity_meter_current;
        let newWaterLast = formData.water_meter_last;
        let newElecLast = formData.electricity_meter_last;

        // 1. Current Month Reading (if tenant submitted) -> Set as Current
        if (currentMonthReading) {
            newWaterCurrent = currentMonthReading.water.toString();
            newElecCurrent = currentMonthReading.electricity.toString();
        }

        // 2. Previous Month Reading -> Set as Last
        if (prevMonthReading) {
            newWaterLast = prevMonthReading.water.toString();
            newElecLast = prevMonthReading.electricity.toString();
        } else if (lastReading && !currentMonthReading) {
            // Fallback: If no specific prev month data, and no current month data,
            // maybe use the absolute 'lastReading' as 'Last'.
            // But be careful not to use 'current' as 'last'.
            // logical check: is lastReading.month < current billing month? 
            // (We don't have lastReading date here, but assuming it's historic)
            newWaterLast = lastReading.water.toString();
            newElecLast = lastReading.electricity.toString();
        }

        setFormData(prev => {
            // Only update if changed to avoid loops (though basic equality check helps)
            if (
                prev.water_meter_current === newWaterCurrent &&
                prev.electricity_meter_current === newElecCurrent &&
                prev.water_meter_last === newWaterLast &&
                prev.electricity_meter_last === newElecLast
            ) {
                return prev;
            }

            // Calculate usage immediately
            const wUsage = Math.max(0, (parseFloat(newWaterCurrent) || 0) - (parseFloat(newWaterLast) || 0)).toFixed(2);
            const eUsage = Math.max(0, (parseFloat(newElecCurrent) || 0) - (parseFloat(newElecLast) || 0)).toFixed(2);

            return {
                ...prev,
                water_meter_current: newWaterCurrent,
                electricity_meter_current: newElecCurrent,
                water_meter_last: newWaterLast,
                electricity_meter_last: newElecLast,
                water_usage: wUsage,
                electricity_usage: eUsage
            };
        });

    }, [currentMonthReading, prevMonthReading, lastReading, open, roomId, formData.billing_month]);

    useEffect(() => {
        if (open) {
            setFormData({
                contract_id: '',
                billing_month: new Date().toISOString().slice(0, 7),
                water_usage: '',
                water_meter_last: '0',
                water_meter_current: '',
                electricity_usage: '',
                electricity_meter_last: '0',
                electricity_meter_current: '',
                due_date: new Date().toISOString().slice(0, 8) + '05',
            });
            setAdditionalCharges([]);
            setErrors({});
            setCalculatedTotal(0);
            setCalculatedRent(0);
        }
    }, [open]);

    // Apps Settings
    const { data: appSettings } = useAppSettings();
    const { data: rentRates } = useRentRates();

    // Auto-add fees when opening form (fresh form)
    useEffect(() => {
        if (open && appSettings && contracts && formData.contract_id) {
            const contract = contracts?.find((c) => c.id === formData.contract_id);
            const positionLevel = contract?.tenant?.position_level;

            const fees = [];

            // Common Fee from Position Rate
            if (positionLevel && rentRates) {
                const rate = rentRates.find(r => r.position_level === positionLevel);
                if (rate && rate.common_fee > 0) {
                    fees.push({ name: 'ค่าส่วนกลาง', amount: rate.common_fee });
                }
            } else if (appSettings && appSettings.common_fee > 0) {
                fees.push({ name: 'ค่าส่วนกลาง', amount: appSettings.common_fee });
            }

            if (appSettings && appSettings.water_maintenance_fee > 0) {
                fees.push({ name: 'ค่าบำรุงมิเตอร์น้ำ', amount: appSettings.water_maintenance_fee });
            }

            setAdditionalCharges(fees);
        }
    }, [open, appSettings, contracts, formData.contract_id, rentRates]);

    const handleAddCharge = () => {
        setAdditionalCharges([...additionalCharges, { name: '', amount: 0 }]);
    };

    const handleRemoveCharge = (index: number) => {
        setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
    };

    const handleChargeChange = (index: number, field: keyof AdditionalCharge, value: string) => {
        const newCharges = [...additionalCharges];
        if (field === 'amount') {
            newCharges[index].amount = parseFloat(value) || 0;
        } else {
            newCharges[index].name = value;
        }
        setAdditionalCharges(newCharges);
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.contract_id) newErrors.contract_id = 'กรุณาเลือกสัญญา/ผู้เช่า';
        if (!formData.billing_month) newErrors.billing_month = 'กรุณาระบุเดือนที่เรียกเก็บ';
        if (!formData.due_date) newErrors.due_date = 'กรุณาระบุกำหนดชำระ';
        if (parseFloat(formData.water_usage) < 0) newErrors.water_usage = 'หน่วยน้ำต้องไม่ติดลบ';
        if (parseFloat(formData.electricity_usage) < 0) newErrors.electricity_usage = 'หน่วยไฟต้องไม่ติดลบ';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const invoiceData: InvoiceFormData = {
            contract_id: formData.contract_id,
            billing_month: formData.billing_month + '-01',
            water_usage: parseFloat(formData.water_usage) || 0,
            water_meter_last: parseFloat(formData.water_meter_last) || 0,
            water_meter_current: parseFloat(formData.water_meter_current) || 0,
            electricity_usage: parseFloat(formData.electricity_usage) || 0,
            electricity_meter_last: parseFloat(formData.electricity_meter_last) || 0,
            electricity_meter_current: parseFloat(formData.electricity_meter_current) || 0,
            additional_charges: additionalCharges,
            due_date: formData.due_date,
        };

        createInvoice.mutate(invoiceData);
    };

    // Calculate Rent: Position Rate > Contract Rent > Room Price
    let rentAmount = selectedContract?.monthly_rent || 0;
    if (selectedContract?.tenant?.position_level && rentRates) {
        const rate = rentRates.find(r => r.position_level === selectedContract.tenant.position_level);
        if (rate) {
            rentAmount = Number(rate.rent_amount);
        }
    }
    // Final fallback to room price if rent is still 0 (e.g. no contract rent set)
    if (rentAmount === 0 && selectedContract?.room?.monthly_rent) {
        rentAmount = selectedContract.room.monthly_rent;
    }
    // Use room-specific rates if available, otherwise app settings, otherwise defaults
    const waterRate = appSettings?.water_rate || 18;
    const electricityRate = selectedContract?.room?.electricity_rate || appSettings?.electricity_rate || 8;

    const waterUsage = parseFloat(formData.water_usage) || 0;
    const electricityUsage = parseFloat(formData.electricity_usage) || 0;

    const calculatedWaterCost = waterUsage * waterRate;
    const calculatedElectricityCost = electricityUsage * electricityRate;
    const calculatedAdditionalChargesTotal = additionalCharges.reduce((sum, c) => sum + (parseFloat(c.amount as any) || 0), 0);
    const totalAmount = rentAmount + calculatedWaterCost + calculatedElectricityCost + calculatedAdditionalChargesTotal;

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ออกใบแจ้งหนี้</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <form onSubmit={handleSubmit} id="invoice-form">
                        <VStack align="stretch" gap={4}>
                            {/* Contract Selection */}
                            <Field
                                label="เลือกผู้เช่า/ห้อง (สัญญา)"
                                required
                                invalid={!!errors.contract_id}
                                errorText={errors.contract_id}
                            >
                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={formData.contract_id}
                                        onChange={(e) =>
                                            setFormData({ ...formData, contract_id: e.target.value })
                                        }
                                    >
                                        <option value="">เลือกผู้เช่า</option>
                                        {contracts?.map((contract) => (
                                            <option key={contract.id} value={contract.id}>
                                                ห้อง {contract.room?.room_number} - {contract.tenant?.full_name}
                                            </option>
                                        ))}
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Field>

                            {/* Dates */}
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <Field
                                    label="รอบบิล (เดือน/ปี)"
                                    required
                                    invalid={!!errors.billing_month}
                                    errorText={errors.billing_month}
                                >
                                    <Input
                                        type="month"
                                        value={formData.billing_month}
                                        onChange={(e) =>
                                            setFormData({ ...formData, billing_month: e.target.value })
                                        }
                                    />
                                </Field>

                                <Field
                                    label="กำหนดชำระ"
                                    required
                                    invalid={!!errors.due_date}
                                    errorText={errors.due_date}
                                >
                                    <Input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, due_date: e.target.value })
                                        }
                                    />
                                </Field>
                            </Grid>

                            {/* Utility Usage */}
                            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                                {/* Water */}
                                <VStack align="stretch" gap={2}>
                                    <Text fontWeight="medium" color="blue.600">น้ำประปา</Text>
                                    <Grid templateColumns="1fr 1fr" gap={2}>
                                        <Field label="มิเตอร์ก่อนหน้า">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.water_meter_last}
                                                readOnly
                                                bg="gray.50"
                                            />
                                        </Field>
                                        <Field
                                            label="มิเตอร์ปัจจุบัน"
                                            invalid={!!errors.water_meter_current}
                                            errorText={errors.water_meter_current}
                                        >
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.water_meter_current}
                                                onChange={(e) => {
                                                    const current = e.target.value;
                                                    const last = parseFloat(formData.water_meter_last) || 0;
                                                    const usage = Math.max(0, (parseFloat(current) || 0) - last).toFixed(2);
                                                    setFormData({
                                                        ...formData,
                                                        water_meter_current: current,
                                                        water_usage: usage
                                                    });
                                                }}
                                            />
                                        </Field>
                                    </Grid>
                                    <Field label="หน่วยที่ใช้ (คำนวณอัตโนมัติ)">
                                        <Input
                                            value={formData.water_usage}
                                            readOnly
                                            bg="gray.100"
                                            fontWeight="bold"
                                        />
                                    </Field>
                                </VStack>

                                {/* Electricity */}
                                <VStack align="stretch" gap={2}>
                                    <Text fontWeight="medium" color="orange.600">ไฟฟ้า</Text>
                                    <Grid templateColumns="1fr 1fr" gap={2}>
                                        <Field label="มิเตอร์ก่อนหน้า">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.electricity_meter_last}
                                                readOnly
                                                bg="gray.50"
                                            />
                                        </Field>
                                        <Field
                                            label="มิเตอร์ปัจจุบัน"
                                            invalid={!!errors.electricity_meter_current}
                                            errorText={errors.electricity_meter_current}
                                        >
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={formData.electricity_meter_current}
                                                onChange={(e) => {
                                                    const current = e.target.value;
                                                    const last = parseFloat(formData.electricity_meter_last) || 0;
                                                    const usage = Math.max(0, (parseFloat(current) || 0) - last).toFixed(2);
                                                    setFormData({
                                                        ...formData,
                                                        electricity_meter_current: current,
                                                        electricity_usage: usage
                                                    });
                                                }}
                                            />
                                        </Field>
                                    </Grid>
                                    <Field label="หน่วยที่ใช้ (คำนวณอัตโนมัติ)">
                                        <Input
                                            value={formData.electricity_usage}
                                            readOnly
                                            bg="gray.100"
                                            fontWeight="bold"
                                        />
                                    </Field>
                                </VStack>
                            </Grid>

                            {/* Total Summary */}
                            <Box p={4} bg="gray.50" borderRadius="md">
                                <VStack align="stretch" gap={2}>
                                    <HStack justify="space-between">
                                        <Text color="gray.600">ค่าเช่าห้อง:</Text>
                                        <Text fontWeight="medium">฿{rentAmount.toLocaleString()}</Text>
                                    </HStack>

                                    {/* Water Calculation Display */}
                                    <HStack justify="space-between">
                                        <Text color="gray.600" fontSize="sm">
                                            ค่าน้ำ ({formData.water_usage || 0} หน่วย x {waterRate} บ.):
                                        </Text>
                                        <Text fontWeight="medium">
                                            ฿{calculatedWaterCost.toLocaleString()}
                                        </Text>
                                    </HStack>

                                    {/* Electricity Calculation Display */}
                                    <HStack justify="space-between">
                                        <Text color="gray.600" fontSize="sm">
                                            ค่าไฟ ({formData.electricity_usage || 0} หน่วย x {electricityRate} บ.):
                                        </Text>
                                        <Text fontWeight="medium">
                                            ฿{calculatedElectricityCost.toLocaleString()}
                                        </Text>
                                    </HStack>

                                    {/* Additional Charges */}
                                    {additionalCharges.filter(c => c.name === 'ค่าส่วนกลาง').map((charge, idx) => (
                                        <HStack key={`common-${idx}`} justify="space-between">
                                            <Text color="gray.600" fontSize="sm">{charge.name}:</Text>
                                            <Text fontWeight="medium">฿{charge.amount.toLocaleString()}</Text>
                                        </HStack>
                                    ))}

                                    {additionalCharges.filter(c => c.name === 'ค่าบำรุงมิเตอร์น้ำ').map((charge, idx) => (
                                        <HStack key={`maint-${idx}`} justify="space-between">
                                            <Text color="gray.600" fontSize="sm">{charge.name}:</Text>
                                            <Text fontWeight="medium">฿{charge.amount.toLocaleString()}</Text>
                                        </HStack>
                                    ))}

                                    {/* Other charges */}
                                    {additionalCharges.filter(c => c.name !== 'ค่าส่วนกลาง' && c.name !== 'ค่าบำรุงมิเตอร์น้ำ').length > 0 && (
                                        <HStack justify="space-between">
                                            <Text color="gray.600" fontSize="sm">อื่นๆ:</Text>
                                            <Text fontWeight="medium">
                                                ฿{additionalCharges.filter(c => c.name !== 'ค่าส่วนกลาง' && c.name !== 'ค่าบำรุงมิเตอร์น้ำ')
                                                    .reduce((sum, c) => sum + (parseFloat(c.amount as any) || 0), 0).toLocaleString()}
                                            </Text>
                                        </HStack>
                                    )}

                                    <Box h="1px" bg="gray.200" my={1} />

                                    <HStack justify="space-between">
                                        <Text fontWeight="bold" color="gray.700">ยอดรวมทั้งสิ้น:</Text>
                                        <Text fontWeight="bold" fontSize="xl" color="blue.600">
                                            ฿{totalAmount.toLocaleString()}
                                        </Text>
                                    </HStack>
                                </VStack>
                                <Text fontSize="xs" color="gray.500" mt={2}>
                                    *ตวรจสอบรายการคำนวณ: ค่าเช่า + ค่าน้ำ + ค่าไฟ + ค่าส่วนกลาง/บำรุงมิเตอร์
                                </Text>
                            </Box>
                        </VStack>
                    </form>
                </DialogBody>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        ยกเลิก
                    </Button>
                    <Button
                        type="submit"
                        form="invoice-form"
                        colorPalette="blue"
                        disabled={createInvoice.isPending}
                    >
                        บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
