import React, { useState } from 'react';
import { Box, Button, Heading, HStack, Icon, Input, Text, VStack } from '@chakra-ui/react';
import { LuFileText, LuWrench } from 'react-icons/lu';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { toaster } from '../ui/toaster';
import {
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';

const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export const formatThaiMonth = (dateStr: string) => {
    if (!dateStr) return '-';
    if (!/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;

    const [year, month] = dateStr.split('-');
    const monthThai = thaiMonths[Number(month) - 1];
    return `${monthThai} ${Number(year) + 543}`;
};

export const MeterReadingDialog = ({
    contract,
    disabled,
    onSuccess,
    variant,
    width,
}: {
    contract: any;
    disabled?: boolean;
    onSuccess?: () => void;
    variant?: React.ComponentProps<typeof Button>['variant'];
    width?: React.ComponentProps<typeof Button>['width'];
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [waterMeter, setWaterMeter] = useState('');
    const [prevWaterMeter, setPrevWaterMeter] = useState(0);
    const [prevMonthStr, setPrevMonthStr] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [invoiceIssued, setInvoiceIssued] = useState(false);
    const { profile } = useAuth();

    const loadMonthData = async (monthStr: string, roomHistory: any[]) => {
        if (!contract?.room_id) return;

        setInvoiceIssued(false);

        const currentData = roomHistory.find((h) => h.month === monthStr);
        if (currentData?.water_meter) {
            setWaterMeter(currentData.water_meter.toString());
            setIsEdit(true);
        } else {
            setWaterMeter('');
            setIsEdit(false);
        }

        const startDate = `${monthStr}-01`;
        const [year, month] = monthStr.split('-').map(Number);
        const nextMonthStr = new Date(year, month, 1).toISOString().slice(0, 10);

        if (profile?.id) {
            const invoicesSnap = await getDocs(
                query(collection(db, 'invoices'), where('tenant_uid', '==', profile.id))
            );
            const hasInvoice = invoicesSnap.docs.some((d) => {
                const inv = d.data();
                return (
                    inv.room_id === contract.room_id &&
                    inv.status !== 'cancelled' &&
                    inv.billing_month >= startDate &&
                    inv.billing_month < nextMonthStr
                );
            });
            setInvoiceIssued(hasInvoice);
        }

        const prevRecord = roomHistory
            .filter((h) => h.month < monthStr)
            .sort((a, b) => String(b.month).localeCompare(String(a.month)))[0];

        setPrevWaterMeter(prevRecord?.water_meter || 0);
        setPrevMonthStr(prevRecord?.month || '');
    };

    const handleOpen = async () => {
        setIsOpen(true);
        if (!contract?.room_id) return;

        const historySnap = await getDocs(query(collection(db, 'history_meter'), where('room_id', '==', contract.room_id)));
        const roomHistory = historySnap.docs.map((d) => d.data());

        const filledMonths = new Set(roomHistory.map((item) => item.month));
        const today = new Date();
        let targetMonth = today.toISOString().slice(0, 7);

        for (let i = 0; i < 3; i += 1) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthValue = monthDate.toISOString().slice(0, 7);
            if (!filledMonths.has(monthValue)) {
                targetMonth = monthValue;
                break;
            }
        }

        setSelectedMonth(targetMonth);
        await loadMonthData(targetMonth, roomHistory);
    };

    const handleSubmit = async () => {
        if (!waterMeter || !contract?.room_id || !selectedMonth || invoiceIssued) return;

        setIsLoading(true);
        try {
            const ref = doc(db, 'history_meter', `${contract.room_id}_${selectedMonth}`);
            const existingSnap = await getDoc(ref);
            const existing = existingSnap.exists() ? existingSnap.data() : null;

            await setDoc(
                ref,
                {
                    room_id: contract.room_id,
                    month: selectedMonth,
                    water_meter: parseFloat(waterMeter),
                    electricity_meter: existing?.electricity_meter || 0,
                },
                { merge: true }
            );

            toaster.create({ title: 'บันทึกมิเตอร์น้ำเรียบร้อย', type: 'success' });
            setIsOpen(false);
            setWaterMeter('');
            onSuccess?.();
        } catch (error) {
            console.error(error);
            toaster.create({ title: 'เกิดข้อผิดพลาด', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogRoot open={isOpen} onOpenChange={(event) => setIsOpen(event.open)}>
            <DialogTrigger asChild>
                <Button variant={variant} width={width} onClick={handleOpen} disabled={disabled}>
                    <Icon mr={2}><LuWrench /></Icon>
                    {isEdit ? 'แก้ไขมิเตอร์น้ำ' : 'บันทึกมิเตอร์น้ำ'}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? 'แก้ไขมิเตอร์น้ำประจำเดือน' : 'บันทึกมิเตอร์น้ำประจำเดือน'}
                    </DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <VStack gap={4} align="stretch">
                        <Box p={3} bg="bg.muted" borderRadius="md" textAlign="center">
                            <Text fontSize="sm" color="fg.muted">ประจำเดือน</Text>
                            <Heading size="lg" color="blue.fg">
                                {formatThaiMonth(selectedMonth)}
                            </Heading>
                        </Box>

                        {invoiceIssued && (
                            <Box p={3} bg="red.subtle" borderRadius="md" border="1px solid" borderColor="red.muted">
                                <HStack color="red.fg">
                                    <Icon><LuFileText /></Icon>
                                    <Text fontSize="sm" fontWeight="medium">
                                        มีการออกใบแจ้งหนี้แล้ว ไม่สามารถแก้ไขได้
                                    </Text>
                                </HStack>
                                <Text fontSize="xs" color="red.fg" mt={1} ml={6}>
                                    กรุณาติดต่อเจ้าหน้าที่หากต้องการแก้ไขข้อมูล
                                </Text>
                            </Box>
                        )}

                        {!invoiceIssued && isEdit && (
                            <Box p={3} bg="orange.subtle" borderRadius="md">
                                <Text fontSize="sm" color="orange.fg">
                                    เดือนนี้คุณได้บันทึกไปแล้ว ไม่สามารถแก้ไขได้
                                </Text>
                            </Box>
                        )}

                        <Box p={3} bg="blue.subtle" borderRadius="md">
                            <HStack justify="space-between">
                                <Text fontSize="sm" color="blue.fg">เลขครั้งก่อน ({formatThaiMonth(prevMonthStr)}):</Text>
                                <Text fontWeight="bold" color="blue.fg">{prevWaterMeter.toLocaleString()}</Text>
                            </HStack>
                            {prevWaterMeter === 0 && (
                                <Text fontSize="xs" color="fg.muted" mt={1}>*ไม่พบข้อมูลเดือนก่อนหน้า</Text>
                            )}
                        </Box>

                        <Box>
                            <Text fontWeight="bold" mb={1}>เลขมิเตอร์ปัจจุบัน:</Text>
                            <Input
                                type="number"
                                value={waterMeter}
                                onChange={(event) => setWaterMeter(event.target.value)}
                                placeholder="กรอกเลขมิเตอร์"
                                size="lg"
                                disabled={invoiceIssued}
                            />
                        </Box>

                        {parseFloat(waterMeter) < prevWaterMeter && waterMeter !== '' && (
                            <Text color="red.fg" fontSize="xs">
                                ตัวเลขต่ำกว่าครั้งก่อน ({prevWaterMeter})
                            </Text>
                        )}
                    </VStack>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>ปิด</Button>
                    {!invoiceIssued && (
                        <Button onClick={handleSubmit} disabled={isLoading || !waterMeter || !selectedMonth}>
                            {isLoading ? 'กำลังบันทึก...' : (isEdit ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล')}
                        </Button>
                    )}
                </DialogFooter>
                <DialogCloseTrigger />
            </DialogContent>
        </DialogRoot>
    );
};
