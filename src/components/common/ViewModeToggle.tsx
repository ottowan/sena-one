import React from 'react';
import { HStack, IconButton } from '@chakra-ui/react';
import { LuGrid3X3, LuList, LuTable } from 'react-icons/lu';
import { Tooltip } from '../ui/tooltip';

export type ViewMode = 'grid' | 'list' | 'table';

interface ViewModeToggleProps {
    value: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ value, onChange }) => {
    return (
        <HStack gap={1} p={1} bg="bg.subtle" borderWidth="1px" borderColor="border.default" borderRadius="lg" aria-label="รูปแบบการแสดงผล">
            <Tooltip content="แสดงแบบการ์ด">
                <IconButton
                    aria-label="แสดงแบบการ์ด"
                    aria-pressed={value === 'grid'}
                    size="sm"
                    variant={value === 'grid' ? 'solid' : 'outline'}
                    colorPalette={value === 'grid' ? 'brand' : 'gray'}
                    onClick={() => onChange('grid')}
                >
                    <LuGrid3X3 />
                </IconButton>
            </Tooltip>

            <Tooltip content="แสดงแบบรายการ">
                <IconButton
                    aria-label="แสดงแบบรายการ"
                    aria-pressed={value === 'list'}
                    size="sm"
                    variant={value === 'list' ? 'solid' : 'outline'}
                    colorPalette={value === 'list' ? 'brand' : 'gray'}
                    onClick={() => onChange('list')}
                >
                    <LuList />
                </IconButton>
            </Tooltip>

            <Tooltip content="แสดงแบบตาราง">
                <IconButton
                    aria-label="แสดงแบบตาราง"
                    aria-pressed={value === 'table'}
                    size="sm"
                    variant={value === 'table' ? 'solid' : 'outline'}
                    colorPalette={value === 'table' ? 'brand' : 'gray'}
                    onClick={() => onChange('table')}
                >
                    <LuTable />
                </IconButton>
            </Tooltip>
        </HStack>
    );
};
