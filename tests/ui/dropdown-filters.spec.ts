import { test, expect, type Page } from '@playwright/test';

const expectCount = (page: Page, count: number, unit = 'รายการ') => expect(page.getByText(new RegExp(`^(?:ทั้งหมด|ผลการค้นหา)\\s*${count}\\s*${unit}$`))).toBeVisible();

test('meter room dropdown selects a room and clears back to all rooms', async ({ page }) => {
    await page.goto('/admin/meters');
    const picker = page.getByRole('combobox', { name: 'กรองมิเตอร์ตามห้อง' });
    await picker.selectOption('r4');
    await expect(page.getByText('แสดง 1 ห้อง', { exact: true })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'มิเตอร์น้ำปัจจุบัน ห้อง 305', exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByPlaceholder('ค้นหาเลขห้องหรือชื่อผู้เช่า...').fill('301');
    await expect(page.getByText('แสดง 0 ห้อง', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).click();
    await expect(picker).toHaveValue('');
    await expect(page.getByText('แสดง 16 ห้อง', { exact: true })).toBeVisible();
});

test('financial status dropdown includes overdue and restores all statuses', async ({ page }) => {
    await page.goto('/admin/reports');
    await page.getByRole('tab', { name: /การเงิน/ }).click();
    const picker = page.getByRole('combobox', { name: 'สถานะรายงานการเงิน' });
    await picker.selectOption('paid');
    const rows = page.getByRole('tabpanel', { name: /การเงิน/ }).locator('tbody tr');
    await expect(rows).toHaveCount(4);
    await picker.selectOption('overdue');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(/เกินกำหนด|ค้างชำระ/);
    await picker.selectOption('cancelled');
    await expect(rows.first()).toContainText('ไม่พบข้อมูล');
    await picker.selectOption('');
    await expect(rows).toHaveCount(10);
});

test('room meter history year dropdown works inside the dialog', async ({ page }) => {
    await page.goto('/admin/rooms');
    await page.getByRole('button', { name: /ประวัติ/ }).first().click();
    const dialog = page.getByRole('dialog');
    const year = String(new Date().getFullYear() - 1);
    await dialog.getByRole('combobox', { name: 'ปีประวัติมิเตอร์ห้องพัก' }).selectOption(year);
    await expect(dialog.locator('tbody tr')).toHaveCount(12);
    await expect(dialog.getByRole('combobox')).toHaveValue(year);
    await expect(dialog.getByRole('spinbutton', { name: `มิเตอร์น้ำ มกราคม ${Number(year) + 543}` })).toHaveValue('');
});

test('room status and floor dropdowns combine with search and reset', async ({ page }) => {
    await page.goto('/admin/rooms');
    const status = page.getByRole('combobox', { name: 'กรองสถานะห้องพัก' });
    const floor = page.getByRole('combobox', { name: 'กรองชั้นห้องพัก' });
    await expectCount(page, 16, 'ห้อง');
    for (const [value, count] of [['occupied', 10], ['available', 3], ['reserved', 1], ['maintenance', 2]] as const) {
        await status.selectOption(value);
        await expectCount(page, count, 'ห้อง');
    }
    await status.selectOption('available');
    await floor.selectOption('4');
    await expectCount(page, 0, 'ห้อง');
    await floor.selectOption('3');
    await expectCount(page, 3, 'ห้อง');
    await page.getByPlaceholder('ค้นหาเลขห้อง...').fill('311');
    await expectCount(page, 1, 'ห้อง');
    await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).first().click();
    await expectCount(page, 16, 'ห้อง');
    await expect(floor).toHaveValue('');
    await expect(status).toHaveValue('');
});

test('tenant status dropdown combines with name and vehicle filters', async ({ page }) => {
    await page.goto('/admin/tenants');
    const status = page.getByRole('combobox', { name: 'กรองสถานะผู้เช่า' });
    await expectCount(page, 10, 'คน');
    for (const value of ['inactive', 'pending']) {
        await status.selectOption(value);
        await expectCount(page, 0, 'คน');
    }
    await status.selectOption('active');
    await page.getByPlaceholder('ค้นหาชื่อ, เบอร์โทร, เลขบัตรประชาชน...').fill('สมชาย');
    await page.getByPlaceholder('ค้นหาทะเบียนรถ...').fill('กข 1000');
    await expectCount(page, 1, 'คน');
    await page.getByPlaceholder('ค้นหาทะเบียนรถ...').fill('กข 1001');
    await expectCount(page, 0, 'คน');
    await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).first().click();
    await expectCount(page, 10, 'คน');
});

test('contract status dropdown applies each status and restores all contracts', async ({ page }) => {
    await page.goto('/admin/contracts');
    const status = page.getByRole('combobox', { name: 'กรองสถานะสัญญา' });
    await expectCount(page, 10);
    for (const value of ['expired', 'terminated', 'renewed']) {
        await status.selectOption(value);
        await expectCount(page, 0);
    }
    await status.selectOption('active');
    await expectCount(page, 10);
    await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).first().click();
    await expect(status).toHaveValue('');
    await expectCount(page, 10);
});

test('invoice status and billing month filters restore all months on reset', async ({ page }) => {
    await page.goto('/admin/invoices');
    const status = page.getByRole('combobox', { name: 'กรองสถานะใบแจ้งหนี้' });
    await expectCount(page, 10);
    for (const [value, count] of [['paid', 4], ['pending', 5], ['overdue', 1], ['cancelled', 0]] as const) {
        await status.selectOption(value);
        await expectCount(page, count);
    }
    await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).first().click();
    await expectCount(page, 20);
    await expect(status).toHaveValue('');
});

test('tenant annual bill and meter selectors change data and restore the selected year', async ({ page }) => {
    const year = new Date().getFullYear();
    await page.goto('/tenant/bills');
    const billsYear = page.getByRole('combobox', { name: 'ปีใบแจ้งหนี้ของฉัน' });
    await billsYear.selectOption(String(year - 1));
    await expect(page.getByText('ไม่พบประวัติการชำระเงินสำหรับปีนี้', { exact: true }).filter({ visible: true })).toBeVisible();
    await billsYear.selectOption(String(year));
    await expect(page.getByText('ไม่พบประวัติการชำระเงินสำหรับปีนี้', { exact: true }).filter({ visible: true })).toHaveCount(0);
    await page.goto('/tenant/water-meter');
    const meterYear = page.getByRole('combobox', { name: 'ปีประวัติมิเตอร์น้ำของฉัน' });
    await meterYear.selectOption(String(year - 1));
    await expect(page.getByText('ไม่พบข้อมูลสำหรับปีนี้', { exact: true })).toBeVisible();
    await meterYear.selectOption(String(year));
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.getByText('ไม่พบข้อมูลสำหรับปีนี้', { exact: true })).toHaveCount(0);
});

test('a slow previous-year query cannot replace the current meter year', async ({ page }) => {
    const year = new Date().getFullYear();
    await page.goto('/tenant/water-meter');
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await page.evaluate(previous => Object.assign(window, { __fixtureQueryDelays: { [`history_meter:${previous}-01`]: 600 } }), year - 1);
    const picker = page.getByRole('combobox', { name: 'ปีประวัติมิเตอร์น้ำของฉัน' });
    await picker.selectOption(String(year - 1));
    await picker.selectOption(String(year));
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await page.waitForTimeout(800); // Deliberately let the old response arrive after the current one.
    await expect(picker).toHaveValue(String(year));
    await expect(page.locator('tbody tr')).toHaveCount(2);

    await page.goto('/admin/rooms');
    await page.getByRole('button', { name: /ประวัติ/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('tbody tr')).toHaveCount(12);
    await page.evaluate(previous => Object.assign(window, { __fixtureQueryDelays: { [`history_meter:${previous}-01`]: 600 } }), year - 1);
    const historyYear = dialog.getByRole('combobox', { name: 'ปีประวัติมิเตอร์ห้องพัก' });
    await historyYear.selectOption(String(year - 1));
    await historyYear.selectOption(String(year));
    const month = new Date().toLocaleDateString('th-TH', { month: 'long' });
    const reading = dialog.getByRole('spinbutton', { name: `มิเตอร์น้ำ ${month} ${year + 543}`, exact: true });
    await expect(reading).toHaveValue('1012');
    await page.waitForTimeout(800);
    await expect(reading).toHaveValue('1012');
});

test('maintenance status tabs, vehicle search and user search filter their lists', async ({ page }) => {
    await page.goto('/admin/maintenance');
    await page.getByRole('tab', { name: 'กำลังดำเนินการ', exact: true }).click();
    await expect(page.getByText('ไม่พบรายการแจ้งซ่อม', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'ทั้งหมด', exact: true }).click();
    await expect(page.getByText('เครื่องปรับอากาศไม่เย็น', { exact: true })).toBeVisible();
    await page.goto('/admin/vehicles');
    await page.getByPlaceholder('ค้นหาจากเลขทะเบียน...').fill('กข 1000');
    await expectCount(page, 1, 'คัน');
    await page.getByRole('button', { name: 'ล้างตัวกรอง', exact: true }).click();
    await expectCount(page, 5, 'คัน');
    await page.goto('/admin/users');
    await page.getByPlaceholder('ค้นหาชื่อ, เบอร์โทร, หรือบทบาท...').fill('สมชาย');
    await expect(page.getByRole('heading', { name: 'รายชื่อผู้ใช้ (1)' })).toBeVisible();
    await page.getByPlaceholder('ค้นหาชื่อ, เบอร์โทร, หรือบทบาท...').fill('');
    await expect(page.getByRole('heading', { name: 'รายชื่อผู้ใช้ (10)' })).toBeVisible();
});
