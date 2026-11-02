import { HStack, Input, Text, VStack } from '@chakra-ui/react';
import { LuDroplets, LuZap } from 'react-icons/lu';
import type { MeterKind } from '../../lib/meterPaste';

export function MeterReadingEditor({ kind, roomNumber, previous, current, disabled, onChange }: {
    kind: MeterKind; roomNumber: string; previous: number; current: number | '';
    disabled: boolean; onChange: (value: string) => void;
}) {
    const water = kind === 'water';
    const issue = current !== '' && (!Number.isFinite(current) || current < previous);
    const usage = current === '' || issue ? null : current - previous;
    return (
        <VStack align="stretch" gap={2}>
            <HStack justify="space-between" wrap="wrap" gap={1} fontSize="xs">
                <HStack gap={1} color={water ? 'blue.fg' : 'orange.fg'}>{water ? <LuDroplets /> : <LuZap />}<Text>{water ? 'น้ำประปา' : 'ไฟฟ้า'}</Text></HStack>
                <Text color="fg.muted">ก่อน {previous.toLocaleString('th-TH')}</Text>
            </HStack>
            <Input type="number" inputMode="decimal" min={0} step="any" size="lg" value={current}
                aria-label={`${water ? 'มิเตอร์น้ำ' : 'มิเตอร์ไฟ'}ปัจจุบัน ห้อง ${roomNumber}`}
                placeholder="เลขปัจจุบัน" disabled={disabled} aria-invalid={issue || undefined}
                bg={issue ? 'danger.subtle' : 'bg.panel'} borderColor={issue ? 'danger.fg' : 'border.default'}
                fontWeight="semibold" onChange={event => onChange(event.target.value)} />
            <Text fontSize="xs" color={issue ? 'danger.fg' : usage === null ? 'fg.subtle' : water ? 'blue.fg' : 'orange.fg'}>
                {issue ? 'ตรวจสอบ: ต่ำกว่าครั้งก่อนหรือค่าไม่ถูกต้อง' : usage === null ? 'ยังไม่ได้กรอก' : `ใช้ไป ${usage.toLocaleString('th-TH')} หน่วย`}
            </Text>
        </VStack>
    );
}
