import React from 'react';
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
import { Button } from '../ui/button';
import { EquipmentList } from './EquipmentList';
import type { Room } from '../../types';

interface RoomEquipmentViewDialogProps {
    open: boolean;
    onClose: () => void;
    room: Room | null;
}

export const RoomEquipmentViewDialog: React.FC<RoomEquipmentViewDialogProps> = ({ open, onClose, room }) => {
    if (!room) return null;

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="md">
            <DialogContent maxH="90vh" overflowY="auto">
                <DialogHeader>
                    <DialogTitle>ครุภัณฑ์ประจำห้อง {room.room_number}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <EquipmentList equipment={room.equipment || []} />
                </DialogBody>

                <DialogFooter>
                    <DialogActionTrigger asChild>
                        <Button variant="outline" onClick={onClose}>
                            ปิด
                        </Button>
                    </DialogActionTrigger>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
