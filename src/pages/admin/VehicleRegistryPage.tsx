import React, { useState } from 'react';
import { Box, Card, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { LuCarFront, LuPlus } from 'react-icons/lu';
import { useVehicleRegistry, useDeleteVehicle } from '../../hooks/useVehicleRegistry';
import { VehicleFormDialog } from '../../components/vehicles/VehicleFormDialog';
import { VehicleTable } from '../../components/vehicles/VehicleTable';
import { Button } from '../../components/ui/button';
import { SearchInput } from '../../components/common/SearchInput';
import type { VehicleRegistration } from '../../types';

export const VehicleRegistryPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleRegistration | null>(null);

    const { data: vehicles, isLoading } = useVehicleRegistry({ plate: searchTerm || undefined });
    const deleteVehicle = useDeleteVehicle();

    const handleAdd = () => {
        setSelectedVehicle(null);
        setDialogOpen(true);
    };

    const handleEdit = (vehicle: VehicleRegistration) => {
        setSelectedVehicle(vehicle);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedVehicle(null);
    };

    const handleDelete = (vehicle: VehicleRegistration) => {
        if (confirm(`ต้องการลบรถทะเบียน ${vehicle.plate} ใช่หรือไม่?`)) {
            deleteVehicle.mutate(vehicle.id);
        }
    };

    return (
        <>
            <VStack align="stretch" gap={8}>
                <HStack justify="space-between">
                    <Box>
                        <Heading size="2xl" mb={2}>
                            ทะเบียนคุมรถยนต์
                        </Heading>
                        <Text color="fg.muted" fontSize="lg">
                            จัดการข้อมูลรถของผู้พักอาศัยแยกตามเลขห้อง
                        </Text>
                    </Box>
                    <Button colorPalette="blue" size="lg" onClick={handleAdd}>
                        <Icon mr={2}>
                            <LuPlus />
                        </Icon>
                        เพิ่มข้อมูล
                    </Button>
                </HStack>

                <Card.Root>
                    <Card.Body>
                        <SearchInput
                            placeholder="ค้นหาจากเลขทะเบียน..."
                            value={searchTerm}
                            onChange={setSearchTerm}
                        />
                    </Card.Body>
                </Card.Root>

                {isLoading ? (
                    <Box p={8} textAlign="center">
                        <Text color="fg.muted">กำลังโหลด...</Text>
                    </Box>
                ) : vehicles && vehicles.length > 0 ? (
                    <VehicleTable vehicles={vehicles} onEdit={handleEdit} onDelete={handleDelete} searchTerm={searchTerm} />
                ) : (
                    <Card.Root>
                        <Card.Body>
                            <VStack gap={4} py={8}>
                                <Icon fontSize="4xl" color="fg.subtle">
                                    <LuCarFront />
                                </Icon>
                                <VStack gap={2}>
                                    <Heading size="md" color="fg.muted">
                                        ยังไม่มีข้อมูลรถ
                                    </Heading>
                                    <Text color="fg.muted">เริ่มต้นโดยการเพิ่มข้อมูลรถคันแรก</Text>
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

            <VehicleFormDialog open={dialogOpen} onClose={handleCloseDialog} vehicle={selectedVehicle} />
        </>
    );
};
