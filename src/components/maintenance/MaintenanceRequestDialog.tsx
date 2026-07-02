import React, { useState, useEffect } from 'react';
import {
    DialogRoot,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
    DialogBackdrop,
} from '../../components/ui/dialog';
import {
    Button,
    Input,
    VStack,
    Textarea,
    createListCollection,
    NativeSelectRoot,
    NativeSelectField,
    Box,
    Image,
    HStack,
    IconButton,
    Text,
} from '@chakra-ui/react';
import { LuImage, LuX } from 'react-icons/lu';
import { Field } from '../../components/ui/field';
import { toaster } from '../../components/ui/toaster';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../../services/maintenanceService';
import { roomService } from '../../services/roomService';
import { STORAGE_ENABLED } from '../../lib/firebase';
import { type MaintenanceRequest, MaintenancePriority } from '../../types';

interface MaintenanceRequestDialogProps {
    open: boolean;
    onClose: () => void;
    requestToEdit?: MaintenanceRequest | null; // If provided, we are in Edit mode
}

export const MaintenanceRequestDialog: React.FC<MaintenanceRequestDialogProps> = ({ open, onClose, requestToEdit }) => {
    const queryClient = useQueryClient();
    const [rooms, setRooms] = useState<any[]>([]); // Need to fetch rooms
    const [formData, setFormData] = useState({
        room_id: '',
        title: '',
        description: '',
        priority: MaintenancePriority.MEDIUM,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setSelectedFiles((prev) => [...prev, ...files]);

            // Create previews
            const newPreviews = files.map((file) => URL.createObjectURL(file));
            setImagePreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const handleRemoveImage = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setImagePreviews((prev) => {
            // Revoke URL to avoid memory leaks
            URL.revokeObjectURL(prev[index]);
            return prev.filter((_, i) => i !== index);
        });
    };

    // Fetch Occupied Rooms for selection
    useEffect(() => {
        if (open) {
            const fetchRooms = async () => {
                try {
                    // Only fetch occupied rooms? Maintenance can be for empty rooms too theoretically (by admin)
                    // But our service linking logic requires a tenant.
                    // For now, let's fetch ALL rooms and let the service throw if it can't find a tenant (or we let admin know).
                    // Actually, let's prompt the user "Only occupied rooms can have maintenance requests" if we enforce tenant link.
                    // I'll fetch 'occupied' rooms to be safe.
                    const allRooms = await roomService.getRooms();
                    const occupiedRooms = allRooms.filter(r => r.status === 'occupied');
                    setRooms(occupiedRooms);
                } catch (error) {
                    console.error("Failed to fetch rooms", error);
                }
            };
            fetchRooms();
        }
    }, [open]);

    useEffect(() => {
        if (requestToEdit) {
            setFormData({
                room_id: requestToEdit.room_id,
                title: requestToEdit.title,
                description: requestToEdit.description,
                priority: requestToEdit.priority,
            });
            setExistingImages(requestToEdit.images || []);
            setSelectedFiles([]);
            setImagePreviews([]);
        } else {
            // Reset
            setFormData({
                room_id: '',
                title: '',
                description: '',
                priority: MaintenancePriority.MEDIUM,
            });
            setExistingImages([]);
            setSelectedFiles([]);
            setImagePreviews([]);
        }
    }, [requestToEdit, open]);

    const mutation = useMutation({
        mutationFn: (data: any) => {
            if (requestToEdit) {
                return maintenanceService.updateMaintenanceRequest(requestToEdit.id, data);
            } else {
                return maintenanceService.createMaintenanceRequest(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            toaster.create({
                title: requestToEdit ? 'อัปเดตรายการแจ้งซ่อมแล้ว' : 'สร้างรายการแจ้งซ่อมสำเร็จ',
                type: 'success',
            });
            onClose();
        },
        onError: (error: any) => {
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message,
                type: 'error',
            });
        }
    });

    const handleRemoveExistingImage = (index: number) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const newImageUrls: string[] = [];
            // Upload new images
            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(file => maintenanceService.uploadMaintenanceImage(file));
                const urls = await Promise.all(uploadPromises);
                newImageUrls.push(...urls);
            }

            // Combine
            const finalImages = [...existingImages, ...newImageUrls];
            const payload = { ...formData, images: finalImages };

            await mutation.mutateAsync(payload);
            setIsSubmitting(false);

        } catch (error) {
            console.error("Submission failed", error);
            // Error handled by mutation onError or here?
            // mutation onError shows toaster.
            // Upload error shows toaster here.
            setIsSubmitting(false);
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{requestToEdit ? 'แก้ไขรายการแจ้งซ่อม' : 'แจ้งซ่อมใหม่'}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>
                <DialogBody>
                    <form id="maintenance-form" onSubmit={handleSubmit}>
                        <VStack align="stretch" gap={4}>
                            <Field label="ห้อง (เฉพาะห้องที่มีผู้เช่า)" required>
                                <NativeSelectRoot disabled={!!requestToEdit}>
                                    <NativeSelectField
                                        value={formData.room_id}
                                        onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                                        placeholder="เลือกห้อง"
                                    >
                                        {rooms.map((room) => (
                                            <option key={room.id} value={room.id}>
                                                ห้อง {room.room_number} {room.current_tenant ? `(${room.current_tenant.full_name})` : ''}
                                            </option>
                                        ))}
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Field>

                            <Field label="หัวข้อแจ้งซ่อม" required>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="เช่น แอร์ไม่เย็น, น้ำรั่ว"
                                />
                            </Field>

                            <Field label="รายละเอียด" required>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                    rows={3}
                                />
                            </Field>

                            <Field label="ความเร่งด่วน">
                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as MaintenancePriority })}
                                    >
                                        <option value="low">ต่ำ (Low)</option>
                                        <option value="medium">ปานกลาง (Medium)</option>
                                        <option value="high">สูง (High)</option>
                                        <option value="urgent">เร่งด่วน (Urgent)</option>
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Field>

                            <Field label="รูปภาพประกอบ">
                                <VStack align="start" gap={3} w="full">
                                    <HStack gap={2} flexWrap="wrap">
                                        {existingImages.map((src, index) => (
                                            <Box key={`existing-${index}`} position="relative" w="80px" h="80px">
                                                <Image src={src} w="full" h="full" objectFit="cover" borderRadius="md" />
                                                <IconButton
                                                    position="absolute" top="-2" right="-2"
                                                    size="2xs" colorPalette="red" rounded="full"
                                                    onClick={() => handleRemoveExistingImage(index)}
                                                >
                                                    <LuX />
                                                </IconButton>
                                            </Box>
                                        ))}
                                        {imagePreviews.map((src, index) => (
                                            <Box key={`new-${index}`} position="relative" w="80px" h="80px">
                                                <Image src={src} w="full" h="full" objectFit="cover" borderRadius="md" />
                                                <IconButton
                                                    position="absolute" top="-2" right="-2"
                                                    size="2xs" colorPalette="red" rounded="full"
                                                    onClick={() => handleRemoveImage(index)}
                                                >
                                                    <LuX />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </HStack>
                                    <Box>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: 'none' }}
                                            id="image-upload"
                                            disabled={!STORAGE_ENABLED}
                                        />
                                        <Button asChild variant="outline" size="sm" disabled={!STORAGE_ENABLED}>
                                            <label
                                                htmlFor="image-upload"
                                                style={{ cursor: STORAGE_ENABLED ? 'pointer' : 'not-allowed' }}
                                            >
                                                <LuImage /> เลือกรูปภาพ
                                            </label>
                                        </Button>
                                        {!STORAGE_ENABLED && (
                                            <Text color="gray.500" fontSize="xs" mt={1}>
                                                อัปโหลดรูปภาพยังไม่เปิดใช้งาน (รอเปิด Firebase Storage)
                                            </Text>
                                        )}
                                    </Box>
                                </VStack>
                            </Field>
                        </VStack>
                    </form>
                </DialogBody>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
                    <Button
                        type="submit"
                        form="maintenance-form"
                        colorPalette="blue"
                        loading={isSubmitting || mutation.isPending}
                    >
                        บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
