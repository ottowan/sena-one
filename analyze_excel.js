
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = 'D:\\workspace\\sena-one\\template\\คำบำรุง_เสนา1_3_6811.xlsx';

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        // Try listing directory to debug
        const dir = path.dirname(filePath);
        if (fs.existsSync(dir)) {
            console.log(`Directory ${dir} exists. Contents:`);
            console.log(fs.readdirSync(dir));
        } else {
            console.error(`Directory ${dir} not found`);
        }
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get headers (first row)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('--- Sheet Name ---');
    console.log(sheetName);

    console.log('\n--- First 20 Rows ---');
    console.log(JSON.stringify(jsonData.slice(0, 20), null, 2));

} catch (error) {
    console.error('Error reading Excel file:', error);
}
