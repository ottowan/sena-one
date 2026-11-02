import { Button, HStack, Text } from '@chakra-ui/react';
import { LuRotateCcw } from 'react-icons/lu';

export function FilterSummary({ count, unit = 'รายการ', filtered, onClear }: {
    count: number; unit?: string; filtered: boolean; onClear: () => void;
}) {
    return (
        <HStack justify="space-between" wrap="wrap" gap={2} mt={-2}>
            <Text fontSize="sm" color="fg.muted">{filtered ? 'ผลการค้นหา' : 'ทั้งหมด'} <Text as="span" color="fg.default" fontWeight="semibold">{count.toLocaleString('th-TH')}</Text> {unit}</Text>
            {filtered && <Button type="button" size="sm" variant="ghost" colorPalette="brand" onClick={onClear}><LuRotateCcw /> ล้างตัวกรอง</Button>}
        </HStack>
    );
}
