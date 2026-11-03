import { test, expect } from '@playwright/test';

test('registry can search by room and exposes the registered asset numbers', async ({ page }) => {
    await page.goto('/admin/equipment');
    await page.getByPlaceholder('ค้นหาเลขห้อง ชื่อรายการ หรือเลขครุภัณฑ์...').fill('301');
    const details = page.getByRole('button', { name: 'ดูครุภัณฑ์ห้อง 301', exact: true });
    await expect(details).toBeVisible();
    await expect(page.getByRole('button', { name: 'ดูครุภัณฑ์ห้อง 302', exact: true })).toHaveCount(0);
    await details.click();
    await expect(page.getByRole('dialog').getByText('AC-101', { exact: true })).toBeVisible();
});

test('residents survey all assets, supply an abnormal cause, and read annual history', async ({ page }, info) => {
    const year = new Date().getFullYear();
    await page.goto('/tenant/equipment');
    const current = page.getByTestId(`equipment-survey-year-${year}`);
    await current.getByRole('button', { name: 'เริ่มสำรวจ' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'สภาพ เครื่องปรับอากาศ รายการ 1' }).selectOption('normal');
    await dialog.getByRole('combobox', { name: 'สภาพ ตู้เสื้อผ้า รายการ 2' }).selectOption('damaged');
    const cause = dialog.getByRole('textbox', { name: 'สาเหตุ ตู้เสื้อผ้า รายการ 2' });
    await dialog.getByRole('button', { name: 'ยืนยันส่งผลสำรวจ' }).click();
    expect(await cause.evaluate((element: HTMLTextAreaElement) => element.validity.valueMissing)).toBe(true);
    await cause.fill('บานพับหักจากการใช้งาน ไม่สามารถปิดตู้ได้');
    page.once('dialog', confirmation => confirmation.accept());
    await dialog.getByRole('button', { name: 'ยืนยันส่งผลสำรวจ' }).click();
    await expect(dialog).not.toBeVisible();
    await current.getByRole('button', { name: 'ดูผลสำรวจ' }).click();
    await expect(page.getByText('สาเหตุ / หมายเหตุ: บานพับหักจากการใช้งาน ไม่สามารถปิดตู้ได้')).toBeVisible();
    await page.screenshot({ path: info.outputPath('submitted-survey.png') });
    await page.keyboard.press('Escape');
    await page.getByTestId(`equipment-survey-year-${year - 1}`).getByRole('button', { name: 'ดูผลสำรวจ' }).click();
    await expect(page.getByText('เลขครุภัณฑ์: OLD-AC-101')).toBeVisible();
    await expect(page.getByText('เสื่อมสภาพ', { exact: true })).toBeVisible();
});

test('admin can close, reopen, view earlier years and open a new annual round', async ({ page }, info) => {
    const year = new Date().getFullYear();
    await page.goto('/admin/equipment');
    await expect(page.getByText('เปิดรับสำรวจ', { exact: true })).toBeVisible();
    page.once('dialog', confirmation => confirmation.accept());
    await page.getByRole('button', { name: 'ปิดรับสำรวจ', exact: true }).click();
    await expect(page.getByText('ปิดรับแล้ว', { exact: true })).toBeVisible();
    page.once('dialog', confirmation => confirmation.accept());
    await page.getByRole('button', { name: 'เปิดรับอีกครั้ง', exact: true }).click();
    await expect(page.getByText('เปิดรับสำรวจ', { exact: true })).toBeVisible();
    const selector = page.getByRole('combobox', { name: 'ปีสำรวจครุภัณฑ์' });
    await selector.selectOption(String(year - 1));
    await page.getByRole('button', { name: 'ดูผลสำรวจ', exact: true }).first().click();
    await expect(page.getByText('เลขครุภัณฑ์: OLD-AC-101')).toBeVisible();
    await page.keyboard.press('Escape');
    await selector.selectOption(String(year + 1));
    page.once('dialog', confirmation => confirmation.accept());
    await page.getByRole('button', { name: 'เปิดรอบสำรวจ', exact: true }).click();
    await expect(page.getByText('เปิดรับสำรวจ', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: info.outputPath('admin-survey.png') });
});
