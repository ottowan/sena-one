import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Input, Table, Text, VStack } from '@chakra-ui/react';
import { DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { toaster } from '../ui/toaster';
import { parseAssetRows, planAssetImport, type AssetCandidate } from '../../lib/assetImport';
import { equipmentSurveyService } from '../../services/equipmentSurveyService';
import type { Room } from '../../types';

export function EquipmentAssetImportDialog({ open, onClose, rooms }: { open: boolean; onClose: () => void; rooms: Room[] }) {
    const [candidates, setCandidates] = useState<AssetCandidate[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [reading, setReading] = useState(false);
    const client = useQueryClient();
    const plan = useMemo(() => planAssetImport(rooms, candidates), [rooms, candidates]);
    const mutation = useMutation({
        mutationFn: () => equipmentSurveyService.importAssetNumbers(candidates),
        onSuccess: result => {
            void client.invalidateQueries({ queryKey: ['rooms'] });
            toaster.create({ title: `เติมเลขครุภัณฑ์ ${result.filled} รายการ ใน ${result.rooms} ห้องแล้ว`, type: 'success' });
            // Parser warnings (such as a code in the wrong column) must remain
            // visible after importing other valid numbers.
            if (warnings.length || result.warnings.length) { setWarnings([...new Set([...warnings, ...result.warnings])]); setCandidates([]); }
            else onClose();
        },
        onError: (error: Error) => setError(error.message),
    });
    return (
        <DialogRoot open={open} onOpenChange={event => { if (!event.open && !mutation.isPending && !reading) onClose(); }} size="lg">
            <DialogContent maxH="90dvh" overflowY="auto">
                <DialogHeader><DialogTitle>นำเข้าเลขครุภัณฑ์จาก Excel</DialogTitle><DialogCloseTrigger disabled={mutation.isPending || reading} /></DialogHeader>
                <DialogBody><VStack align="stretch" gap={4}>
                    <Text fontSize="sm" color="fg.muted">รองรับรูปแบบไฟล์ asset-sena1b1.xlsx เติมเฉพาะเลขที่ยังขาด ไม่เขียนทับเลขเดิม และไม่นำผลตรวจเก่าเข้าประวัติรายปี</Text>
                    <Input type="file" accept=".xlsx,.xls" aria-label="ไฟล์เลขครุภัณฑ์" disabled={reading || mutation.isPending} h="auto" py={2} onChange={async event => {
                        const file = event.target.files?.[0]; setCandidates([]); setWarnings([]); setError('');
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) { setError('ไฟล์ต้องไม่เกิน 10 MB'); return; }
                        setReading(true);
                        try {
                            const XLSX = await import('xlsx');
                            const workbook = XLSX.read(await file.arrayBuffer());
                            const parsed = parseAssetRows(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false }));
                            setCandidates(parsed.candidates); setWarnings(parsed.warnings);
                        } catch (error) { setError((error as Error).message); }
                        finally { setReading(false); }
                    }} />
                    {reading && <Text color="fg.muted">กำลังอ่านไฟล์...</Text>}
                    {candidates.length > 0 && <>
                        <Text fontWeight="semibold">พร้อมเติม {plan.filled} รายการ ใน {plan.changes.length} ห้อง</Text>
                        <Box overflowX="auto"><Table.Root size="sm"><Table.Header><Table.Row><Table.ColumnHeader>ห้อง</Table.ColumnHeader><Table.ColumnHeader>เลขที่จะเติม</Table.ColumnHeader></Table.Row></Table.Header><Table.Body>{plan.changes.map(room => <Table.Row key={room.room_id}><Table.Cell>{room.room_number}</Table.Cell><Table.Cell>{room.filled} รายการ</Table.Cell></Table.Row>)}</Table.Body></Table.Root></Box>
                    </>}
                    {[...warnings, ...plan.warnings].length > 0 && <Box p={3} borderRadius="lg" bg="warning.subtle"><Text fontWeight="semibold" fontSize="sm">รายการที่ข้าม / ต้องตรวจสอบ</Text>{[...warnings, ...plan.warnings].map((warning, index) => <Text key={index} fontSize="xs" mt={1}>{warning}</Text>)}</Box>}
                    {error && <Text color="danger.fg" role="alert">{error}</Text>}
                </VStack></DialogBody>
                <DialogFooter><Button variant="outline" disabled={reading || mutation.isPending} onClick={onClose}>ปิด</Button><Button colorPalette="brand" loading={mutation.isPending} disabled={reading || !plan.filled} onClick={() => mutation.mutate()}>ยืนยันเติมเลขที่ขาด</Button></DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
}
