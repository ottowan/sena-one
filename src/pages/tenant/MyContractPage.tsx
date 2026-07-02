import React, { useEffect, useState } from 'react';
import { Box, Card, Heading, VStack, Text, Grid, Badge, Spinner } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatCurrency } from '../../lib/utils';

export const MyContractPage: React.FC = () => {
    const { profile } = useAuth();
    const [contract, setContract] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchContract = async () => {
            if (!profile?.id) return;

            const tenantSnap = await getDocs(query(collection(db, 'tenants'), where('user_id', '==', profile.id)));
            const tenantDoc = tenantSnap.docs[0];
            if (!tenantDoc) {
                setIsLoading(false);
                return;
            }
            const tenant = { id: tenantDoc.id, ...tenantDoc.data() } as any;

            // Query by tenant_uid (not tenant_id) so this list read is
            // provably scoped under the tenant-role Security Rules.
            const contractsSnap = await getDocs(query(collection(db, 'contracts'), where('tenant_uid', '==', profile.id)));
            const contractRows = contractsSnap.docs
                .map((d) => ({ id: d.id, ...d.data() }) as any)
                .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
            let contractData = contractRows[0] || null;

            if (contractData?.room_id) {
                const roomSnap = await getDoc(doc(db, 'rooms', contractData.room_id));
                if (roomSnap.exists()) contractData = { ...contractData, room: { id: roomSnap.id, ...roomSnap.data() } };
            }

            // Rent rates are world-readable to any signed-in user.
            const rentRatesSnap = await getDocs(collection(db, 'position_rent_rates'));
            const rentRates = rentRatesSnap.docs.map((d) => ({ position_level: d.id, ...d.data() }) as any);

            if (contractData) {
                let displayRent = contractData.monthly_rent;

                if (tenant.position_level) {
                    const rate = rentRates.find((r) => r.position_level === tenant.position_level);
                    if (rate && rate.rent_amount > 0) {
                        displayRent = rate.rent_amount;
                    }
                }

                setContract({ ...contractData, displayRent });
            } else {
                setContract(null);
            }
            setIsLoading(false);
        };
        fetchContract();
    }, [profile]);

    if (isLoading) {
        return (
            <VStack h="50vh" justify="center" align="center">
                <Spinner size="xl" color="brand.500" />
                <Text color="gray.500">กำลังโหลด...</Text>
            </VStack>
        );
    }

    if (!contract) return <Box p={4}>ไม่พบข้อมูลสัญญาเช่า</Box>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'green';
            case 'expired': return 'red';
            case 'terminated': return 'gray';
            case 'renewed': return 'blue';
            default: return 'gray';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'ใช้งานอยู่';
            case 'expired': return 'หมดอายุ';
            case 'terminated': return 'ยกเลิก';
            case 'renewed': return 'ต่อสัญญาแล้ว';
            default: return status;
        }
    };

    return (
        <VStack align="stretch" gap={6} py={4}>
            <Heading size="lg">ข้อมูลสัญญาและห้องพัก</Heading>

            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                <Card.Root>
                    <Card.Header><Heading size="sm">ข้อมูลห้องพัก</Heading></Card.Header>
                    <Card.Body>
                        <VStack align="start" gap={4}>
                            <Box>
                                <Text color="gray.500" fontSize="sm">หมายเลขห้อง</Text>
                                <Text fontWeight="bold" fontSize="xl">
                                    {(Array.isArray(contract.room) ? contract.room[0]?.room_number : contract.room?.room_number) || '-'}
                                </Text>
                            </Box>
                            <Box>
                                <Text color="gray.500" fontSize="sm">ประเภท</Text>
                                <Text>
                                    {(Array.isArray(contract.room) ? contract.room[0]?.room_type : contract.room?.room_type) || '-'}
                                </Text>
                            </Box>
                            <Box>
                                <Text color="gray.500" fontSize="sm">สถานะสัญญา</Text>
                                <Badge colorPalette={getStatusColor(contract.status)}>
                                    {getStatusLabel(contract.status)}
                                </Badge>
                            </Box>
                        </VStack>
                    </Card.Body>
                </Card.Root>

                <Card.Root>
                    <Card.Header><Heading size="sm">รายละเอียดสัญญา</Heading></Card.Header>
                    <Card.Body>
                        <VStack align="start" gap={4}>
                            <Box>
                                <Text color="gray.500" fontSize="sm">วันที่เริ่มสัญญา</Text>
                                <Text>{contract.start_date}</Text>
                            </Box>
                            <Box>
                                <Text color="gray.500" fontSize="sm">วันที่สิ้นสุดสัญญา</Text>
                                <Text>{contract.end_date}</Text>
                            </Box>
                            <Box>
                                <Text color="gray.500" fontSize="sm">ค่าเช่า</Text>
                                <Text fontWeight="bold">{formatCurrency(contract.displayRent || contract.monthly_rent)}</Text>
                            </Box>
                            <Box>
                                <Text color="gray.500" fontSize="sm">เงินประกัน</Text>
                                <Text>{formatCurrency(contract.deposit_amount)}</Text>
                            </Box>
                        </VStack>
                    </Card.Body>
                </Card.Root>
            </Grid>
        </VStack>
    );
};
