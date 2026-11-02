import { test, expect } from '@playwright/test';

const adminPages = ['','/meters','/invoices','/rooms','/tenants','/contracts','/vehicles','/equipment','/maintenance','/reports','/users','/settings'];
const tenantPages = ['', '/bills', '/water-meter', '/equipment', '/maintenance'];

for (const theme of ['light', 'dark']) test(`all admin and tenant pages render within the viewport in ${theme} mode`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(theme => localStorage.setItem('theme', theme), theme);
    for (const route of [...adminPages.map(path => `/admin${path}`), ...tenantPages.map(path => `/tenant${path}`), '/login']) {
        await page.goto(route);
        await expect(page.getByRole('heading').first()).toBeVisible();
        await page.waitForTimeout(250);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), route).toBe(true);
        if (['/admin', '/admin/meters', '/admin/invoices', '/tenant', '/login'].includes(route)) {
            await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-')}-${theme}.png`), fullPage: true });
        }
    }
    expect(errors).toEqual([]);
});

test('meter progress filters and editing work in both themes', async ({ page }, testInfo) => {
    await page.goto('/admin/meters');
    const edit = page.getByRole('spinbutton', { name: 'มิเตอร์น้ำปัจจุบัน ห้อง 301', exact: true }).filter({ visible: true });
    await expect(edit).toBeVisible();
    await edit.fill('1020');
    await expect(page.getByText('มี 1 ห้องที่ยังไม่บันทึก', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /มีการแก้ไข/ }).click();
    await expect(page.getByText('แสดง 1 ห้อง', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /วางข้อมูลจากตาราง/ }).click();
    await page.getByRole('textbox', { name: 'ข้อมูลมิเตอร์ที่คัดลอก' }).fill('315\t2083\n315\t2083');
    await expect(page.getByText('รวมรายการซ้ำที่มีค่าเหมือนกัน 1 รายการแล้ว')).toBeVisible();
    await page.getByRole('button', { name: /นำ 1 ห้องไปใส่ในตาราง/ }).click();
    await expect(page.getByText('มี 2 ห้องที่ยังไม่บันทึก', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: testInfo.project.name === 'mobile' ? 'บันทึก' : 'บันทึกการเปลี่ยนแปลง', exact: true }).click();
    await expect(page.getByText('ข้อมูลการจดมิเตอร์', { exact: true })).toBeVisible();
    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({ path: testInfo.outputPath('meters-dark.png'), fullPage: true });
});

test('reports, Thai calendar and mobile navigation remain usable', async ({ page }, testInfo) => {
    await page.goto('/admin/reports');
    await page.getByRole('tab', { name: /การเงิน/ }).click();
    await expect(page.getByText('ยอดรับจริง (ชำระแล้ว)')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('button', { name: /^เลือกเดือน/ }).filter({ visible: true }).click();
    await expect(page.getByRole('combobox', { name: 'ปี พ.ศ.' })).toBeVisible();
    await page.getByRole('button', { name: 'กุมภาพันธ์', exact: true }).click();
    await expect(page.getByRole('button', { name: /เลือกเดือน กุมภาพันธ์/ })).toBeVisible();
    await page.getByRole('tab', { name: /สาธารณูปโภค/ }).click();
    await expect(page.getByRole('button', { name: /เลือกเดือน/ }).filter({ visible: true })).toBeVisible();
    if (testInfo.project.name === 'mobile') {
        await page.getByRole('button', { name: 'เปิดเมนู' }).click();
        await page.getByRole('link', { name: 'ห้องพัก', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'จัดการห้องพัก' })).toBeVisible();
        await expect(page.getByRole('dialog')).not.toBeVisible();
    }
});
