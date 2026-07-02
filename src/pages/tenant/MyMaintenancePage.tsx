import React, { useEffect, useState } from 'react';
import { Box, Card, Heading, VStack, Badge, Text, HStack, Button, Dialog, Input, Textarea } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { maintenanceService } from '../../services/maintenanceService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toaster } from '../../components/ui/toaster';
import { LuPlus } from 'react-icons/lu';
import {
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog"
import { Field } from '../../components/ui/field';

export const MyMaintenancePage: React.FC = () => {
    const { profile } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [roomId, setRoomId] = useState('');

    const fetchRequests = async () => {
        if (!profile?.id) return;

        setIsLoading(true);
        // Query by tenant_uid (== this user's uid) so the list read is
        // provably scoped under the tenant-role Security Rules.
        const snap = await getDocs(
            query(collection(db, 'maintenance_requests'), where('tenant_uid', '==', profile.id))
        );
        const rows = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as any)
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        setRequests(rows);
        setIsLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            if (!profile?.id) return;

            const tenantSnap = await getDocs(query(collection(db, 'tenants'), where('user_id', '==', profile.id)));
            const tenantDoc = tenantSnap.docs[0];

            if (!tenantDoc) {
                setIsLoading(false);
                return;
            }

            await fetchRequests();

            // The room's own current_tenant_uid field is directly readable
            // by its occupant under the Security Rules, so use it instead
            // of a `contracts` query (which isn't tenant_uid-scoped).
            const roomSnap = await getDocs(
                query(collection(db, 'rooms'), where('current_tenant_uid', '==', profile.id))
            );
            if (!roomSnap.empty) setRoomId(roomSnap.docs[0].id);
        };

        init();
    }, [profile]);

    const handleSubmit = async () => {
        if (!title || !description || !roomId) {
            toaster.create({ title: 'กรุณากรอกข้อมูลให้ครบถ้วน', type: 'error' });
            return;
        }

        try {
            await maintenanceService.createMaintenanceRequest({
                room_id: roomId,
                // tenant_id handled by backend or service if needed, or check service definition
                title,
                description,
                priority: 'medium' as any, // Default
            });
            toaster.create({ title: 'ส่งใบแจ้งซ่อมเรียบร้อย', type: 'success' });
            setIsDialogOpen(false);
            setTitle('');
            setDescription('');
            fetchRequests();
        } catch (error) {
            console.error(error);
            toaster.create({ title: 'เกิดข้อผิดพลาด', type: 'error' });
        }
    };

    return (
        <VStack align="stretch" gap={6} py={4}>
            <HStack justify="space-between">
                <Heading size="lg">รายการแจ้งซ่อม</Heading>

                <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
                    <DialogTrigger asChild>
                        <Button colorPalette="blue">
                            <LuPlus /> แจ้งซ่อมใหม่
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>แจ้งซ่อม / ปัญหา</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            <VStack gap={4}>
                                <Field label="หัวข้อปัญหา">
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น แอร์ไม่เย็น, น้ำรั่ว" />
                                </Field>
                                <Field label="รายละเอียด">
                                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ระบุรายละเอียดเพิ่มเติม..." />
                                </Field>
                            </VStack>
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                            <Button onClick={handleSubmit}>ส่งข้อมูล</Button>
                        </DialogFooter>
                        <DialogCloseTrigger />
                    </DialogContent>
                </DialogRoot>
            </HStack>

            <VStack align="stretch" gap={4}>
                {isLoading ? (
                    <Text>กำลังโหลด...</Text>
                ) : requests.length === 0 ? (
                    <Text color="gray.500" textAlign="center" py={8}>ไม่พบรายการแจ้งซ่อม</Text>
                ) : requests.map((req) => (
                    <Card.Root key={req.id}>
                        <Card.Body>
                            <HStack justify="space-between" align="start">
                                <VStack align="start" gap={1}>
                                    <Heading size="sm">{req.title}</Heading>
                                    <Text color="gray.600" fontSize="sm">{req.description}</Text>
                                    <Text color="gray.400" fontSize="xs">{new Date(req.created_at).toLocaleDateString('th-TH')}</Text>
                                </VStack>
                                <Badge colorPalette={
                                    req.status === 'completed' ? 'green' :
                                        req.status === 'in_progress' ? 'blue' : 'yellow'
                                }>
                                    {req.status === 'pending' ? 'รอดำเนินการ' :
                                        req.status === 'in_progress' ? 'กำลังซ่อม' : 'เสร็จสิ้น'}
                                </Badge>
                            </HStack>
                        </Card.Body>
                    </Card.Root>
                ))}
            </VStack>
        </VStack>
    );
};
