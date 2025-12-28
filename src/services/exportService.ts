
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const exportService = {
    exportMonthlyInvoices: async (month: string) => {
        // 1. Fetch all rooms
        const { data: roomsData, error: roomError } = await supabase
            .from('rooms')
            .select('*');

        if (roomError) throw roomError;

        // Customize Sort: Numeric sort for room numbers
        const rooms = roomsData.sort((a, b) => {
            return a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 2. Fetch invoices for the month
        const [year, m] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const endDate = new Date(year, m, 0).toISOString().split('T')[0];

        const { data: invoices, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
        *,
        tenant:tenants(full_name, position_title, position_level, workplace, phone),
        contract:contracts(monthly_rent)
      `)
            .gte('billing_month', startDate)
            .lte('billing_month', endDate);

        if (invoiceError) throw invoiceError;

        // 3. Prepare Header Data
        const dateObj = new Date(year, m - 1, 1);
        const thaiMonth = format(dateObj, 'MMMM', { locale: th });
        const thaiYear = year + 543;
        const monthYearStr = `ประจำเดือน  ${thaiMonth} พ.ศ. ${thaiYear}`;

        // Header Rows (Matches sample.xlsx)
        // Row 1-4: Titles
        // Row 5: Group Headers (Water, Elec)
        // Row 6: Sub Headers
        // Row 7: Units (Sub-Sub) - Actually Row 6 in array index 5 contains newlines.
        // Let's assume standard AOA structure.

        const headerRows = [
            ["ตารางการจัดเก็บค่าบำรุงรายเดือน ค่าส่วนกลาง ค่าน้ำประปา และค่าไฟฟ้า"], // Row 1
            ["ของอาคารบ้านพักศาลยุติธรรม  ซอยเสนานิคม 1 อาคาร 3 "], // Row 2
            [monthYearStr], // Row 3
            ["ผู้ดูแลอาคารชื่อ นายปริญญา บำรุงชู นักวิชาการคอมพิวเตอร์ชำนาญการ"], // Row 4
            [ // Row 5 (Index 4)
                "ห้อง", null, null, null, null, null, null,
                "ค่าน้ำประปา", null, null, null, null, null,
                "ค่าไฟฟ้า", null, null, null, null, null,
                "รวม"
            ],
            [ // Row 6 (Index 5)
                "เลขที่", "รายชื่อผู้พักอาศัย", "ตำแหน่ง", "ระดับ", "สังกัด", "ค่าบำรุง\r\nรายเดือน", "ค่า\r\nส่วนกลาง",
                "จดครั้งนี้", "จดครั้งก่อน", "จำนวน", "จำนวนเงิน \r\n(หน่วยละ \r\n16 บาท)", "ค่าบำรุง", "รวมเงินค่า",
                "จดครั้งนี้", "จดครั้งก่อน", "จำนวน", "จำนวนเงิน\r\n (หน่วยละ \r\n5 บาท)", "ค่าบำรุง", "รวมค่า",
                "(บาท)"
            ],
            [ // Row 7 (Index 6) - Sub-headers for units/notes if needed.
                // Sample showed Row 7 has: [null... null, 244255, 244224, "หน่วย", null, "มิเตอร์น้ำ", "น้ำประปา ", ... "มิเตอร์ไฟฟ้า", "ไฟฟ้า", "(บาท)"]
                // Wait, looking at sample output, Row 6 (Index 5) is the Main Subheader. Row 7 (Index 6) seems to be "Initial Meter" or "Previous Totals" row in the sample?
                // The sample output Row 6 (Index 6) has [null... 244255, 244224...]. This looks like a carry-forward row or initial meter reading row.
                // I will OMIT this row for now as I generate new reports, OR keep it empty if it's structural.
                // User said "Like Original", so I will include the structure but leave values empty or calculated?
                // Let's assume it's a specific header row for "Unit Type" or similar.
                null, null, null, null, null, null, null,
                null, null, "หน่วย", null, "มิเตอร์น้ำ", "น้ำประปา",
                null, null, "หน่วย", null, "มิเตอร์ไฟฟ้า", "ไฟฟ้า",
                ""
            ]
        ];

        // 4. Map Data & Calculate Totals
        let totalRent = 0;
        let totalCommon = 0;
        let totalWaterLast = 0; // Sums might not make sense for meters, but summing costs does.
        let totalWaterCurr = 0;
        let totalWaterUnit = 0;
        let totalWaterCost = 0;
        let totalWaterMaintain = 0;
        let totalWaterTotal = 0; // Cost + Maintain
        let totalElecLast = 0;
        let totalElecCurr = 0;
        let totalElecUnit = 0;
        let totalElecCost = 0;
        let totalElecService = 0;
        let totalElecTotal = 0;
        let grandTotalAll = 0;

        const dataRows = rooms.map(room => {
            const invoice = invoices?.find(inv => inv.room_id === room.id);

            let status = '';
            if (room.status === 'maintenance') status = '- ห้องชำรุด -';
            else if (room.status === 'available') status = '- ห้องว่าง -';

            const tenantName = invoice?.tenant?.full_name || (room.status === 'occupied' ? 'On Contract' : status);
            const position = invoice?.tenant?.position_title || '';
            const level = invoice?.tenant?.position_level || '';
            const workplace = invoice?.tenant?.workplace || '';

            // Rent & Common Fee
            // In DB: invoice.rent_amount. Common fee is in additional_charges.
            // Let's extract common fee.
            const rent = invoice ? (invoice.rent_amount || 0) : 0;
            const commonFeeItem = invoice?.additional_charges?.find((c: any) => c.name === 'ค่าส่วนกลาง');
            const commonFee = commonFeeItem ? Number(commonFeeItem.amount) : 0;
            // Or use hardcoded furniture logic from request? Sample had columns: Rent, Common Fee.
            // Previous code had "Furniture". Sample headers say "ค่าบำรุงรายเดือน" (Rent) and "ค่าส่วนกลาง" (Common).
            // So: Column F = Rent, Column G = Common.

            // Water
            const waterCurr = invoice?.water_meter_current || 0;
            const waterLast = invoice?.water_meter_last || 0;
            const waterUnit = invoice?.water_usage || 0;
            const waterCost = invoice?.water_cost || 0;
            const waterMaintainItem = invoice?.additional_charges?.find((c: any) => c.name === 'ค่าบำรุงมิเตอร์น้ำ');
            const waterMaintain = waterMaintainItem ? Number(waterMaintainItem.amount) : 0; // Usually 20 in sample? Header says "มิเตอร์น้ำ"
            const waterTotal = waterCost + waterMaintain;

            // Elec
            const elecCurr = invoice?.electricity_meter_current || 0;
            const elecLast = invoice?.electricity_meter_last || 0;
            const elecUnit = invoice?.electricity_usage || 0;
            const elecCost = invoice?.electricity_cost || 0;
            const elecService = 0; // Sample header 'ค่าบำรุง' under Elec? Or 'ค่าบริการ'? Sample had 0 service for elec usually.
            // Wait, sample headers for Elec: "จดครั้งนี้", "จดครั้งก่อน", "จำนวน", "จำนวนเงิน", "ค่าบำรุง", "รวมค่า".
            // So Elec DOES have a service/maintenance fee column.
            const elecTotal = elecCost + elecService;

            const total = (invoice ? (rent + commonFee + waterTotal + elecTotal) : 0);

            // Accumulate Totals
            if (invoice) {
                totalRent += rent;
                totalCommon += commonFee;

                totalWaterUnit += waterUnit;
                totalWaterCost += waterCost;
                totalWaterMaintain += waterMaintain;
                totalWaterTotal += waterTotal;

                totalElecUnit += elecUnit;
                totalElecCost += elecCost;
                totalElecService += elecService;
                totalElecTotal += elecTotal;

                grandTotalAll += total;
            }

            return [
                room.room_number, // Col A: เลขที่
                tenantName,       // Col B: รายชื่อ
                position,         // Col C: ตำแหน่ง
                level,            // Col D: ระดับ
                workplace,        // Col E: สังกัด
                invoice ? rent : '',       // Col F: ค่าบำรุง
                invoice ? commonFee : '',  // Col G: ค่าส่วนกลาง

                // Water Section
                invoice ? waterCurr : '',   // Col H: จดครั้งนี้
                invoice ? waterLast : '',   // Col I: จดครั้งก่อน
                invoice ? waterUnit : '',   // Col J: จำนวน
                invoice ? waterCost : '',   // Col K: จำนวนเงิน
                invoice ? waterMaintain : '', // Col L: ค่าบำรุง
                invoice ? waterTotal : '',    // Col M: รวมเงินค่า

                // Elec Section
                invoice ? elecCurr : '',    // Col N: จดครั้งนี้
                invoice ? elecLast : '',    // Col O: จดครั้งก่อน
                invoice ? elecUnit : '',    // Col P: จำนวน
                invoice ? elecCost : '',    // Col Q: จำนวนเงิน
                invoice ? elecService : '',   // Col R: ค่าบำรุง
                invoice ? elecTotal : '',     // Col S: รวมค่า

                invoice ? total : ''        // Col T: รวม (บาท)
            ];
        });

        // Total Row
        const totalRow = [
            "รวมทั้งสิ้น", null, null, null, null,
            totalRent,
            totalCommon,
            null, null, totalWaterUnit, totalWaterCost, totalWaterMaintain, totalWaterTotal,
            null, null, totalElecUnit, totalElecCost, totalElecService, totalElecTotal,
            grandTotalAll
        ];

        // Footer Text rows
        const footerTextRows = [
            [], // Empty row
            ["   หมายเหตุ    - สำหรับห้องที่ยังไม่จัดส่งเอกสารการชำระเงิน จะดำเนินการเรียกเก็บให้ในภายหลัง"],
            [" - กรุณาโอนภายในวันที่ 5 ของเดือนถัดไป"], // Date logic? Fixed text?
            [" - ชำระเงินผ่าน QRCode ที่ติดไว้หน้าห้องพัก"]
        ];

        const finalData = [...headerRows, ...dataRows, totalRow, ...footerTextRows];

        // 5. Create Sheet and Merges
        const ws = XLSX.utils.aoa_to_sheet(finalData);

        // Define Merges
        const merges = [
            // Header Title Merges
            { s: { r: 0, c: 0 }, e: { r: 0, c: 19 } }, // Row 1 Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: 19 } }, // Row 2 Title
            { s: { r: 2, c: 0 }, e: { r: 2, c: 19 } }, // Row 3 Title
            { s: { r: 3, c: 0 }, e: { r: 3, c: 19 } }, // Row 4 Name

            // Table Headers (Row 5 & 6)
            { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } }, // ห้อง/เลขที่
            { s: { r: 4, c: 7 }, e: { r: 4, c: 12 } }, // ค่าน้ำประปา Spans 6 cols (H-M)
            { s: { r: 4, c: 13 }, e: { r: 4, c: 18 } }, // ค่าไฟฟ้า Spans 6 cols (N-S)
            { s: { r: 4, c: 19 }, e: { r: 5, c: 19 } }, // รวม Spans 2 rows

            // Footer Merges
            { s: { r: finalData.length - 4, c: 0 }, e: { r: finalData.length - 4, c: 4 } }, // "รวมทั้งสิ้น" Label spanning A-E
        ];

        ws['!merges'] = merges;

        // Column Widths (Approximate)
        ws['!cols'] = [
            { wch: 8 },  // A: Room
            { wch: 25 }, // B: Name
            { wch: 15 }, // C: Pos
            { wch: 10 }, // D: Level
            { wch: 15 }, // E: Workplace
            { wch: 10 }, // F: Rent
            { wch: 10 }, // G: Common
            // Water
            { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
            // Elec
            { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
            { wch: 12 }  // T: Total
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ค่าบำรุง");

        const fileName = `ค่าบำรุง_เสนา1_${thaiMonth}_${thaiYear.toString().slice(-2)}.xlsx`;
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        saveAs(blob, fileName);
    }
};
