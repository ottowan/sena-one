import React, { useEffect, useState } from 'react';
import { Box, Card, Heading, VStack, Text, Grid, Badge } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

export const MyContractPage: React.FC = () => {
    const { profile } = useAuth();
    const [contract, setContract] = useState<any>(null);

    useEffect(() => {
        const fetchContract = async () => {
            if (!profile?.id) return;

            const { data: tenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('user_id', profile.id)
                .maybeSingle();

            if (!tenant) return;

            const { data } = await supabase
                .from('contracts')
                .select('*, room:rooms(*)')
                .eq('tenant_id', tenant.id)
                .eq('status', 'active')
                .maybeSingle();
            setContract(data);
        };
        fetchContract();
    }, [profile]);

    if (!contract) return <Box p={4}>ไม่พบข้อมูลสัญญาเช่า</Box>;

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
                                <Badge colorPalette="green">Active</Badge>
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
                                <Text fontWeight="bold">{formatCurrency(contract.monthly_rent)}</Text>
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
