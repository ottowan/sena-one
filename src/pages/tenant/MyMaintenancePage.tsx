import React, { useEffect, useState } from 'react';
import { Box, Card, Heading, VStack, Badge, Text, HStack, Button, Dialog, Input, Textarea } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { maintenanceService } from '../../services/maintenanceService';
import { supabase } from '../../lib/supabase';
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

    const [tenantId, setTenantId] = useState<string | null>(null);

    const fetchRequests = async (id?: string) => {
        const currentTenantId = id || tenantId;
        if (!currentTenantId) return;

        setIsLoading(true);
        const { data: requestData } = await supabase
            .from('maintenance_requests')
            .select('*')
            .eq('tenant_id', currentTenantId)
            .order('created_at', { ascending: false });
        setRequests(requestData || []);
        setIsLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            if (!profile?.id) return;

            const { data: tenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('user_id', profile.id)
                .maybeSingle();

            if (!tenant) {
                setIsLoading(false);
                return;
            }

            setTenantId(tenant.id);
            await fetchRequests(tenant.id); // Initial fetch

            // Fetch Room ID for creating new requests
            const { data: contractData } = await supabase
                .from('contracts')
                .select('room_id')
                .eq('tenant_id', tenant.id)
                .eq('status', 'active')
                .maybeSingle();
            if (contractData) setRoomId(contractData.room_id);
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
