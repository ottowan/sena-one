
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filePath = 'D:\\workspace\\sena-one\\template\\sample.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    // Get last 15 rows to be safe
    const footerRows = jsonData.slice(Math.max(0, jsonData.length - 15));

    console.log('--- Footer Rows ---');
    console.log(JSON.stringify(footerRows, null, 2));

} catch (error) {
    console.error('Error:', error);
}
