import React, { useEffect, useState } from 'react';
import { Badge, Box, Card, Heading, Spinner, Text, VStack } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { EquipmentList } from '../../components/rooms/EquipmentList';
import type { Room } from '../../types';

export const MyEquipmentPage: React.FC = () => {
    const { profile } = useAuth();
    const [room, setRoom] = useState<Room | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchRoom = async () => {
            if (!profile?.id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const contractsSnap = await getDocs(
                    query(collection(db, 'contracts'), where('tenant_uid', '==', profile.id))
                );
                const activeContractDoc = contractsSnap.docs.find((d) => d.data().status === 'active');
                const roomId = activeContractDoc?.data().room_id;

                if (!roomId) {
                    if (!cancelled) setRoom(null);
                    return;
                }

                const roomSnap = await getDoc(doc(db, 'rooms', roomId));
                if (!cancelled) setRoom(roomSnap.exists() ? ({ id: roomSnap.id, ...roomSnap.data() } as Room) : null);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void fetchRoom();

        return () => {
            cancelled = true;
        };
    }, [profile?.id]);

    if (isLoading) {
        return (
            <VStack h="50vh" justify="center" align="center">
                <Spinner size="xl" color="brand.500" />
                <Text color="gray.500">กำลังโหลด...</Text>
            </VStack>
        );
    }

    if (!room) {
        return <Box p={4}>ไม่พบข้อมูลห้องพักสำหรับบัญชีนี้</Box>;
    }

    return (
        <VStack align="stretch" gap={6} py={4}>
            <Heading size="lg">ทะเบียนครุภัณฑ์</Heading>

            <Card.Root>
                <Card.Header>
                    <VStack align="start" gap={1}>
                        <Text color="gray.500" fontSize="sm">ครุภัณฑ์ประจำห้อง</Text>
                        <Heading size="md">
                            {room.room_number} <Badge colorPalette="blue">{room.room_type}</Badge>
                        </Heading>
                    </VStack>
                </Card.Header>
                <Card.Body>
                    <EquipmentList equipment={room.equipment || []} />
                </Card.Body>
            </Card.Root>
        </VStack>
    );
};
