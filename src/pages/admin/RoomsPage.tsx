import React, { useState, useMemo } from 'react';
import {
    Box,
    Grid,
    Heading,
    Text,
    Card,
    HStack,
    VStack,
    Icon,
    Input,
} from '@chakra-ui/react';
import { LuPlus, LuSearch, LuRefreshCw } from 'react-icons/lu';
import { useRooms, useRoomStats, useDeleteRoom, useForceReleaseRoom } from '../../hooks/useRooms';
import { roomService } from '../../services/roomService';
import { useRentRates } from '../../hooks/useSettings';
import { RoomCard } from '../../components/rooms/RoomCard';
import { RoomCompactCard } from '../../components/rooms/RoomCompactCard';
import { RoomTable } from '../../components/rooms/RoomTable';
import { RoomFormDialog } from '../../components/rooms/RoomFormDialog';
import { ViewModeToggle, type ViewMode } from '../../components/common/ViewModeToggle';
import { FloorFilter } from '../../components/common/FloorFilter';
import { Button } from '../../components/ui/button';
import type { Room, RoomStatus } from '../../types';
import {
    NativeSelectField,
    NativeSelectRoot,
} from '../../components/ui/native-select';

export const RoomsPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<RoomStatus | ''>('');
    const [floorFilter, setFloorFilter] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');

    const { data: rooms, isLoading } = useRooms({
        searchTerm: searchTerm || undefined,
        status: statusFilter || undefined,
        floor: floorFilter || undefined,
    });

    const { data: stats } = useRoomStats();
    const { data: rentRates } = useRentRates();
    const deleteRoom = useDeleteRoom();
    const forceReleaseRoom = useForceReleaseRoom();

    // Calculate floor counts
    const floorCounts = useMemo(() => {
        if (!rooms) return {};
        return rooms.reduce((acc, room) => {
            acc[room.floor] = (acc[room.floor] || 0) + 1;
            return acc;
        }, {} as Record<number, number>);
    }, [rooms]);

    const handleEdit = (room: Room) => {
        setSelectedRoom(room);
        setDialogOpen(true);
    };

    const handleDelete = async (room: Room) => {
        if (confirm(`ต้องการลบห้อง ${room.room_number} ใช่หรือไม่?`)) {
            deleteRoom.mutate(room.id);
        }
    };

    const handleForceRelease = async (room: Room) => {
        if (confirm(`ยืนยันการบังคับคืนห้อง ${room.room_number}? \n(การกระทำนี้จะตัดสัญญาเช่าปัจจุบันทันที ใช้เมื่อเกิดข้อผิดพลาดของระบบเท่านั้น)`)) {
            forceReleaseRoom.mutate(room.id);
        }
    };

    const handleAddRoom = () => {
        setSelectedRoom(null);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedRoom(null);
    };

    return (
        <>
            <VStack align="stretch" gap={8}>
                {/* Header */}
                <HStack justify="space-between">
                    <Box>
                        <Heading size="2xl" mb={2}>
                            จัดการห้องพัก
                        </Heading>
                        <Text color="gray.600" fontSize="lg">
                            จัดการข้อมูลห้องพักทั้งหมดในระบบ
                        </Text>
                    </Box>
                    <HStack>
                        <Button colorPalette="gray" variant="outline" size="lg" onClick={async () => {
                            if (confirm('ยืนยันการซิงค์สถานะห้องพัก? (ใช้เมื่อพบข้อมูลไม่ถูกต้อง)')) {
                                try {
                                    const count = await roomService.syncRoomStatuses();
                                    alert(`ซิงค์ข้อมูลสำเร็จ! แก้ไขข้อมูลไปทั้งหมด ${count} รายการ`);
                                    window.location.reload();
                                } catch (error) {
                                    console.error(error);
                                    alert('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
                                }
                            }
                        }}>
                            <Icon mr={2}><LuRefreshCw /></Icon>
                            ซิงค์สถานะ
                        </Button>
                        <Button colorPalette="brand" size="lg" onClick={handleAddRoom}>
                            <Icon mr={2}>
                                <LuPlus />
                            </Icon>
                            เพิ่มห้องพัก
                        </Button>
                    </HStack>
                </HStack>

                {/* Stats */}
                {stats && (
                    <Grid
                        templateColumns={{
                            base: '1fr',
                            md: 'repeat(2, 1fr)',
                            lg: 'repeat(5, 1fr)',
                        }}
                        gap={4}
                    >
                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        ห้องทั้งหมด
                                    </Text>
                                    <Heading size="xl">{stats.total}</Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        ห้องว่าง
                                    </Text>
                                    <Heading size="xl" color="success.600">
                                        {stats.available}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        มีผู้เข้าพัก
                                    </Text>
                                    <Heading size="xl" color="brand.600">
                                        {stats.occupied}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        จอง
                                    </Text>
                                    <Heading size="xl" color="warning.600">
                                        {stats.reserved}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        ซ่อมบำรุง
                                    </Text>
                                    <Heading size="xl" color="danger.600">
                                        {stats.maintenance}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>
                    </Grid>
                )}

                {/* Filters & View Mode */}
                <Card.Root>
                    <Card.Body>
                        <VStack gap={4} align="stretch">
                            <Grid
                                templateColumns={{
                                    base: '1fr',
                                    md: 'repeat(3, 1fr)',
                                }}
                                gap={4}
                            >
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
                                        placeholder="ค้นหาเลขห้อง..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        pl={10}
                                    />
                                </Box>

                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={statusFilter}
                                        onChange={(e) =>
                                            setStatusFilter(e.target.value as RoomStatus | '')
                                        }
                                    >
                                        <option value="">สถานะทั้งหมด</option>
                                        <option value="available">ว่าง</option>
                                        <option value="occupied">มีผู้เข้าพัก</option>
                                        <option value="reserved">จอง</option>
                                        <option value="maintenance">ซ่อมบำรุง</option>
                                    </NativeSelectField>
                                </NativeSelectRoot>

                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={floorFilter ?? ''}
                                        onChange={(e) =>
                                            setFloorFilter(e.target.value ? Number(e.target.value) : null)
                                        }
                                    >
                                        <option value="">ชั้นทั้งหมด</option>
                                        <option value="1">ชั้น 1</option>
                                        <option value="2">ชั้น 2</option>
                                        <option value="3">ชั้น 3</option>
                                        <option value="4">ชั้น 4</option>
                                        <option value="5">ชั้น 5</option>
                                        <option value="6">ชั้น 6</option>
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Grid>

                            {/* Floor Filter */}
                            <VStack align="stretch" gap={2}>
                                <Text fontSize="sm" color="gray.600" fontWeight="medium">
                                    กรองตามชั้น:
                                </Text>
                                <FloorFilter
                                    value={floorFilter}
                                    onChange={setFloorFilter}
                                    counts={floorCounts}
                                />
                            </VStack>

                            {/* View Mode Toggle */}
                            <HStack gap={2} justify="flex-end">
                                <Text fontSize="sm" color="gray.600">
                                    รูปแบบการแสดงผล:
                                </Text>
                                <ViewModeToggle value={viewMode} onChange={setViewMode} />
                            </HStack>
                        </VStack>
                    </Card.Body>
                </Card.Root>

                {/* Room List */}
                {isLoading ? (
                    <Box p={8} textAlign="center">
                        <Text color="gray.500">กำลังโหลด...</Text>
                    </Box>
                ) : rooms && rooms.length > 0 ? (
                    <>
                        {viewMode === 'table' ? (
                            <RoomTable
                                rooms={rooms}
                                rentRates={rentRates}
                                onView={handleEdit}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ) : (
                            <Grid
                                templateColumns={{
                                    base: '1fr',
                                    md: viewMode === 'grid' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                                    lg: viewMode === 'grid' ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)',
                                }}
                                gap={viewMode === 'grid' ? 3 : 6}
                            >
                                {rooms.map((room) =>
                                    viewMode === 'grid' ? (
                                        <RoomCompactCard
                                            key={room.id}
                                            room={room}
                                            rentRates={rentRates}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onRelease={handleForceRelease}
                                        />
                                    ) : (
                                        <RoomCard
                                            key={room.id}
                                            room={room}
                                            rentRates={rentRates}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onRelease={handleForceRelease}
                                        />
                                    )
                                )}
                            </Grid>
                        )}
                    </>
                ) : (
                    <Card.Root>
                        <Card.Body>
                            <VStack gap={4} py={8}>
                                <VStack gap={2}>
                                    <Heading size="md" color="gray.600">
                                        ยังไม่มีห้องพัก
                                    </Heading>
                                    <Text color="gray.500">
                                        เริ่มต้นโดยการเพิ่มห้องพักแรกของคุณ
                                    </Text>
                                </VStack>
                                <Button colorPalette="brand" onClick={handleAddRoom}>
                                    <Icon mr={2}>
                                        <LuPlus />
                                    </Icon>
                                    เพิ่มห้องพัก
                                </Button>
                            </VStack>
                        </Card.Body>
                    </Card.Root>
                )}
            </VStack>

            {/* Room Form Dialog */}
            <RoomFormDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                room={selectedRoom}
            />
        </>
    );
};
