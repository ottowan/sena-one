import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Box, Text, Textarea, VStack } from '@chakra-ui/react';
import { DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from '../ui/dialog';
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { Field } from '../ui/field';
import { Button } from '../ui/button';
import { toaster } from '../ui/toaster';
import { equipmentSurveyService } from '../../services/equipmentSurveyService';
import { EQUIPMENT_CONDITIONS, validateSurveyAnswers, type EquipmentCondition, type RoomEquipmentSurvey } from '../../types/equipmentSurvey';

export function EquipmentSurveyFormDialog({ survey, onClose }: { survey: RoomEquipmentSurvey | null; onClose: () => void }) {
    const [answers, setAnswers] = useState<Record<string, { condition: EquipmentCondition | ''; reason: string }>>({});
    const [error, setError] = useState('');
    const client = useQueryClient();
    const submit = useMutation({
        mutationFn: (data: Parameters<typeof equipmentSurveyService.submit>) => equipmentSurveyService.submit(...data),
        onSuccess: () => {
            void client.invalidateQueries({ queryKey: ['equipment-surveys'] });
            toaster.create({ title: 'ส่งผลสำรวจเรียบร้อยแล้ว', type: 'success' }); onClose();
        },
        onError: (error: Error) => { setError(error.message); },
    });
    const change = (id: string, field: 'condition' | 'reason', value: string) => {
        setAnswers(prev => ({ ...prev, [id]: { condition: '', reason: '', ...prev[id], [field]: value, ...(field === 'condition' && value === 'normal' ? { reason: '' } : {}) } }));
        setError('');
    };
    return (
        <DialogRoot open={!!survey} onOpenChange={event => { if (!event.open && !submit.isPending) onClose(); }} size="lg" closeOnInteractOutside={false}>
            <DialogContent maxH="90dvh" overflowY="auto">
                <DialogHeader><DialogTitle>สำรวจครุภัณฑ์ พ.ศ. {survey ? survey.year + 543 : ''}</DialogTitle><DialogCloseTrigger disabled={submit.isPending} /></DialogHeader>
                <form onSubmit={event => {
                    event.preventDefault(); if (!survey || submit.isPending) return;
                    try {
                        const result = validateSurveyAnswers(survey.items, survey.items.map(item => ({ equipment_id: item.id, ...answers[item.id] })));
                        if (!window.confirm('ยืนยันส่งผลสำรวจ? หลังส่งแล้วจะเก็บเป็นประวัติประจำปีและไม่สามารถแก้ไขได้')) return;
                        submit.mutate([survey.year, survey.room_id, result]);
                    } catch (error) { setError((error as Error).message); }
                }}>
                    <DialogBody>
                        {survey && <VStack align="stretch" gap={4}>
                            <Badge alignSelf="start" colorPalette="brand">ห้อง {survey.room_number} · {survey.items.length} รายการ</Badge>
                            <Text fontSize="sm" color="fg.muted">ตรวจแต่ละชิ้นและเลือกสภาพการใช้งาน หากไม่ปกติต้องระบุสาเหตุประกอบ</Text>
                            {survey.items.map((item, index) => {
                                const answer = answers[item.id];
                                return <Box key={item.id} p={4} borderWidth="1px" borderColor="border.default" borderRadius="xl">
                                    <Text fontWeight="semibold">{index + 1}. {item.name}</Text>
                                    <Text fontSize="xs" color="fg.muted" mb={3}>เลขครุภัณฑ์: {item.asset_number || 'ยังไม่ระบุ'}</Text>
                                    <Field label="สภาพการใช้งาน" required>
                                        <NativeSelectRoot disabled={submit.isPending}><NativeSelectField aria-required="true" aria-label={`สภาพ ${item.name} รายการ ${index + 1}`} value={answer?.condition || ''} onChange={event => change(item.id, 'condition', event.target.value)}>
                                            <option value="">เลือกสภาพการใช้งาน</option>
                                            {Object.entries(EQUIPMENT_CONDITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </NativeSelectField></NativeSelectRoot>
                                    </Field>
                                    {answer?.condition && answer.condition !== 'normal' && <Box mt={3}><Field label="สาเหตุประกอบ" required>
                                        <Textarea aria-label={`สาเหตุ ${item.name} รายการ ${index + 1}`} required maxLength={2000} value={answer.reason} disabled={submit.isPending} onChange={event => change(item.id, 'reason', event.target.value)} placeholder="เช่น ขาเตียงหักจากการใช้งาน ไม่สามารถรองรับน้ำหนักได้" />
                                    </Field></Box>}
                                </Box>;
                            })}
                            {error && <Text color="danger.fg" role="alert">{error}</Text>}
                            <Text fontSize="xs" color="fg.muted">ข้อมูลจะเป็นประวัติของปีนี้ กรุณาตรวจสอบให้ครบก่อนส่ง</Text>
                        </VStack>}
                    </DialogBody>
                    <DialogFooter><Button type="button" variant="outline" disabled={submit.isPending} onClick={onClose}>ยกเลิก</Button><Button type="submit" colorPalette="brand" loading={submit.isPending}>ยืนยันส่งผลสำรวจ</Button></DialogFooter>
                </form>
            </DialogContent>
        </DialogRoot>
    );
}
