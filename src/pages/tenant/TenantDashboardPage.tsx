import React, { useEffect, useState } from 'react';
import { Box, Grid, Heading, Text, Card, VStack, HStack, Button, Icon, Badge, Input, Table } from '@chakra-ui/react';
import { LuWallet, LuFileText, LuHouse, LuWrench, LuDroplet } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
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
} from "../../components/ui/dialog"

export const TenantDashboardPage: React.FC = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [contract, setContract] = useState<any>(null);
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
    const [meterHistory, setMeterHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const fetchMeterHistory = async (roomId: string, year: number) => {
        const startMonth = `${year}-01`;
        const endMonth = `${year}-12`;
        const { data } = await supabase
            .from('history_meter')
            .select('*')
            .eq('room_id', roomId)
            .gte('month', startMonth)
            .lte('month', endMonth)
            .order('month', { ascending: false });

        setMeterHistory(data || []);
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!profile?.id) return;

            try {
                // 1. Get Tenant Record linked to this User
                const { data: tenant } = await supabase
                    .from('tenants')
                    .select('id')
                    .eq('user_id', profile.id)
                    .maybeSingle();

                if (!tenant) {
                    setIsLoading(false);
                    return;
                }

                // 2. Get Active Contract using Tenant ID
                const { data: contractData } = await supabase
                    .from('contracts')
                    .select('*, room:rooms(*)')
                    .eq('tenant_id', tenant.id)
                    .eq('status', 'active')
                    .maybeSingle();

                if (contractData) {
                    // Normalize room data (handle array from join)
                    if (Array.isArray(contractData.room)) {
                        contractData.room = contractData.room[0];
                    }

                    // Fallback: Fetch room manually if missing
                    if (!contractData.room && contractData.room_id) {
                        const { data: roomData } = await supabase
                            .from('rooms')
                            .select('*')
                            .eq('id', contractData.room_id)
                            .maybeSingle();
                        if (roomData) contractData.room = roomData;
                    }
                }

                setContract(contractData);

                // 3. Get Unpaid Invoices
                if (contractData) {
                    const { data: invoices } = await supabase
                        .from('invoices')
                        .select('*')
                        .eq('contract_id', contractData.id)
                        .eq('status', 'pending')
                        .order('due_date', { ascending: true });

                    setUnpaidInvoices(invoices || []);

                    // 4. Get Meter History for selected year
                    await fetchMeterHistory(contractData.room_id, selectedYear);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [profile, selectedYear]);

    const totalDue = unpaidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

    if (isLoading) return <Box>กำลังโหลด...</Box>;

    return (
        <VStack align="stretch" gap={8} py={4}>
            <Box>
                <Heading size="xl" mb={2}>สวัสดี, คุณ{profile?.full_name}</Heading>
                <Text color="gray.600">ยินดีต้อนรับสู่ระบบจัดการหอพัก Sena-One</Text>
            </Box>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
                {/* Room Info */}
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

                {/* Outstanding Balance */}
                <Card.Root>
                    <Card.Body>
                        <HStack align="start" justify="space-between">
                            <VStack align="start" gap={1}>
                                <Text color="gray.500" fontSize="sm">ยอดค้างชำระ</Text>
                                <Heading size="2xl" color={totalDue > 0 ? 'red.500' : 'green.500'}>
                                    {formatCurrency(totalDue)}
                                </Heading>
                                <Text fontSize="xs" color="gray.500">{unpaidInvoices.length} รายการที่ต้องชำระ</Text>
                            </VStack>
                            <Box p={3} bg={totalDue > 0 ? 'red.50' : 'green.50'} borderRadius="lg" color={totalDue > 0 ? 'red.600' : 'green.600'}>
                                <Icon fontSize="2xl"><LuWallet /></Icon>
                            </Box>
                        </HStack>
                    </Card.Body>
                </Card.Root>

                {/* Quick Actions */}
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

                {/* Meter Reading Input */}
                <Card.Root>
                    <Card.Body>
                        <Text color="gray.500" fontSize="sm" mb={4}>จดมิเตอร์น้ำ (ส่งด้วยตนเอง)</Text>
                        <MeterReadingDialog
                            contract={contract}
                            onSuccess={() => {
                                // Refresh meter history
                                if (contract?.room_id) {
                                    fetchMeterHistory(contract.room_id, selectedYear);
                                }
                            }}
                        />
                    </Card.Body>
                </Card.Root>
            </Grid>

            {/* Meter History Table */}
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
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                        <option key={y} value={y}>พ.ศ. {y + 543}</option>
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
                                {meterHistory.length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={3} textAlign="center">ไม่พบข้อมูลสำหรับปีนี้</Table.Cell>
                                    </Table.Row>
                                ) : meterHistory.map((record, index) => {
                                    const prevRecord = meterHistory[index + 1];
                                    const usage = prevRecord
                                        ? Math.max(0, record.water_meter - prevRecord.water_meter)
                                        : '-';

                                    // Format month to Thai
                                    const [year, month] = record.month.split('-');
                                    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                                        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                                    const monthThai = thaiMonths[parseInt(month) - 1];
                                    const yearThai = parseInt(year) + 543;

                                    return (
                                        <Table.Row key={record.month}>
                                            <Table.Cell fontWeight="medium">
                                                {monthThai} {yearThai}
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

// Helper to format YYYY-MM to Thai
const formatThaiMonth = (dateStr: string) => {
    if (!dateStr) return '-';
    // Validate format
    if (!/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;

    const [year, month] = dateStr.split('-');
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthIndex = parseInt(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) return dateStr;

    const monthThai = thaiMonths[monthIndex];
    const yearThai = parseInt(year) + 543;
    return `${monthThai} ${yearThai}`;
};

// Sub-component for Meter Dialog
const MeterReadingDialog = ({ contract, onSuccess }: { contract: any; onSuccess?: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [waterMeter, setWaterMeter] = useState('');
    const [prevWaterMeter, setPrevWaterMeter] = useState(0);
    const [prevMonthStr, setPrevMonthStr] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    const handleOpen = async () => {
        setIsOpen(true);
        if (!contract?.room_id) return;

        // 1. Calculate Smart Default Month
        const { data: history } = await supabase
            .from('history_meter')
            .select('month')
            .eq('room_id', contract.room_id)
            .order('month', { ascending: false })
            .limit(12);

        const filledMonths = new Set((history || []).map(h => h.month));

        let targetMonth = new Date().toISOString().slice(0, 7); // Default: Today's month
        const today = new Date();

        // Find the LATEST month (going back from today) that is MISSING.
        for (let i = 0; i < 3; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const m = d.toISOString().slice(0, 7);
            if (!filledMonths.has(m)) {
                targetMonth = m;
                break;
            }
        }

        setSelectedMonth(targetMonth);
        await loadMonthData(targetMonth);
    };

    const loadMonthData = async (monthStr: string) => {
        if (!contract?.room_id) return;

        // 1. Check if Selected Month already exists (Edit Mode)
        const { data: currentData } = await supabase.from('history_meter')
            .select('water_meter')
            .eq('room_id', contract.room_id)
            .eq('month', monthStr)
            .maybeSingle();

        if (currentData && currentData.water_meter) {
            setWaterMeter(currentData.water_meter.toString());
            setIsEdit(true);
        } else {
            setWaterMeter('');
            setIsEdit(false);
        }

        // 2. Fetch "Previous" Meter Reading reliably
        // Find the latest record BEFORE selected month, ignoring gaps
        const { data: prevData } = await supabase.from('history_meter')
            .select('water_meter, month')
            .eq('room_id', contract.room_id)
            .lt('month', monthStr) // Less than selected month
            .order('month', { ascending: false }) // Get the closest one
            .limit(1)
            .maybeSingle();

        setPrevWaterMeter(prevData?.water_meter || 0);
        setPrevMonthStr(prevData?.month || '');
    };

    const handleSubmit = async () => {
        if (!waterMeter || !contract?.room_id || !selectedMonth) return;
        setIsLoading(true);
        try {
            const { data: existing } = await supabase.from('history_meter')
                .select('*')
                .eq('room_id', contract.room_id)
                .eq('month', selectedMonth)
                .maybeSingle();

            const payload = {
                room_id: contract.room_id,
                month: selectedMonth,
                water_meter: parseFloat(waterMeter),
                electricity_meter: existing?.electricity_meter || 0
            };

            const { error } = await supabase.from('history_meter').upsert(payload, { onConflict: 'room_id, month' });
            if (error) throw error;

            toaster.create({ title: 'บันทึกมิเตอร์น้ำเรียบร้อย', type: 'success' });
            setIsOpen(false);
            setWaterMeter('');

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            toaster.create({ title: 'เกิดข้อผิดพลาด', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DialogRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
            <DialogTrigger asChild>
                <Button variant="surface" width="full" onClick={handleOpen}>
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

                        {isEdit && (
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
                            {prevWaterMeter === 0 && <Text fontSize="xs" color="gray.500" mt={1}>*ไม่พบข้อมูลเดือนก่อนหน้า</Text>}
                        </Box>

                        <Box>
                            <Text fontWeight="bold" mb={1}>เลขมิเตอร์ปัจจุบัน:</Text>
                            <Input
                                type="number"
                                value={waterMeter}
                                onChange={(e) => setWaterMeter(e.target.value)}
                                placeholder="กรอกเลขมิเตอร์"
                                size="lg"
                            />
                        </Box>

                        {parseFloat(waterMeter) < prevWaterMeter && waterMeter !== '' && (
                            <Text color="red.500" fontSize="xs">ตัวเลขต่ำกว่าครั้งก่อน ({prevWaterMeter})</Text>
                        )}
                    </VStack>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>ยกเลิก</Button>
                    <Button onClick={handleSubmit} disabled={isLoading || !waterMeter || !selectedMonth}>
                        {isLoading ? 'กำลังบันทึก...' : (isEdit ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล')}
                    </Button>
                </DialogFooter>
                <DialogCloseTrigger />
            </DialogContent>
        </DialogRoot>
    );
};
