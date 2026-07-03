import React from 'react';
import { HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { getRoomEquipmentIcon, getRoomEquipmentColor } from './roomEquipmentMeta';
import type { RoomEquipmentItem } from '../../types';

interface EquipmentListProps {
    equipment: RoomEquipmentItem[];
}

export const EquipmentList: React.FC<EquipmentListProps> = ({ equipment }) => {
    if (equipment.length === 0) {
        return (
            <Text color="gray.500" fontSize="sm">
                ยังไม่มีรายการครุภัณฑ์
            </Text>
        );
    }

    return (
        <VStack align="stretch" gap={0}>
            {equipment.map((item) => {
                const ItemIcon = getRoomEquipmentIcon(item.name);
                return (
                    <HStack key={item.id} justify="space-between" py={2} borderBottomWidth="1px" borderColor="gray.100">
                        <HStack gap={3}>
                            <Icon color={getRoomEquipmentColor(item.name)}>
                                <ItemIcon />
                            </Icon>
                            <Text>{item.name}</Text>
                        </HStack>
                        <Text color="gray.600" fontSize="sm">
                            {item.asset_number || '-'}
                        </Text>
                    </HStack>
                );
            })}
        </VStack>
    );
};
