import { test, expect } from '@playwright/test';

test('meter entry separates water and electricity, keeps edits and moves to the next room', async ({ page }) => {
    await page.goto('/admin/meters');
    const water = page.getByRole('spinbutton', { name: 'มิเตอร์น้ำปัจจุบัน ห้อง 301', exact: true }).filter({ visible: true });
    await expect(water).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'มิเตอร์ไฟปัจจุบัน ห้อง 301', exact: true })).toHaveCount(0);
    await water.fill('1020');
    await water.press('Enter');
    await expect(page.getByRole('spinbutton', { name: 'มิเตอร์น้ำปัจจุบัน ห้อง 302', exact: true }).filter({ visible: true })).toBeFocused();
    await page.getByRole('button', { name: 'กรอกมิเตอร์ไฟฟ้า', exact: true }).click();
    const electricity = page.getByRole('spinbutton', { name: 'มิเตอร์ไฟปัจจุบัน ห้อง 301', exact: true }).filter({ visible: true });
    await expect(electricity).toBeVisible();
    await electricity.fill('5090');
    await page.getByRole('button', { name: 'กรอกมิเตอร์น้ำ', exact: true }).click();
    await expect(water).toHaveValue('1020');
    const save = page.getByRole('button', { name: /^บันทึก(การเปลี่ยนแปลง)?$/ });
    await save.click();
    await expect(page.getByText('ข้อมูลการจดมิเตอร์', { exact: true })).toBeVisible();
    await expect(water).toHaveValue('1020');
    await page.getByRole('button', { name: 'กรอกมิเตอร์ไฟฟ้า', exact: true }).click();
    await expect(electricity).toHaveValue('5090');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
