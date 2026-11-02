import { useState } from 'react';
import { Box, Button, Grid, HStack, Text, VStack, useFieldContext, type BoxProps } from '@chakra-ui/react';
import { LuCalendarDays, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { PopoverRoot, PopoverTrigger, PopoverContent, PopoverBody } from '../ui/popover';
import { NativeSelectRoot, NativeSelectField } from '../ui/native-select';
import { calendarDays, calendarValue, thaiCalendarLabel, THAI_MONTHS } from '../../lib/thaiCalendar';

interface ThaiDatePickerProps {
    type?: 'date' | 'month';
    value: string;
    onChange: (event: { target: { value: string } }) => void;
    disabled?: boolean;
    w?: BoxProps['w'];
}

export function ThaiDatePicker({ type = 'date', value, onChange, disabled, w }: ThaiDatePickerProps) {
    const now = new Date();
    const field = useFieldContext();
    const blocked = disabled || field?.disabled || field?.readOnly;
    const [open, setOpen] = useState(false);
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const label = thaiCalendarLabel(value, type);
    const years = Array.from({ length: 201 }, (_, index) => year - 100 + index);
    const choose = (next: string) => {
        onChange({ target: { value: next } });
        setOpen(false);
    };
    const moveMonth = (step: number) => {
        const next = new Date(year, month + step, 1);
        setYear(next.getFullYear());
        setMonth(next.getMonth());
    };

    return (
        <Box w={w ?? 'full'} lang="th">
            <PopoverRoot open={open && !blocked} onOpenChange={event => {
                if (event.open && !blocked) {
                    const [selectedYear, selectedMonth] = value.split('-').map(Number);
                    setYear(selectedYear || now.getFullYear());
                    setMonth(selectedMonth ? selectedMonth - 1 : now.getMonth());
                }
                setOpen(event.open);
            }} positioning={{ placement: 'bottom-start' }}>
                <PopoverTrigger asChild>
                    <Button type="button" variant="outline" w="full" justifyContent="space-between"
                        fontWeight="normal" disabled={blocked} id={field?.ids.control}
                        aria-labelledby={field?.ids.label} aria-describedby={field?.ariaDescribedby}
                        aria-invalid={field?.invalid || undefined} aria-required={field?.required || undefined}
                        aria-label={`${type === 'month' ? 'เลือกเดือน' : 'เลือกวันที่'}${label ? ` ${label}` : ''}`}>
                        {label || (type === 'month' ? 'เลือกเดือน/ปี' : 'เลือกวัน/เดือน/ปี')}
                        <LuCalendarDays />
                    </Button>
                </PopoverTrigger>
                <PopoverContent portalled={false} w="320px" maxW="calc(100vw - 32px)" aria-label="ปฏิทินภาษาไทย">
                    <PopoverBody>
                        <VStack align="stretch" gap={3}>
                            <HStack>
                                {type === 'date' && (
                                    <Button type="button" size="xs" variant="ghost" aria-label="เดือนก่อนหน้า" onClick={() => moveMonth(-1)}><LuChevronLeft /></Button>
                                )}
                                {type === 'date' && (
                                    <NativeSelectRoot flex={1}>
                                        <NativeSelectField aria-label="เดือน" value={month} onChange={event => setMonth(Number(event.target.value))}>
                                            {THAI_MONTHS.map((name, index) => <option key={name} value={index}>{name}</option>)}
                                        </NativeSelectField>
                                    </NativeSelectRoot>
                                )}
                                <NativeSelectRoot flex={1}>
                                    <NativeSelectField aria-label="ปี พ.ศ." value={year} onChange={event => setYear(Number(event.target.value))}>
                                        {years.map(item => <option key={item} value={item}>พ.ศ. {item + 543}</option>)}
                                    </NativeSelectField>
                                </NativeSelectRoot>
                                {type === 'date' && (
                                    <Button type="button" size="xs" variant="ghost" aria-label="เดือนถัดไป" onClick={() => moveMonth(1)}><LuChevronRight /></Button>
                                )}
                            </HStack>
                            {type === 'month' ? (
                                <Grid templateColumns="repeat(3, 1fr)" gap={1}>
                                    {THAI_MONTHS.map((name, index) => {
                                        const next = calendarValue(year, index);
                                        return <Button key={name} type="button" size="sm" fontWeight="normal"
                                            variant={value === next ? 'solid' : 'ghost'} colorPalette={value === next ? 'blue' : 'gray'}
                                            aria-pressed={value === next} onClick={() => choose(next)}>{name}</Button>;
                                    })}
                                </Grid>
                            ) : (
                                <Grid templateColumns="repeat(7, 1fr)" gap={1}>
                                    {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(name => <Text key={name} textAlign="center" fontSize="xs" color="fg.muted">{name}</Text>)}
                                    {calendarDays(year, month).map((day, index) => {
                                        if (day === null) return <Box key={index} />;
                                        const next = calendarValue(year, month, day);
                                        return <Button key={index} type="button" size="xs" px={0}
                                            variant={value.slice(0, 10) === next ? 'solid' : 'ghost'}
                                            colorPalette={value.slice(0, 10) === next ? 'blue' : 'gray'}
                                            aria-label={thaiCalendarLabel(next, 'date')} aria-pressed={value.slice(0, 10) === next}
                                            onClick={() => choose(next)}>{day}</Button>;
                                    })}
                                </Grid>
                            )}
                            <HStack justify="space-between">
                                <Button type="button" size="sm" variant="ghost" onClick={() => choose('')}>ล้างค่า</Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => choose(calendarValue(now.getFullYear(), now.getMonth(), type === 'date' ? now.getDate() : undefined))}>
                                    {type === 'date' ? 'วันนี้' : 'เดือนนี้'}
                                </Button>
                            </HStack>
                        </VStack>
                    </PopoverBody>
                </PopoverContent>
            </PopoverRoot>
        </Box>
    );
}
