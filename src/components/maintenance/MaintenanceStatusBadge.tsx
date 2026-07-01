import React from 'react';
import { Badge } from '@chakra-ui/react';
import { MaintenanceStatus } from '../../types';

interface MaintenanceStatusBadgeProps {
    status: MaintenanceStatus;
}

export const MaintenanceStatusBadge: React.FC<MaintenanceStatusBadgeProps> = ({ status }) => {
    let colorPalette = 'gray';
    let label: string = status;

    switch (status) {
        case 'pending':
            colorPalette = 'yellow';
            label = 'รอรับเรื่อง';
            break;
        case 'in_progress':
            colorPalette = 'blue';
            label = 'กำลังดำเนินการ';
            break;
        case 'completed':
            colorPalette = 'green';
            label = 'เสร็จสิ้น';
            break;
        case 'cancelled':
            colorPalette = 'red';
            label = 'ยกเลิก';
            break;
    }

    return (
        <Badge colorPalette={colorPalette} variant="solid">
            {label}
        </Badge>
    );
};
