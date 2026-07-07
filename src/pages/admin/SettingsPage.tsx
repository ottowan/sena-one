import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, VStack, HStack, Input, Grid, Card } from '@chakra-ui/react';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { toaster } from '../../components/ui/toaster';
import type { RentRate, AppSettings } from '../../types';
import { PositionLevel } from '../../types';
import { useRentRates, useUpdateRentRate, useAppSettings, useUpdateAppSettings } from '../../hooks/useSettings';

const SettingsPage: React.FC = () => {
    // Queries
    const { data: rentRatesData, isLoading: ratesLoading } = useRentRates();
    const { data: appSettingsData, isLoading: settingsLoading } = useAppSettings();

    // Mutations
    const updateRentRateMutation = useUpdateRentRate();
    const updateAppSettingsMutation = useUpdateAppSettings();

    // Local state for editing
    const [rates, setRates] = useState<RentRate[]>([]);
    const [appSettings, setAppSettings] = useState<Partial<AppSettings>>({});
    const [saving, setSaving] = useState(false);
    const [fixingDueDate, setFixingDueDate] = useState(false);

    const positions = Object.values(PositionLevel);

    // Load data into local state when fetched
    useEffect(() => {
        if (rentRatesData) {
            setRates(rentRatesData);
        }
    }, [rentRatesData]);

    useEffect(() => {
        if (appSettingsData) {
            setAppSettings(appSettingsData);
        }
    }, [appSettingsData]);

    const handleRateChange = (position: string, field: 'rent_amount' | 'common_fee', value: string) => {
        const numValue = parseFloat(value) || 0;
        const existing = rates.find(r => r.position_level === position);

        if (existing) {
            setRates(rates.map(r => r.position_level === position ? { ...r, [field]: numValue } : r));
        } else {
            // Need default for other field if creating new
            setRates([...rates, {
                position_level: position,
                rent_amount: field === 'rent_amount' ? numValue : 0,
                common_fee: field === 'common_fee' ? numValue : 0,
                updated_at: new Date().toISOString()
            }]);
        }
    };

    const handleAppSettingsChange = (field: keyof AppSettings, value: string) => {
        setAppSettings(prev => ({
            ...prev,
            [field]: parseFloat(value) || 0
        }));
    };

    const getRate = (position: string) => {
        return rates.find(r => r.position_level === position) || { rent_amount: 0, common_fee: 0 }; // Return object with defaults
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save Rent Rates
            const ratePromises = positions.map(position => {
                const rate = getRate(position);
                // Safe cast if returned object is not full RentRate, but here we just need values
                return updateRentRateMutation.mutateAsync({
                    position,
                    amount: (rate as any).rent_amount || 0,
                    commonFee: (rate as any).common_fee || 0
                });
            });

            // Save App Settings
            const settingsPromise = updateAppSettingsMutation.mutateAsync(appSettings);

            await Promise.all([...ratePromises, settingsPromise]);

            toaster.create({
                title: 'บันทึกการตั้งค่าเรียบร้อย',
                type: 'success',
            });
        } catch (error) {
            console.error('Error saving settings:', error);
            toaster.create({
                title: 'บันทึกการตั้งค่าไม่สำเร็จ',
                description: error instanceof Error ? error.message : undefined,
                type: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleFixMayDueDate = async () => {
        setFixingDueDate(true);
        try {
            const snap = await getDocs(query(collection(db, 'invoices'), where('billing_month', '==', '2026-05-01')));

            if (snap.empty) {
                toaster.create({ title: 'ไม่พบบิลเดือน พ.ค. 2569', type: 'info' });
                return;
            }

            if (!confirm(`พบ ${snap.size} บิลของเดือน พ.ค. 2569 ต้องการแก้วันครบกำหนดเป็น 2026-06-05 ทั้งหมดใช่หรือไม่?`)) {
                return;
            }

            const batch = writeBatch(db);
            snap.docs.forEach((d) => batch.update(d.ref, { due_date: '2026-06-05' }));
            await batch.commit();

            toaster.create({ title: `แก้ไขวันครบกำหนด ${snap.size} บิลเรียบร้อย`, type: 'success' });
        } catch (error) {
            console.error('Error fixing due dates:', error);
            toaster.create({ title: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', type: 'error' });
        } finally {
            setFixingDueDate(false);
        }
    };

    if (ratesLoading || settingsLoading) return <Box p={6}>กำลังโหลด...</Box>;

    return (
        <Box p={6}>
            <VStack align="stretch" gap={6}>
                <Heading size="lg">ตั้งค่าระบบ</Heading>

                {/* Rent Rates */}
                <Card.Root>
                    <Card.Header>
                        <Heading size="md">อัตราค่าเช่าและค่าส่วนกลางตามตำแหน่ง</Heading>
                        <Text color="fg.muted" fontSize="sm">
                            กำหนดค่าเช่าและค่าส่วนกลางสำหรับแต่ละระดับตำแหน่ง
                        </Text>
                    </Card.Header>
                    <Card.Body>
                        <VStack align="stretch" gap={4}>
                            {positions.map((position) => {
                                const rate = getRate(position) as any; // Cast for easier access
                                return (
                                    <Box key={position} p={4} borderWidth="1px" borderRadius="md">
                                        <Text mb={2} fontWeight="bold" fontSize="md">{position}</Text>
                                        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                            <Box>
                                                <Text mb={1} fontSize="sm">ค่าเช่า (บาท/เดือน)</Text>
                                                <Input
                                                    type="number"
                                                    value={rate.rent_amount}
                                                    onChange={(e) => handleRateChange(position, 'rent_amount', e.target.value)}
                                                    placeholder="ระบุค่าเช่า"
                                                />
                                            </Box>
                                            <Box>
                                                <Text mb={1} fontSize="sm">ค่าส่วนกลาง (บาท/เดือน)</Text>
                                                <Input
                                                    type="number"
                                                    value={rate.common_fee}
                                                    onChange={(e) => handleRateChange(position, 'common_fee', e.target.value)}
                                                    placeholder="ระบุค่าส่วนกลาง"
                                                />
                                            </Box>
                                        </Grid>
                                    </Box>
                                );
                            })}
                        </VStack>
                    </Card.Body>
                </Card.Root>

                {/* System Settings (Utilities & Fees) */}
                <Card.Root>
                    <Card.Header>
                        <Heading size="md">ค่าสาธารณูปโภคและค่าธรรมเนียมอื่นๆ</Heading>
                        <Text color="fg.muted" fontSize="sm">
                            กำหนดอัตราค่าน้ำ ค่าไฟ และค่าบำรุงมิเตอร์
                        </Text>
                    </Card.Header>
                    <Card.Body>
                        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
                            {/* Water Rate */}
                            <Box>
                                <Text mb={2} fontWeight="medium">น้ำประปา (บาท/หน่วย)</Text>
                                <Input
                                    type="number"
                                    value={appSettings?.water_rate || ''}
                                    onChange={(e) => handleAppSettingsChange('water_rate', e.target.value)}
                                    placeholder="เช่น 18"
                                />
                            </Box>

                            {/* Water Maintenance Fee */}
                            <Box>
                                <Text mb={2} fontWeight="medium">ค่าบำรุงมิเตอร์น้ำ (บาท/เดือน)</Text>
                                <Input
                                    type="number"
                                    value={appSettings?.water_maintenance_fee || ''}
                                    onChange={(e) => handleAppSettingsChange('water_maintenance_fee', e.target.value)}
                                    placeholder="เช่น 0 หรือ 50"
                                />
                            </Box>

                            {/* Electricity Rate */}
                            <Box>
                                <Text mb={2} fontWeight="medium">ไฟฟ้า (บาท/หน่วย)</Text>
                                <Input
                                    type="number"
                                    value={appSettings?.electricity_rate || ''}
                                    onChange={(e) => handleAppSettingsChange('electricity_rate', e.target.value)}
                                    placeholder="เช่น 8"
                                />
                            </Box>

                            {/* Common Fee Removed */}
                        </Grid>
                    </Card.Body>
                </Card.Root>

                {/* One-off data fix tools */}
                <Card.Root borderColor="orange.muted">
                    <Card.Header>
                        <Heading size="md">เครื่องมือแก้ไขข้อมูล</Heading>
                        <Text color="fg.muted" fontSize="sm">
                            ใช้แก้ไขข้อมูลที่ผิดพลาดเป็นครั้งคราว
                        </Text>
                    </Card.Header>
                    <Card.Body>
                        <HStack justify="space-between" align="center">
                            <Box>
                                <Text fontWeight="medium">แก้วันครบกำหนดบิลเดือน พ.ค. 2569</Text>
                                <Text color="fg.muted" fontSize="sm">
                                    เปลี่ยนวันครบกำหนด (due_date) ของบิลเดือน 2026-05 ทุกห้อง เป็น 2026-06-05
                                </Text>
                            </Box>
                            <Button
                                colorPalette="orange"
                                variant="outline"
                                disabled={fixingDueDate}
                                onClick={handleFixMayDueDate}
                            >
                                {fixingDueDate ? 'กำลังแก้ไข...' : 'แก้ไขเลย'}
                            </Button>
                        </HStack>
                    </Card.Body>
                </Card.Root>

                <HStack justify="flex-end" w="full">
                    <Button
                        colorPalette="blue"
                        size="lg"
                        disabled={saving}
                        onClick={handleSave}
                        minW="200px"
                    >
                        {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด'}
                    </Button>
                </HStack>
            </VStack>
        </Box>
    );
};

export default SettingsPage;
