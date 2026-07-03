import React, { useMemo, useState } from 'react';
import { Box, Card, Heading, HStack, Icon, Input, Text, VStack } from '@chakra-ui/react';
import { LuBoxes, LuPlus, LuSearch } from 'react-icons/lu';
import { useRooms, useSeedDefaultEquipment } from '../../hooks/useRooms';
import { EquipmentFormDialog } from '../../components/equipment/EquipmentFormDialog';
import { EquipmentTable } from '../../components/equipment/EquipmentTable';
import { Button } from '../../components/ui/button';
import type { Room } from '../../types';

export const EquipmentRegistryPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    const { data: rooms, isLoading } = useRooms();
    const seedDefaultEquipment = useSeedDefaultEquipment();

    const roomsWithEquipment = useMemo(() => {
        const withEquipment = (rooms || []).filter((room) => room.equipment && room.equipment.length > 0);
        if (!searchTerm) return withEquipment;

        const term = searchTerm.toLowerCase();
        return withEquipment.filter((room) =>
            room.equipment!.some(
                (item) =>
                    item.name.toLowerCase().includes(term) ||
                    (item.asset_number || '').toLowerCase().includes(term)
            )
        );
    }, [rooms, searchTerm]);

    const handleAdd = () => {
        setSelectedRoom(null);
        setDialogOpen(true);
    };

    const handleEdit = (room: Room) => {
        setSelectedRoom(room);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedRoom(null);
    };

    return (
        <>
            <VStack align="stretch" gap={8}>
                <HStack justify="space-between">
                    <Box>
                        <Heading size="2xl" mb={2}>
                            ทะเบียนคุมครุภัณฑ์
                        </Heading>
                        <Text color="gray.600" fontSize="lg">
                            จัดการรายการครุภัณฑ์ประจำห้องพักทั้งหมด
                        </Text>
                    </Box>
                    <HStack>
                        <Button
                            colorPalette="gray"
                            variant="outline"
                            size="lg"
                            loading={seedDefaultEquipment.isPending}
                            onClick={() => {
                                if (confirm('เพิ่มรายการครุภัณฑ์เริ่มต้นให้ทุกห้องที่ยังไม่มีข้อมูล ใช่หรือไม่?')) {
                                    seedDefaultEquipment.mutate();
                                }
                            }}
                        >
                            <Icon mr={2}>
                                <LuBoxes />
                            </Icon>
                            เพิ่มครุภัณฑ์เริ่มต้น
                        </Button>
                        <Button colorPalette="blue" size="lg" onClick={handleAdd}>
                            <Icon mr={2}>
                                <LuPlus />
                            </Icon>
                            เพิ่มข้อมูล
                        </Button>
                    </HStack>
                </HStack>

                <Card.Root>
                    <Card.Body>
                        <Box position="relative">
                            <Icon
                                position="absolute"
                                left={3}
                                top="50%"
                                transform="translateY(-50%)"
                                color="gray.400"
                                zIndex={1}
                            >
                                <LuSearch />
                            </Icon>
                            <Input
                                placeholder="ค้นหาจากชื่อรายการหรือเลขครุภัณฑ์..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                pl={10}
                            />
                        </Box>
                    </Card.Body>
                </Card.Root>

                {isLoading ? (
                    <Box p={8} textAlign="center">
                        <Text color="gray.500">กำลังโหลด...</Text>
                    </Box>
                ) : roomsWithEquipment.length > 0 ? (
                    <EquipmentTable rooms={roomsWithEquipment} onEdit={handleEdit} />
                ) : (
                    <Card.Root>
                        <Card.Body>
                            <VStack gap={4} py={8}>
                                <Icon fontSize="4xl" color="gray.400">
                                    <LuBoxes />
                                </Icon>
                                <VStack gap={2}>
                                    <Heading size="md" color="gray.600">
                                        ยังไม่มีข้อมูลครุภัณฑ์
                                    </Heading>
                                    <Text color="gray.500">
                                        เริ่มต้นโดยการเพิ่มข้อมูล หรือกด "เพิ่มครุภัณฑ์เริ่มต้น" เพื่อเติมรายการมาตรฐานให้ทุกห้อง
                                    </Text>
                                </VStack>
                                <Button colorPalette="blue" onClick={handleAdd}>
                                    <Icon mr={2}>
                                        <LuPlus />
                                    </Icon>
                                    เพิ่มข้อมูล
                                </Button>
                            </VStack>
                        </Card.Body>
                    </Card.Root>
                )}
            </VStack>

            <EquipmentFormDialog open={dialogOpen} onClose={handleCloseDialog} room={selectedRoom} />
        </>
    );
};
