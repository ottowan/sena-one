import { Badge, Box, HStack, Text, VStack } from '@chakra-ui/react';
import { DialogBody, DialogCloseTrigger, DialogContent, DialogHeader, DialogRoot, DialogTitle } from '../ui/dialog';
import { EQUIPMENT_CONDITIONS, type RoomEquipmentSurvey, type EquipmentCondition } from '../../types/equipmentSurvey';

const conditionColor = (condition?: EquipmentCondition) => condition === 'normal' ? 'green' : condition === 'deteriorated' ? 'orange' : condition === 'unnecessary' ? 'gray' : 'red';
export function EquipmentSurveyResultDialog({ survey, onClose }: { survey: RoomEquipmentSurvey | null; onClose: () => void }) {
    return (
        <DialogRoot open={!!survey} onOpenChange={event => { if (!event.open) onClose(); }} size="lg">
            <DialogContent maxH="90dvh" overflowY="auto">
                <DialogHeader><DialogTitle>ผลสำรวจ พ.ศ. {survey ? survey.year + 543 : ''} · ห้อง {survey?.room_number}</DialogTitle><DialogCloseTrigger /></DialogHeader>
                <DialogBody pb={6}>
                    {survey && <VStack align="stretch" gap={4}>
                        <HStack wrap="wrap"><Badge colorPalette={survey.status === 'submitted' ? 'green' : 'orange'}>{survey.status === 'submitted' ? 'ส่งผลแล้ว' : 'ยังไม่ส่งผลสำรวจ'}</Badge>
                            {survey.submitted_at && <Text fontSize="xs" color="fg.muted">{new Date(survey.submitted_at).toLocaleString('th-TH')}</Text>}
                        </HStack>
                        {survey.submitted_by_name && <Text fontSize="sm" color="fg.muted">ผู้สำรวจ: {survey.submitted_by_name}</Text>}
                        {survey.items.map(item => {
                            const answer = survey.answers.find(answer => answer.equipment_id === item.id);
                            return <Box key={item.id} p={4} bg="bg.subtle" borderRadius="lg">
                                <HStack justify="space-between" wrap="wrap"><Text fontWeight="semibold">{item.name}</Text>
                                    {answer && <Badge colorPalette={conditionColor(answer.condition)}>{EQUIPMENT_CONDITIONS[answer.condition]}</Badge>}
                                </HStack>
                                <Text fontSize="xs" color="fg.muted" mt={1}>เลขครุภัณฑ์: {item.asset_number || 'ยังไม่ระบุ'}</Text>
                                {answer?.reason && <Text fontSize="sm" mt={2} whiteSpace="pre-wrap">สาเหตุ / หมายเหตุ: {answer.reason}</Text>}
                            </Box>;
                        })}
                    </VStack>}
                </DialogBody>
            </DialogContent>
        </DialogRoot>
    );
}
