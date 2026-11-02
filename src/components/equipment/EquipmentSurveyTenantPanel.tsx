import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Box, Card, HStack, Text, VStack } from '@chakra-ui/react';
import { equipmentSurveyService } from '../../services/equipmentSurveyService';
import { Button } from '../ui/button';
import { DataLoadError } from '../common/DataLoadError';
import { EquipmentSurveyFormDialog } from './EquipmentSurveyFormDialog';
import { EquipmentSurveyResultDialog } from './EquipmentSurveyResultDialog';
import type { RoomEquipmentSurvey } from '../../types/equipmentSurvey';

export function EquipmentSurveyTenantPanel({ roomId, userId }: { roomId: string; userId: string }) {
    const history = useQuery({ queryKey: ['equipment-surveys', 'history', roomId, userId], queryFn: () => equipmentSurveyService.getRoomHistory(roomId) });
    const [editing, setEditing] = useState<RoomEquipmentSurvey | null>(null);
    const [viewing, setViewing] = useState<RoomEquipmentSurvey | null>(null);
    return (
        <>
            <Card.Root>
                <Card.Header><Text fontWeight="semibold" fontSize="lg">สำรวจสภาพครุภัณฑ์ / ประวัติรายปี</Text></Card.Header>
                <Card.Body>
                    {history.isError ? <DataLoadError onRetry={() => { void history.refetch(); }} /> : history.isLoading ? <Text color="fg.muted">กำลังโหลดรอบสำรวจ...</Text> : !history.data?.length ? <Text fontSize="sm" color="fg.muted">ผู้ดูแลยังไม่ได้เปิดรอบสำรวจสำหรับห้องนี้ เมื่อเปิดรอบแล้วสามารถกรอกได้ที่นี่</Text> : (
                        <VStack align="stretch" gap={3}>
                            {history.data.map(({ round, survey }) => <HStack key={round.id} data-testid={`equipment-survey-year-${round.year}`} p={4} borderWidth="1px" borderRadius="lg" borderColor="border.default" justify="space-between" wrap="wrap" gap={3}>
                                <Box><Text fontWeight="semibold">พ.ศ. {round.year + 543}</Text>
                                    <HStack mt={1} gap={2} wrap="wrap"><Badge colorPalette={survey.status === 'submitted' ? 'green' : round.status === 'open' ? 'orange' : 'gray'}>
                                        {survey.status === 'submitted' ? 'ส่งผลแล้ว' : round.status === 'open' ? 'รอสำรวจ' : 'ปิดรอบแล้ว · ยังไม่ได้ส่ง'}
                                    </Badge><Text fontSize="xs" color="fg.muted">{survey.items.length} รายการ</Text></HStack>
                                </Box>
                                {survey.status === 'submitted' ? <Button size="sm" variant="outline" onClick={() => setViewing(survey)}>ดูผลสำรวจ</Button> : round.status === 'open' ? <Button size="sm" colorPalette="brand" onClick={() => setEditing(survey)}>เริ่มสำรวจ</Button> : <Text fontSize="xs" color="fg.muted">ติดต่อผู้ดูแลเพื่อเปิดรับอีกครั้ง</Text>}
                            </HStack>)}
                        </VStack>
                    )}
                </Card.Body>
            </Card.Root>
            {editing && <EquipmentSurveyFormDialog key={`${editing.year}-${editing.room_id}`} survey={editing} onClose={() => setEditing(null)} />}
            <EquipmentSurveyResultDialog survey={viewing} onClose={() => setViewing(null)} />
        </>
    );
}
