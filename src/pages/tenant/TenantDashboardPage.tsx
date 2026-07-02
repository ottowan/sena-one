import React, { useEffect, useState } from 'react';
import { Box, Grid, Heading, Text, Card, VStack, HStack, Button, Icon, Badge, Input, Table } from '@chakra-ui/react';
import { LuWallet, LuFileText, LuHouse, LuWrench, LuDroplet } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toaster } from '../../components/ui/toaster';
import {
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog';

const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const formatThaiMonth = (dateStr: string) => {
    if (!dateStr) return '-';
    if (!/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;

    const [year, month] = dateStr.split('-');
    const monthThai = thaiMonths[Number(month) - 1];
    return `${monthThai} ${Number(year) + 543}`;
};

export const TenantDashboardPage: React.FC = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [contract, setContract] = useState<any>(null);
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
    const [meterHistory, setMeterHistory] = useState<any[]>([]);
    const [contractLoading, setContractLoading] = useState(true);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [meterLoading, setMeterLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const fetchMeterHistory = async (roomId: string, year: number) => {
        setMeterLoading(true);
        try {
            const snap = await getDocs(
                query(
                    collection(db, 'history_meter'),
                    where('room_id', '==', roomId),
                    where('month', '>=', `${year}-01`),
                    where('month', '<=', `${year}-12`)
                )
            );
            const rows = snap.docs.map((d) => d.data());
            rows.sort((a, b) => String(b.month).localeCompare(String(a.month)));
            setMeterHistory(rows);
        } finally {
            setMeterLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const fetchContract = async () => {
            if (!profile?.id) {
                setContractLoading(false);
                return;
            }

            setContractLoading(true);
            try {
                const tenantSnap = await getDocs(query(collection(db, 'tenants'), where('user_id', '==', profile.id)));
                const tenant = tenantSnap.docs[0] ? { id: tenantSnap.docs[0].id, ...tenantSnap.docs[0].data() } : null;

                if (cancelled) return;
                setTenantId(tenant?.id || null);

                if (!tenant) {
                    setContract(null);
                    return;
                }

                const contractsSnap = await getDocs(
                    query(collection(db, 'contracts'), where('tenant_uid', '==', profile.id))
                );
                const activeContractDoc = contractsSnap.docs.find((d) => d.data().status === 'active');
                let contractData = activeContractDoc ? { id: activeContractDoc.id, ...activeContractDoc.data() } as any : null;

                if (cancelled) return;

                if (contractData?.room_id) {
                    const roomSnap = await getDoc(doc(db, 'rooms', contractData.room_id));
                    if (roomSnap.exists()) contractData = { ...contractData, room: { id: roomSnap.id, ...roomSnap.data() } };
                }

                setContract(contractData);
            } catch (error) {
                console.error(error);
            } finally {
                if (!cancelled) setContractLoading(false);
            }
        };

        void fetchContract();

        return () => {
            cancelled = true;
        };
    }, [profile?.id]);

    useEffect(() => {
        let cancelled = false;

        const fetchInvoices = async () => {
            if (!contract?.id || !profile?.id) {
                setUnpaidInvoices([]);
                return;
            }

            setInvoiceLoading(true);
            try {
                const snap = await getDocs(
                    query(collection(db, 'invoices'), where('tenant_uid', '==', profile.id))
                );
                const rows = snap.docs
                    .map((d) => ({ id: d.id, ...d.data() }) as any)
                    .filter((inv) => inv.contract_id === contract.id && inv.status === 'pending')
                    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));

                if (!cancelled) setUnpaidInvoices(rows);
            } finally {
                if (!cancelled) setInvoiceLoading(false);
            }
        };

        void fetchInvoices();

        return () => {
            cancelled = true;
        };
    }, [contract?.id, profile?.id]);

    useEffect(() => {
        if (!contract?.room_id) {
            setMeterHistory([]);
            return;
        }

        void fetchMeterHistory(contract.room_id, selectedYear);
    }, [contract?.room_id, selectedYear]);

    const totalDue = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    return (
        <VStack align="stretch" gap={8} py={4}>
            <Box>
                <Heading size="xl" mb={2}>สวัสดี, คุณ{profile?.full_name}</Heading>
                <Text color="gray.600">ยินดีต้อนรับสู่ระบบจัดการหอพัก Sena-One</Text>
                {contractLoading && (
                    <Text color="gray.500" fontSize="sm" mt={2}>
                        กำลังโหลดข้อมูลห้องพัก...
                    </Text>
                )}
            </Box>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
                <Card.Root>
                    <Card.Body>
                        <HStack align="start" justify="space-between">
                            <VStack align="start" gap={1}>
                                <Text color="gray.500" fontSize="sm">ข้อมูลห้องพัก</Text>
                                <Heading size="2xl">{contract?.room?.room_number || '-'}</Heading>
                                <Badge colorPalette="blue">{contract?.room?.room_type || 'Standard'}</Badge>
                            </VStack>
                            <Box p={3} bg="blue.50" borderRadius="lg" color="blue.600">
                                <Icon fontSize="2xl"><LuHouse /></Icon>
                            </Box>
                        </HStack>
                    </Card.Body>
                </Card.Root>

                <Card.Root>
                    <Card.Body>
                        <HStack align="start" justify="space-between">
                            <VStack align="start" gap={1}>
                                <Text color="gray.500" fontSize="sm">ยอดค้างชำระ</Text>
                                <Heading size="2xl" color={totalDue > 0 ? 'red.500' : 'green.500'}>
                                    {formatCurrency(totalDue)}
                                </Heading>
                                <Text fontSize="xs" color="gray.500">
                                    {invoiceLoading ? 'กำลังอัปเดต...' : `${unpaidInvoices.length} รายการที่ต้องชำระ`}
                                </Text>
                            </VStack>
                            <Box p={3} bg={totalDue > 0 ? 'red.50' : 'green.50'} borderRadius="lg" color={totalDue > 0 ? 'red.600' : 'green.600'}>
                                <Icon fontSize="2xl"><LuWallet /></Icon>
                            </Box>
                        </HStack>
                    </Card.Body>
                </Card.Root>

                <Card.Root>
                    <Card.Body>
                        <Text color="gray.500" fontSize="sm" mb={4}>เมนูด่วน</Text>
                        <VStack align="stretch" gap={2}>
                            <Button variant="surface" onClick={() => navigate('/tenant/bills')}>
                                <Icon mr={2}><LuFileText /></Icon>
                                ดูบิลและชำระเงิน
                            </Button>
                            <Button variant="surface" onClick={() => navigate('/tenant/maintenance')}>
                                <Icon mr={2}><LuWrench /></Icon>
                                แจ้งซ่อม
                            </Button>
                        </VStack>
                    </Card.Body>
                </Card.Root>

                <Card.Root>
                    <Card.Body>
                        <Text color="gray.500" fontSize="sm" mb={4}>จดมิเตอร์น้ำด้วยตนเอง</Text>
                        <MeterReadingDialog
                            contract={contract}
                            disabled={!contract}
                            onSuccess={() => {
                                if (contract?.room_id) {
                                    void fetchMeterHistory(contract.room_id, selectedYear);
                                }
                            }}
                        />
                    </Card.Body>
                </Card.Root>
            </Grid>

            {tenantId && !contractLoading && !contract && (
                <Card.Root>
                    <Card.Body>
                        <Text color="gray.600">ยังไม่พบสัญญาที่กำลังใช้งานสำหรับบัญชีนี้</Text>
                    </Card.Body>
                </Card.Root>
            )}

            {contract && (
                <Card.Root>
                    <Card.Header>
                        <HStack justify="space-between">
                            <HStack>
                                <Icon color="blue.500" fontSize="xl">
                                    <LuDroplet />
                                </Icon>
                                <Heading size="lg">ประวัติมิเตอร์น้ำย้อนหลัง</Heading>
                            </HStack>
                            <Box w="150px">
                                <select
                                    className="chakra-select"
                                    style={{
                                        padding: '8px',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        width: '100%'
                                    }}
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                        <option key={year} value={year}>พ.ศ. {year + 543}</option>
                                    ))}
                                </select>
                            </Box>
                        </HStack>
                    </Card.Header>
                    <Card.Body>
                        <Table.Root size="sm" variant="outline">
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader>เดือน/ปี</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="right">เลขมิเตอร์น้ำ</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="right">หน่วยที่ใช้</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {meterLoading ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={3} textAlign="center">กำลังโหลด...</Table.Cell>
                                    </Table.Row>
                                ) : meterHistory.length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={3} textAlign="center">ไม่พบข้อมูลสำหรับปีนี้</Table.Cell>
                                    </Table.Row>
                                ) : meterHistory.map((record, index) => {
                                    const prevRecord = meterHistory[index + 1];
                                    const usage = prevRecord
                                        ? Math.max(0, record.water_meter - prevRecord.water_meter)
                                        : '-';

                                    return (
                                        <Table.Row key={record.month}>
                                            <Table.Cell fontWeight="medium">
                                                {formatThaiMonth(record.month)}
                                            </Table.Cell>
                                            <Table.Cell textAlign="right">
                                                {record.water_meter?.toLocaleString() || '-'}
                                            </Table.Cell>
                                            <Table.Cell textAlign="right">
                                                {typeof usage === 'number' ? `${usage.toLocaleString()} หน่วย` : usage}
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table.Root>
                    </Card.Body>
                </Card.Root>
            )}
        </VStack>
    );
};

const MeterReadingDialog = ({
    contract,
    disabled,
    onSuccess,
}: {
    contract: any;
    disabled?: boolean;
    onSuccess?: () => void;
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
                <Button variant="surface" width="full" onClick={handleOpen} disabled={disabled}>
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
                        <Box p={3} bg="gray.100" borderRadius="md" textAlign="center">
                            <Text fontSize="sm" color="gray.500">ประจำเดือน</Text>
                            <Heading size="lg" color="blue.600">
                                {formatThaiMonth(selectedMonth)}
                            </Heading>
                        </Box>

                        {invoiceIssued && (
                            <Box p={3} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.100">
                                <HStack color="red.700">
                                    <Icon><LuFileText /></Icon>
                                    <Text fontSize="sm" fontWeight="medium">
                                        มีการออกใบแจ้งหนี้แล้ว ไม่สามารถแก้ไขได้
                                    </Text>
                                </HStack>
                                <Text fontSize="xs" color="red.600" mt={1} ml={6}>
                                    กรุณาติดต่อเจ้าหน้าที่หากต้องการแก้ไขข้อมูล
                                </Text>
                            </Box>
                        )}

                        {!invoiceIssued && isEdit && (
                            <Box p={3} bg="orange.50" borderRadius="md">
                                <Text fontSize="sm" color="orange.700">
                                    เดือนนี้คุณได้บันทึกไปแล้ว สามารถแก้ไขได้
                                </Text>
                            </Box>
                        )}

                        <Box p={3} bg="blue.50" borderRadius="md">
                            <HStack justify="space-between">
                                <Text fontSize="sm" color="blue.700">เลขครั้งก่อน ({formatThaiMonth(prevMonthStr)}):</Text>
                                <Text fontWeight="bold" color="blue.800">{prevWaterMeter.toLocaleString()}</Text>
                            </HStack>
                            {prevWaterMeter === 0 && (
                                <Text fontSize="xs" color="gray.500" mt={1}>*ไม่พบข้อมูลเดือนก่อนหน้า</Text>
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
                            <Text color="red.500" fontSize="xs">
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
