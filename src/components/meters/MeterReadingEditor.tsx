import { Box, Grid, HStack, Input, Text } from '@chakra-ui/react';
import { LuDroplets, LuZap } from 'react-icons/lu';
import type { MeterKind } from '../../lib/meterPaste';

export interface MeterReadingProps {
    kind: MeterKind; roomNumber: string; previous: number; current: number | '';
    disabled: boolean; onChange: (value: string) => void;
}

export function MeterReadingInput({ kind, roomNumber, previous, current, disabled, onChange }: MeterReadingProps) {
    const issue = current !== '' && (!Number.isFinite(current) || current < previous);
    return <Input type="number" inputMode="decimal" min={0} step="any" size="lg" value={current}
        data-meter-input="true" aria-label={`${kind === 'water' ? 'มิเตอร์น้ำ' : 'มิเตอร์ไฟ'}ปัจจุบัน ห้อง ${roomNumber}`}
        placeholder="กรอกเลขหน้าปัด" disabled={disabled} aria-invalid={issue || undefined}
        bg={issue ? 'danger.subtle' : 'bg.panel'} borderWidth="2px"
        borderColor={issue ? 'danger.fg' : kind === 'water' ? 'blue.fg' : 'orange.fg'}
        textAlign="right" fontSize="xl" fontWeight="bold" fontVariantNumeric="tabular-nums"
        onKeyDown={event => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            const inputs = [...document.querySelectorAll<HTMLInputElement>('[data-meter-input]')].filter(input => input.getClientRects().length && !input.disabled);
            const next = inputs[inputs.indexOf(event.currentTarget) + (event.shiftKey ? -1 : 1)];
            next?.focus();
            next?.select();
        }} onChange={event => onChange(event.target.value)} />;
}

export function MeterReadingUsage({ previous, current }: Pick<MeterReadingProps, 'previous' | 'current'>) {
    const issue = current !== '' && (!Number.isFinite(current) || current < previous);
    return <Text fontSize={issue ? 'sm' : 'lg'} fontWeight="semibold" color={issue ? 'danger.fg' : current === '' ? 'fg.muted' : 'fg'} fontVariantNumeric="tabular-nums">
        {issue ? 'ต่ำกว่าครั้งก่อน กรุณาตรวจสอบ' : current === '' ? '—' : `${(current - previous).toLocaleString('th-TH')} หน่วย`}
    </Text>;
}

export function MeterReadingEditor(props: MeterReadingProps) {
    const { kind, previous } = props;
    const water = kind === 'water';
    return (
        <Box bg={water ? 'blue.subtle' : 'orange.subtle'} p={3} borderRadius="lg">
            <HStack mb={3} gap={2} color={water ? 'blue.fg' : 'orange.fg'} fontWeight="semibold">{water ? <LuDroplets /> : <LuZap />}<Text>{water ? 'มิเตอร์น้ำ' : 'มิเตอร์ไฟฟ้า'}</Text></HStack>
            <Grid templateColumns="1fr 1.5fr" gap={3} alignItems="center">
                <Box><Text fontSize="sm" color="fg.muted">เลขครั้งก่อน</Text><Text fontSize="xl" fontWeight="semibold">{previous.toLocaleString('th-TH')}</Text></Box>
                <Box><Text fontSize="sm" mb={1} fontWeight="semibold">กรอกเลขครั้งนี้</Text><MeterReadingInput {...props} /></Box>
            </Grid>
            <HStack mt={3} justify="space-between"><Text fontSize="sm" color="fg.muted">ใช้เดือนนี้</Text><MeterReadingUsage {...props} /></HStack>
        </Box>
    );
}
