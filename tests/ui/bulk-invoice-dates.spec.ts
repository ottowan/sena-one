import { test, expect } from '@playwright/test';

test('bulk invoices default to the fifth of the next billing month, including year rollover', async ({ page }) => {
    await page.goto('/admin/invoices');
    await page.getByRole('button', { name: 'สร้างหลายรายการ', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'สร้างใบแจ้งหนี้แบบกลุ่ม (Bulk Generate)' });
    const chooseMonth = async (year: string, month: string) => {
        await dialog.getByRole('button', { name: /^เลือกเดือน/ }).click();
        await dialog.getByRole('combobox', { name: 'ปี พ.ศ.' }).selectOption(year);
        await dialog.getByRole('button', { name: month, exact: true }).click();
    };
    await chooseMonth('2024', 'กุมภาพันธ์');
    await expect(dialog.getByRole('button', { name: 'เลือกวันที่ 5 มีนาคม 2567', exact: true })).toBeVisible();
    // A manually selected day remains editable until the billing month changes.
    await dialog.getByRole('button', { name: 'เลือกวันที่ 5 มีนาคม 2567', exact: true }).click();
    await dialog.getByRole('button', { name: '10 มีนาคม 2567', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'เลือกวันที่ 10 มีนาคม 2567', exact: true })).toBeVisible();
    await chooseMonth('2026', 'ธันวาคม');
    await expect(dialog.getByRole('button', { name: 'เลือกวันที่ 5 มกราคม 2570', exact: true })).toBeVisible();
    await chooseMonth('2026', 'พฤศจิกายน');
    await expect(dialog.getByRole('button', { name: 'เลือกวันที่ 5 ธันวาคม 2569', exact: true })).toBeVisible();
});
