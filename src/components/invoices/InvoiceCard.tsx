import React from 'react';
import { Card, VStack, HStack, Text, Badge, Icon, IconButton, Box } from '@chakra-ui/react';
import { LuFileText, LuEye, LuTrash2, LuCalendar, LuUser, LuBuilding, LuDownload } from 'react-icons/lu';
import { Tooltip } from '../ui/tooltip';
import type { Invoice } from '../../types';

interface InvoiceCardProps {
    invoice: Invoice;
    onView: (invoice: Invoice) => void;
    onDelete?: (invoice: Invoice) => void;
    onExportRoom?: (roomNumber: string) => void;
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'paid':
            return 'green';
        case 'pending':
            return 'yellow';
        case 'overdue':
            return 'red';
        case 'cancelled':
            return 'gray';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'paid':
            return 'ชำระแล้ว';
        case 'pending':
            return 'รอชำระ';
        case 'overdue':
            return 'เกินกำหนด';
        case 'cancelled':
            return 'ยกเลิก';
        default:
            return status;
    }
};

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
    invoice,
    onView,
    onDelete,
    onExportRoom,
}) => {
    return (
        <Card.Root>
            <Card.Body>
                <VStack align="stretch" gap={4}>
                    <HStack justify="space-between" align="start">
                        <HStack align="start" gap={3}>
                            <Box
                                p={2}
                                bg="blue.subtle"
                                color="blue.fg"
                                borderRadius="lg"
                            >
                                <Icon fontSize="xl">
                                    <LuFileText />
                                </Icon>
                            </Box>
                            <VStack align="start" gap={1}>
                                <Text fontWeight="bold" fontSize="lg" lineClamp={1}>
                                    {new Date(invoice.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                </Text>
                                <Text fontSize="sm" color="fg.muted">
                                    ครบกำหนด: {new Date(invoice.due_date).toLocaleDateString('th-TH')}
                                </Text>
                            </VStack>
                        </HStack>
                        <Badge colorPalette={getStatusColor(invoice.status)}>
                            {getStatusLabel(invoice.status)}
                        </Badge>
                    </HStack>

                    <VStack align="stretch" gap={2}>
                        <HStack color="fg.muted" fontSize="sm">
                            <Icon color="fg.subtle">
                                <LuUser />
                            </Icon>
                            <Text lineClamp={1}>{invoice.tenant?.full_name || 'ไม่ระบุผู้เช่า'}</Text>
                        </HStack>
                        <HStack color="fg.muted" fontSize="sm">
                            <Icon color="fg.subtle">
                                <LuBuilding />
                            </Icon>
                            <Text>ห้อง {invoice.room?.room_number || '-'}</Text>
                        </HStack>
                    </VStack>

                    <Box pt={2} borderTopWidth="1px" borderColor="border.muted">
                        <HStack justify="space-between" align="center">
                            <VStack align="start" gap={0}>
                                <Text fontSize="xs" color="fg.muted">ยอดชำระ</Text>
                                <Text fontWeight="bold" fontSize="lg" color="blue.fg">
                                    ฿{invoice.total_amount.toLocaleString()}
                                </Text>
                            </VStack>
                            <HStack>
                                <Tooltip content="ดูรายละเอียด">
                                    <IconButton
                                        aria-label="View"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onView(invoice)}
                                    >
                                        <Icon>
                                            <LuEye />
                                        </Icon>
                                    </IconButton>
                                </Tooltip>
                                {onExportRoom && invoice.room?.room_number && (
                                    <Tooltip content={`Export ประวัติห้อง ${invoice.room.room_number}`}>
                                        <IconButton
                                            aria-label="Export Room"
                                            size="sm"
                                            variant="ghost"
                                            colorPalette="green"
                                            onClick={() => onExportRoom(invoice.room!.room_number)}
                                        >
                                            <Icon>
                                                <LuDownload />
                                            </Icon>
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {onDelete && invoice.status !== 'paid' && (
                                    <Tooltip content="ลบ">
                                        <IconButton
                                            aria-label="Delete"
                                            size="sm"
                                            variant="ghost"
                                            colorPalette="red"
                                            onClick={() => onDelete(invoice)}
                                        >
                                            <Icon>
                                                <LuTrash2 />
                                            </Icon>
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </HStack>
                        </HStack>
                    </Box>
                </VStack>
            </Card.Body>
        </Card.Root>
    );
};

