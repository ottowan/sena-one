import React, { useState, useEffect } from 'react';
import {
    Box,
    Input,
    Textarea,
    Grid,
    VStack,
} from '@chakra-ui/react';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
    DialogActionTrigger,
} from '../ui/dialog';
import { Field } from '../ui/field';
import {
    NativeSelectField,
    NativeSelectRoot,
} from '../ui/native-select';
import { Button } from '../ui/button';
import { ImageUpload } from '../ui/ImageUpload';
import type { Room, RoomStatus } from '../../types';
import { useCreateRoom, useUpdateRoom } from '../../hooks/useRooms';
import { roomService } from '../../services/roomService';
import { useAppSettings } from '../../hooks/useSettings';

interface RoomFormDialogProps {
    open: boolean;
    onClose: () => void;
    room?: Room | null;
}

export const RoomFormDialog: React.FC<RoomFormDialogProps> = ({
    open,
    onClose,
    room,
}) => {
    const isEdit = !!room;
    const createRoom = useCreateRoom();
    const updateRoom = useUpdateRoom();

    const [formData, setFormData] = useState({
        room_number: '',
        room_type: '',
        size_sqm: '',
        monthly_rent: '',
        water_rate: '',
        electricity_rate: '',
        current_water_meter: '',
        current_electricity_meter: '',
        floor: '',
        status: 'available' as RoomStatus,
        description: '',
    });

    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const { data: appSettings } = useAppSettings();

    useEffect(() => {
        if (room) {
            setFormData({
                room_number: room.room_number,
                room_type: room.room_type,
                size_sqm: room.size_sqm.toString(),
                monthly_rent: room.monthly_rent.toString(),
                water_rate: room.water_rate?.toString() || appSettings?.water_rate.toString() || '0',
                electricity_rate: room.electricity_rate?.toString() || appSettings?.electricity_rate.toString() || '0',
                current_water_meter: room.current_water_meter?.toString() || '0',
                current_electricity_meter: room.current_electricity_meter?.toString() || '0',
                floor: room.floor.toString(),
                status: room.status,
                description: room.description || '',
            });
            setImages(room.images || []);
        } else {
            setFormData({
                room_number: '',
                room_type: '',
                size_sqm: '',
                monthly_rent: '0', // Default to 0 as it depends on tenant position
                water_rate: appSettings?.water_rate.toString() || '0',
                electricity_rate: appSettings?.electricity_rate.toString() || '0',
                current_water_meter: '0',
                current_electricity_meter: '0',
                floor: '',
                status: 'available' as RoomStatus,
                description: '',
            });
            setImages([]);
        }
    }, [room, open, appSettings]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            // Upload images to Supabase Storage
            const uploadedImageUrls: string[] = [];

            for (const image of images) {
                // Skip if image is already a URL (existing image)
                if (image.startsWith('http')) {
                    uploadedImageUrls.push(image);
                    continue;
                }

                // Convert base64 to file
                const response = await fetch(image);
                const blob = await response.blob();
                const file = new File([blob], `room-${Date.now()}.jpg`, { type: 'image/jpeg' });

                // Upload to Supabase
                const tempRoomId = room?.id || `temp-${Date.now()}`;
                const imageUrl = await roomService.uploadRoomImage(tempRoomId, file);
                uploadedImageUrls.push(imageUrl);
            }

            const roomData = {
                room_number: formData.room_number,
                room_type: formData.room_type,
                size_sqm: parseFloat(formData.size_sqm),
                monthly_rent: parseFloat(formData.monthly_rent),
                water_rate: parseFloat(formData.water_rate),
                electricity_rate: parseFloat(formData.electricity_rate),
                current_water_meter: parseFloat(formData.current_water_meter) || 0,
                current_electricity_meter: parseFloat(formData.current_electricity_meter) || 0,
                floor: parseInt(formData.floor),
                status: formData.status,
                description: formData.description || undefined,
                amenities: [],
                images: uploadedImageUrls,
            };

            if (isEdit && room) {
                await updateRoom.mutateAsync({ id: room.id, data: roomData });
            } else {
                await createRoom.mutateAsync(roomData);
            }

            onClose();
        } catch (error) {
            console.error('Error saving room:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'แก้ไขห้องพัก' : 'เพิ่มห้องพัก'}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <DialogBody>
                        <VStack gap={4} align="stretch">
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <Field label="เลขห้อง" required>
                                    <Input
                                        value={formData.room_number}
                                        onChange={(e) =>
                                            setFormData({ ...formData, room_number: e.target.value })
                                        }
                                        placeholder="เช่น 101, 201"
                                        required
                                    />
                                </Field>

                                <Field label="ประเภทห้อง" required>
                                    <Input
                                        value={formData.room_type}
                                        onChange={(e) =>
                                            setFormData({ ...formData, room_type: e.target.value })
                                        }
                                        placeholder="เช่น ห้องพัดลม, ห้องแอร์"
                                        required
                                    />
                                </Field>
                            </Grid>

                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <Field label="ขนาด (ตร.ม.)" required>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.size_sqm}
                                        onChange={(e) =>
                                            setFormData({ ...formData, size_sqm: e.target.value })
                                        }
                                        placeholder="เช่น 25"
                                        required
                                    />
                                </Field>
                            </Grid>

                            {/* Allow editing rates only if specifically needed (e.g. editing existing room) 
                                but user requested to not fill them. We can hide them for New Room based on request.
                                But keeping them visible but updated for Edit might be safer. 
                                For NEW room, simpler form:
                            */}
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <Field label="มิเตอร์น้ำปัจจุบัน (เริ่มต้น)">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.current_water_meter}
                                        onChange={(e) =>
                                            setFormData({ ...formData, current_water_meter: e.target.value })
                                        }
                                        placeholder="เช่น 1500.50"
                                    />
                                </Field>
                                <Field label="มิเตอร์ไฟปัจจุบัน (เริ่มต้น)">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.current_electricity_meter}
                                        onChange={(e) =>
                                            setFormData({ ...formData, current_electricity_meter: e.target.value })
                                        }
                                        placeholder="เช่น 2300.00"
                                    />
                                </Field>
                            </Grid>

                            {/* Removed monthly_rent editing as requested. Rent is determined by tenant position. */}
                            {isEdit && (
                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <Field label="ค่าน้ำ/ไฟ (บาท)">
                                        <Box fontSize="sm" color="gray.600">
                                            ใช้อัตราจากส่วนกลาง: น้ำ {formData.water_rate}, ไฟ {formData.electricity_rate}
                                        </Box>
                                    </Field>
                                </Grid>
                            )}

                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <Field label="ชั้น" required>
                                    <Input
                                        type="number"
                                        value={formData.floor}
                                        onChange={(e) =>
                                            setFormData({ ...formData, floor: e.target.value })
                                        }
                                        placeholder="เช่น 1, 2, 3"
                                        required
                                    />
                                </Field>

                                <Field label="สถานะ" required>
                                    <NativeSelectRoot>
                                        <NativeSelectField
                                            value={formData.status}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    status: e.target.value as RoomStatus,
                                                })
                                            }
                                        >
                                            <option value="available">ว่าง</option>
                                            <option value="occupied">มีผู้เข้าพัก</option>
                                            <option value="reserved">จอง</option>
                                            <option value="maintenance">ซ่อมบำรุง</option>
                                        </NativeSelectField>
                                    </NativeSelectRoot>
                                </Field>
                            </Grid>

                            <Field label="รายละเอียด">
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับห้อง..."
                                    rows={3}
                                />
                            </Field>

                            <Field label="รูปภาพห้อง">
                                <ImageUpload
                                    images={images}
                                    onImagesChange={setImages}
                                    maxImages={5}
                                />
                            </Field>
                        </VStack>
                    </DialogBody>

                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline" onClick={onClose}>
                                ยกเลิก
                            </Button>
                        </DialogActionTrigger>
                        <Button
                            type="submit"
                            colorPalette="brand"
                            disabled={createRoom.isPending || updateRoom.isPending || uploading}
                        >
                            {uploading ? 'กำลังอัปโหลด...' : isEdit ? 'บันทึก' : 'เพิ่มห้อง'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </DialogRoot>
    );
};
