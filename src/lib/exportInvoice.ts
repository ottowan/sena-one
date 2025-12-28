import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Invoice } from '../types';

// ฟังก์ชันสำหรับแปลงชื่อเดือน
const getThaiMonth = (month: number): string => {
    const months = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    return months[month - 1] || '';
};

// ฟังก์ชันสำหรับแปลงปี ค.ศ. เป็น พ.ศ.
const getBuddhistYear = (year: number): number => {
    return year + 543;
};

// ฟังก์ชันสำหรับ format วันที่
const formatThaiDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = getThaiMonth(date.getMonth() + 1);
    const year = getBuddhistYear(date.getFullYear());
    return `${day} ${month} ${year}`;
};

// ฟังก์ชันสำหรับ format ตัวเลขเป็นรูปแบบไทย
const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export interface ExportInvoiceOptions {
    invoices: Invoice[];
    month: string; // format: YYYY-MM
    buildingName?: string;
}

export const exportInvoicesToExcel = async (options: ExportInvoiceOptions) => {
    const { invoices, month, buildingName = 'เสนา 1' } = options;
    
    if (!invoices.length) {
        throw new Error('ไม่มีข้อมูลใบแจ้งหนี้สำหรับการ export');
    }

    // แปลงเดือน/ปี
    const [year, monthNum] = month.split('-');
    const thaiMonth = getThaiMonth(parseInt(monthNum));
    const buddhistYear = getBuddhistYear(parseInt(year));
    const yearShort = buddhistYear.toString().slice(-2);

    // สร้าง workbook
    const wb = XLSX.utils.book_new();

    // กำหนดข้อมูลสำหรับ Excel
    const data: any[][] = [];

    // Header
    data.push([`รายการค่าบำรุงรายเดือน ${buildingName}`]);
    data.push([`เดือน ${thaiMonth} ${buddhistYear}`]);
    data.push([]); // บรรทัดว่าง

    // ตารางหัวข้อ
    data.push([
        'ลำดับ',
        'เลขห้อง',
        'ชื่อผู้เช่า',
        'เบอร์โทร',
        'ค่าเช่า',
        'ค่าน้ำ',
        'ค่าไฟ',
        'ค่าใช้จ่ายอื่น',
        'รวมทั้งหมด',
        'สถานะ',
        'วันที่ครบกำหนด'
    ]);

    // เพิ่มข้อมูลใบแจ้งหนี้
    let totalAmount = 0;
    let totalRent = 0;
    let totalWater = 0;
    let totalElectricity = 0;
    let totalAdditional = 0;

    invoices.forEach((invoice, index) => {
        const additionalChargesAmount = invoice.additional_charges?.reduce((sum, charge) => sum + charge.amount, 0) || 0;
        
        // รวมยอด
        totalAmount += invoice.total_amount;
        totalRent += invoice.rent_amount;
        totalWater += invoice.water_cost;
        totalElectricity += invoice.electricity_cost;
        totalAdditional += additionalChargesAmount;

        // สถานะภาษาไทย
        const statusThai = {
            'pending': 'รออำนวย',
            'paid': 'ชำระแล้ว',
            'overdue': 'เกินกำหนด',
            'cancelled': 'ยกเลิก'
        };

        data.push([
            index + 1,
            invoice.room?.room_number || '',
            invoice.tenant?.full_name || '',
            invoice.tenant?.phone || '',
            formatCurrency(invoice.rent_amount),
            formatCurrency(invoice.water_cost),
            formatCurrency(invoice.electricity_cost),
            formatCurrency(additionalChargesAmount),
            formatCurrency(invoice.total_amount),
            statusThai[invoice.status as keyof typeof statusThai] || invoice.status,
            formatThaiDate(invoice.due_date)
        ]);
    });

    // บรรทัดสรุป
    data.push([]); // บรรทัดว่าง
    data.push([
        'รวมทั้งหมด',
        '',
        '',
        '',
        formatCurrency(totalRent),
        formatCurrency(totalWater),
        formatCurrency(totalElectricity),
        formatCurrency(totalAdditional),
        formatCurrency(totalAmount),
        '',
        ''
    ]);

    // สร้าง worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);

    // ปรับความกว้างของคอลัมน์
    const colWidths = [
        { wch: 8 },  // ลำดับ
        { wch: 10 }, // เลขห้อง
        { wch: 25 }, // ชื่อผู้เช่า
        { wch: 15 }, // เบอร์โทร
        { wch: 12 }, // ค่าเช่า
        { wch: 12 }, // ค่าน้ำ
        { wch: 12 }, // ค่าไฟ
        { wch: 15 }, // ค่าใช้จ่ายอื่น
        { wch: 15 }, // รวมทั้งหมด
        { wch: 12 }, // สถานะ
        { wch: 20 }  // วันที่ครบกำหนด
    ];
    ws['!cols'] = colWidths;

    // จัดรูปแบบ cell
    // Header cells
    const headerStyle = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
    };

    const tableHeaderStyle = {
        font: { bold: true },
        alignment: { horizontal: 'center' },
        fill: { fgColor: { rgb: 'E6E6FA' } }
    };

    // ใส่สไตล์ให้ header
    if (ws['A1']) ws['A1'].s = headerStyle;
    if (ws['A2']) ws['A2'].s = headerStyle;

    // ใส่สไตล์ให้ table header (row 4)
    for (let col = 0; col < 11; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 3, c: col });
        if (ws[cellRef]) {
            ws[cellRef].s = tableHeaderStyle;
        }
    }

    // เพิ่มเส้นขอบและจัดตำแหน่งข้อมูล
    const dataRows = invoices.length + 1; // +1 สำหรับ summary row
    for (let row = 4; row <= 4 + dataRows; row++) {
        for (let col = 0; col < 11; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            if (ws[cellRef]) {
                ws[cellRef].s = {
                    ...ws[cellRef].s,
                    border: {
                        top: { style: 'thin' },
                        bottom: { style: 'thin' },
                        left: { style: 'thin' },
                        right: { style: 'thin' }
                    }
                };

                // จัดตำแหน่งตัวเลข
                if (col >= 4 && col <= 8) {
                    ws[cellRef].s.alignment = { horizontal: 'right' };
                }
            }
        }
    }

    // เพิ่ม worksheet ลงใน workbook
    XLSX.utils.book_append_sheet(wb, ws, 'ใบแจ้งหนี้');

    // สร้างชื่อไฟล์
    const fileName = `ค่าบำรุง_${buildingName.replace(/\s+/g, '')}_${thaiMonth}_${yearShort}.xlsx`;

    // Export file
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, fileName);

    return fileName;
};

// ฟังก์ชันสำหรับ export ใบแจ้งหนี้รายเดือน
export const exportMonthlyInvoices = async (month: string, invoices: Invoice[]) => {
    return exportInvoicesToExcel({
        invoices,
        month,
        buildingName: 'เสนา 1'
    });
};

// ฟังก์ชันสำหรับ export ใบแจ้งหนี้เฉพาะห้อง
export const exportRoomInvoices = async (roomNumber: string, invoices: Invoice[]) => {
    const wb = XLSX.utils.book_new();
    
    if (!invoices.length) {
        throw new Error(`ไม่มีข้อมูลใบแจ้งหนี้สำหรับห้อง ${roomNumber}`);
    }

    const data: any[][] = [];
    
    // Header
    data.push([`ประวัติการชำระเงินห้อง ${roomNumber}`]);
    data.push([`ชื่อผู้เช่า: ${invoices[0].tenant?.full_name || ''}`]);
    data.push([]); // บรรทัดว่าง

    // Table header
    data.push([
        'เดือน/ปี',
        'ค่าเช่า',
        'ค่าน้ำ',
        'ค่าไฟ',
        'รวมทั้งหมด',
        'สถานะ',
        'วันที่ชำระ'
    ]);

    // เพิ่มข้อมูล
    invoices.forEach((invoice) => {
        const billingDate = new Date(invoice.billing_month);
        const monthYear = `${getThaiMonth(billingDate.getMonth() + 1)} ${getBuddhistYear(billingDate.getFullYear())}`;
        
        const paymentDate = invoice.payments && invoice.payments.length > 0 
            ? formatThaiDate(invoice.payments[0].payment_date)
            : '-';

        const statusThai = {
            'pending': 'รออำนวย',
            'paid': 'ชำระแล้ว',
            'overdue': 'เกินกำหนด',
            'cancelled': 'ยกเลิก'
        };

        data.push([
            monthYear,
            formatCurrency(invoice.rent_amount),
            formatCurrency(invoice.water_cost),
            formatCurrency(invoice.electricity_cost),
            formatCurrency(invoice.total_amount),
            statusThai[invoice.status as keyof typeof statusThai] || invoice.status,
            paymentDate
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
        { wch: 15 }, // เดือน/ปี
        { wch: 12 }, // ค่าเช่า
        { wch: 12 }, // ค่าน้ำ
        { wch: 12 }, // ค่าไฟ
        { wch: 15 }, // รวมทั้งหมด
        { wch: 12 }, // สถานะ
        { wch: 20 }  // วันที่ชำระ
    ];

    XLSX.utils.book_append_sheet(wb, ws, `ห้อง ${roomNumber}`);

    const fileName = `ประวัติการชำระ_ห้อง${roomNumber}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, fileName);

    return fileName;
};