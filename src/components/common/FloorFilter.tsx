import React from 'react';
import { HStack, Button, Badge } from '@chakra-ui/react';

interface FloorFilterProps {
    value: number | null;
    onChange: (floor: number | null) => void;
    counts?: Record<number, number>; // จำนวนห้องในแต่ละชั้น
}

const FLOORS = [1, 2, 3, 4, 5, 6];

export const FloorFilter: React.FC<FloorFilterProps> = ({ value, onChange, counts }) => {
    return (
        <HStack gap={2} wrap="wrap">
            <Button
                size="sm"
                variant={value === null ? 'solid' : 'outline'}
                colorPalette={value === null ? 'blue' : 'gray'}
                onClick={() => onChange(null)}
            >
                ทั้งหมด
                {counts && (
                    <Badge ml={2} colorPalette="blue">
                        {Object.values(counts).reduce((a, b) => a + b, 0)}
                    </Badge>
                )}
            </Button>

            {FLOORS.map((floor) => (
                <Button
                    key={floor}
                    size="sm"
                    variant={value === floor ? 'solid' : 'outline'}
                    colorPalette={value === floor ? 'blue' : 'gray'}
                    onClick={() => onChange(floor)}
                >
                    ชั้น {floor}
                    {counts && counts[floor] !== undefined && (
                        <Badge ml={2} colorPalette="blue">
                            {counts[floor]}
                        </Badge>
                    )}
                </Button>
            ))}
        </HStack>
    );
};
