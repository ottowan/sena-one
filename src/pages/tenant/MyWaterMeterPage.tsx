import React, { useEffect, useRef, useState } from 'react';
import { Box, Card, Heading, HStack, Icon, Table, Text, VStack } from '@chakra-ui/react';
import { LuDroplet } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MeterReadingDialog, formatThaiMonth } from '../../components/tenant/MeterReadingDialog';
import { NativeSelectField, NativeSelectRoot } from '../../components/ui/native-select';
import { toaster } from '../../components/ui/toaster';

export const MyWaterMeterPage: React.FC = () => {
    const { profile } = useAuth();
    const [contract, setContract] = useState<any>(null);
    const [contractLoading, setContractLoading] = useState(true);
    const [meterHistory, setMeterHistory] = useState<any[]>([]);
    const [meterLoading, setMeterLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const historyRequest = useRef(0);

    const fetchMeterHistory = async (roomId: string, year: number) => {
        const request = ++historyRequest.current;
        setMeterLoading(true);
        setMeterHistory([]);
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
            if (request !== historyRequest.current) return;
            rows.sort((a, b) => String(b.month).localeCompare(String(a.month)));
            setMeterHistory(rows);
        } catch (error) {
            if (request !== historyRequest.current) return;
            console.error(error);
            toaster.create({ title: 'ไม่สามารถโหลดประวัติมิเตอร์น้ำได้', type: 'error' });
        } finally {
            if (request === historyRequest.current) setMeterLoading(false);
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
                const contractsSnap = await getDocs(
                    query(collection(db, 'contracts'), where('tenant_uid', '==', profile.id))
                );
                const activeContractDoc = contractsSnap.docs.find((d) => d.data().status === 'active');
                let contractData = activeContractDoc ? { id: activeContractDoc.id, ...activeContractDoc.data() } as any : null;

                if (contractData?.room_id) {
                    const roomSnap = await getDoc(doc(db, 'rooms', contractData.room_id));
                    if (roomSnap.exists()) contractData = { ...contractData, room: { id: roomSnap.id, ...roomSnap.data() } };
                }

                if (!cancelled) setContract(contractData);
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
        if (!contract?.room_id) {
            setMeterHistory([]);
            return;
        }

        void fetchMeterHistory(contract.room_id, selectedYear);
        return () => { historyRequest.current += 1; };
    }, [contract?.room_id, selectedYear]);

    return (
        <VStack align="stretch" gap={6} py={4}>
            <Heading size="lg">บันทึกมิเตอร์น้ำ</Heading>

            {!contractLoading && !contract ? (
                <Card.Root>
                    <Card.Body>
                        <Text color="fg.muted">ยังไม่พบสัญญาที่กำลังใช้งานสำหรับบัญชีนี้</Text>
                    </Card.Body>
                </Card.Root>
            ) : (
                <Card.Root>
                    <Card.Header>
                        <HStack justify="space-between" wrap="wrap" gap={3}>
                            <HStack>
                                <Icon color="blue.500" fontSize="xl">
                                    <LuDroplet />
                                </Icon>
                                <Heading size="lg">ประวัติมิเตอร์น้ำย้อนหลัง</Heading>
                            </HStack>
                            <HStack>
                                <Box w="150px">
                                    <NativeSelectRoot><NativeSelectField
                                        aria-label="ปีประวัติมิเตอร์น้ำของฉัน"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                            <option key={year} value={year}>พ.ศ. {year + 543}</option>
                                        ))}
                                    </NativeSelectField></NativeSelectRoot>
                                </Box>
                                <MeterReadingDialog
                                    contract={contract}
                                    disabled={!contract}
                                    onSuccess={() => {
                                        if (contract?.room_id) {
                                            void fetchMeterHistory(contract.room_id, selectedYear);
                                        }
                                    }}
                                />
                            </HStack>
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
