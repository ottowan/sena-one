
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'D:\\workspace\\sena-one\\template\\sample.xlsx';

try {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get headers (first 2 rows to check for merged headers complex structure)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('--- Sheet Name ---');
    console.log(sheetName);

    console.log('\n--- First 10 Rows ---');
    console.log(JSON.stringify(jsonData.slice(0, 10), null, 2));

} catch (error) {
    console.error('Error reading Excel file:', error);
}
