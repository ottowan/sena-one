import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Box, Card, Grid, HStack, Table, Text } from '@chakra-ui/react';
import { equipmentSurveyService } from '../../services/equipmentSurveyService';
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { Button } from '../ui/button';
import { toaster } from '../ui/toaster';
import { DataLoadError } from '../common/DataLoadError';
import { EquipmentSurveyResultDialog } from './EquipmentSurveyResultDialog';
import type { RoomEquipmentSurvey } from '../../types/equipmentSurvey';

export function EquipmentSurveyAdminPanel() {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [selected, setSelected] = useState<RoomEquipmentSurvey | null>(null);
    const client = useQueryClient();
    const rounds = useQuery({ queryKey: ['equipment-surveys', 'rounds'], queryFn: () => equipmentSurveyService.getRounds() });
    const round = rounds.data?.find(item => item.year === year);
    const rooms = useQuery({ queryKey: ['equipment-surveys', 'rooms', year], queryFn: () => equipmentSurveyService.getRoundRooms(year), enabled: !!round });
    const years = [...new Set([year, ...Array.from({ length: 7 }, (_, index) => currentYear + 1 - index), ...(rounds.data || []).map(item => item.year)])].sort((a, b) => b - a);
    const mutation = useMutation({
        mutationFn: async () => round ? equipmentSurveyService.setStatus(year, round.status === 'open' ? 'closed' : 'open') : equipmentSurveyService.open(year),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: ['equipment-surveys'] });
            toaster.create({ title: 'อัปเดตรอบสำรวจเรียบร้อยแล้ว', type: 'success' });
        },
        onError: (error: Error) => { toaster.create({ title: 'ไม่สามารถอัปเดตรอบสำรวจได้', description: error.message, type: 'error' }); },
    });
    const results = rooms.data || [];
    const submitted = results.filter(item => item.status === 'submitted').length;
    const issues = results.filter(item => item.answers.some(answer => answer.condition !== 'normal')).length;
    return (
        <>
            <Card.Root borderColor="brand.emphasized">
                <Card.Header>
                    <HStack justify="space-between" wrap="wrap" gap={3}>
                        <Box><Text fontWeight="semibold" fontSize="lg">สำรวจสภาพครุภัณฑ์ประจำปี</Text><Text fontSize="sm" color="fg.muted">ผู้ดูแลเปิดรอบ ลูกบ้านตรวจสภาพ และเก็บผลแยกตามปี</Text></Box>
                        <HStack wrap="wrap">
                            <NativeSelectRoot w="160px" disabled={mutation.isPending}><NativeSelectField aria-label="ปีสำรวจครุภัณฑ์" value={year} onChange={event => setYear(Number(event.target.value))}>
                                {years.map(item => <option key={item} value={item}>พ.ศ. {item + 543}</option>)}
                            </NativeSelectField></NativeSelectRoot>
                            <Button colorPalette={round?.status === 'open' ? 'orange' : 'brand'} loading={mutation.isPending} disabled={rounds.isLoading || rounds.isError || rooms.isLoading} onClick={() => {
                                const message = !round ? `เปิดสำรวจปี พ.ศ. ${year + 543} โดยใช้รายการครุภัณฑ์ปัจจุบันของแต่ละห้อง?` : round.status === 'open' ? 'ปิดรับสำรวจ? ลูกบ้านจะไม่สามารถส่งผลเพิ่มได้จนกว่าจะเปิดรับอีกครั้ง' : 'เปิดรับอีกครั้งสำหรับห้องที่ยังไม่ส่ง? ผลที่ส่งแล้วจะคงเดิม';
                                if (confirm(message)) mutation.mutate();
                            }}>{!round ? 'เปิดรอบสำรวจ' : round.status === 'open' ? 'ปิดรับสำรวจ' : 'เปิดรับอีกครั้ง'}</Button>
                        </HStack>
                    </HStack>
                </Card.Header>
                <Card.Body gap={4}>
                    {rounds.isError ? <DataLoadError onRetry={() => { void rounds.refetch(); }} /> : rounds.isLoading ? <Text color="fg.muted">กำลังโหลดรอบสำรวจ...</Text> : !round ? (
                        <Text color="fg.muted" fontSize="sm">ยังไม่มีรอบสำรวจปี พ.ศ. {year + 543} · เติมเลขครุภัณฑ์ให้ครบก่อนเปิดรอบ เพื่อให้รายการในแบบสำรวจถูกต้อง</Text>
                    ) : <>
                        <HStack wrap="wrap"><Badge colorPalette={round.status === 'open' ? 'green' : 'gray'}>{round.status === 'open' ? 'เปิดรับสำรวจ' : 'ปิดรับแล้ว'}</Badge><Text fontSize="xs" color="fg.muted">เปิดเมื่อ {new Date(round.opened_at).toLocaleDateString('th-TH')}</Text></HStack>
                        {rooms.isError ? <DataLoadError onRetry={() => { void rooms.refetch(); }} /> : rooms.isLoading ? <Text color="fg.muted">กำลังโหลดผลสำรวจ...</Text> : <>
                            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3}>
                                {[['ห้องในรอบนี้', results.length], ['ส่งผลแล้ว', submitted], ['ยังไม่ส่ง', results.length - submitted], ['มีสภาพไม่ปกติ', issues]].map(([label, value]) => <Box key={String(label)} p={3} bg="bg.subtle" borderRadius="lg"><Text fontSize="xs" color="fg.muted">{label}</Text><Text fontSize="2xl" fontWeight="semibold">{value}</Text></Box>)}
                            </Grid>
                            <Box overflowX="auto" maxH="400px">
                                <Table.Root size="sm" stickyHeader minW="520px"><Table.Header><Table.Row><Table.ColumnHeader>ห้อง</Table.ColumnHeader><Table.ColumnHeader>สถานะ</Table.ColumnHeader><Table.ColumnHeader>ส่งเมื่อ</Table.ColumnHeader><Table.ColumnHeader>รายละเอียด</Table.ColumnHeader></Table.Row></Table.Header>
                                    <Table.Body>{results.map(item => <Table.Row key={item.room_id}>
                                        <Table.Cell><Text fontWeight="semibold">{item.room_number}</Text>{!item.occupied_at_open && <Text fontSize="xs" color="fg.muted">ไม่มีผู้พักตอนเปิดรอบ</Text>}</Table.Cell>
                                        <Table.Cell><Badge colorPalette={item.status === 'submitted' ? 'green' : 'orange'}>{item.status === 'submitted' ? 'ส่งผลแล้ว' : 'ยังไม่ส่ง'}</Badge></Table.Cell>
                                        <Table.Cell>{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('th-TH') : '-'}</Table.Cell>
                                        <Table.Cell><Button size="sm" variant="ghost" colorPalette="brand" onClick={() => setSelected(item)}>{item.status === 'submitted' ? 'ดูผลสำรวจ' : 'ดูรายการ'}</Button></Table.Cell>
                                    </Table.Row>)}</Table.Body>
                                </Table.Root>
                            </Box>
                            <Text fontSize="xs" color="fg.muted">เลือกปีด้านบนเพื่อดูประวัติ รายการและเลขครุภัณฑ์ในแต่ละรอบจะเก็บตามวันที่เปิดสำรวจ</Text>
                        </>}
                    </>}
                </Card.Body>
            </Card.Root>
            <EquipmentSurveyResultDialog survey={selected} onClose={() => setSelected(null)} />
        </>
    );
}
