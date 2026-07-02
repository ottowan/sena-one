
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchByIds } from '../lib/firestoreUtils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export const exportService = {
    exportMonthlyInvoices: async (month: string) => {
        // 1. Fetch all rooms
        const roomsSnap = await getDocs(collection(db, 'rooms'));
        const roomsData = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);

        // Customize Sort: Numeric sort for room numbers
        const rooms = roomsData.sort((a, b) => {
            return a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' });
        });

        // 2. Fetch invoices for the month
        const [year, m] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const endDate = new Date(year, m, 0).toISOString().split('T')[0];

        const invoicesSnap = await getDocs(
            query(
                collection(db, 'invoices'),
                where('billing_month', '>=', startDate),
                where('billing_month', '<=', endDate)
            )
        );
        const rawInvoices = invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        const [tenantById, contractById] = await Promise.all([
            fetchByIds<any>('tenants', rawInvoices.map((inv) => inv.tenant_id)),
            fetchByIds<any>('contracts', rawInvoices.map((inv) => inv.contract_id)),
        ]);
        const invoices = rawInvoices.map((inv) => ({
            ...inv,
            tenant: tenantById.get(inv.tenant_id),
            contract: contractById.get(inv.contract_id),
        }));

        // 3. Fetch history_meter for Current and Previous Month (for rooms without invoices)
        // Current Month
        const currentMetersSnap = await getDocs(query(collection(db, 'history_meter'), where('month', '==', month)));
        const currentMeters = currentMetersSnap.docs.map((d) => d.data());

        // Previous Month
        // Reuse year and m from above
        let prevY = year;
        let prevM = m - 1;
        if (prevM === 0) {
            prevM = 12;
            prevY -= 1;
        }
        const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;

        const prevMetersSnap = await getDocs(query(collection(db, 'history_meter'), where('month', '==', prevMonthStr)));
        const prevMeters = prevMetersSnap.docs.map((d) => d.data());

        // Create Maps for fast lookup
        const currentMeterMap = new Map<string, any>(currentMeters?.map(m => [m.room_id, m]));
        const prevMeterMap = new Map<string, any>(prevMeters?.map(m => [m.room_id, m]));

        // 4. Prepare Header Data... (existing code)
        // ... (Skipping header setup lines 39-82 as they are unchanged) ...

        const dateObj = new Date(year, m - 1, 1);
        const thaiMonth = format(dateObj, 'MMMM', { locale: th });
        const thaiYear = year + 543;
        const monthYearStr = `ประจำเดือน  ${thaiMonth} พ.ศ. ${thaiYear}`;

        const headerRows = [
            ["ตารางการจัดเก็บค่าบำรุงรายเดือน ค่าส่วนกลาง ค่าน้ำประปา และค่าไฟฟ้า"],
            ["ของอาคารบ้านพักศาลยุติธรรม  ซอยเสนานิคม 1 อาคาร 3 "],
            [monthYearStr],
            ["ผู้ดูแลอาคารชื่อ นายปริญญา บำรุงชู นักวิชาการคอมพิวเตอร์ชำนาญการ"],
            [
                "ห้อง", null, null, null, null, null, null,
                "ค่าน้ำประปา", null, null, null, null, null,
                "ค่าไฟฟ้า", null, null, null, null, null,
                "รวม"
            ],
            [
                "เลขที่", "รายชื่อผู้พักอาศัย", "ตำแหน่ง", "ระดับ", "สังกัด", "ค่าบำรุง\r\nรายเดือน", "ค่า\r\nส่วนกลาง",
                "จดครั้งนี้", "จดครั้งก่อน", "จำนวน", "จำนวนเงิน \r\n(หน่วยละ \r\n16 บาท)", "ค่าบำรุง", "รวมเงินค่า",
                "จดครั้งนี้", "จดครั้งก่อน", "จำนวน", "จำนวนเงิน\r\n (หน่วยละ \r\n5 บาท)", "ค่าบำรุง", "รวมค่า",
                "(บาท)"
            ],
            [
                null, null, null, null, null, null, null,
                null, null, "หน่วย", null, "มิเตอร์น้ำ", "น้ำประปา",
                null, null, "หน่วย", null, "มิเตอร์ไฟฟ้า", "ไฟฟ้า",
                ""
            ]
        ];

        // 5. Map Data & Calculate Totals
        let totalRent = 0;
        let totalCommon = 0;
        let totalWaterLast = 0;
        let totalWaterCurr = 0;
        let totalWaterUnit = 0;
        let totalWaterCost = 0;
        let totalWaterMaintain = 0;
        let totalWaterTotal = 0;
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
            const rent = invoice ? (invoice.rent_amount || 0) : 0;
            const commonFeeItem = invoice?.additional_charges?.find((c: any) => c.name === 'ค่าส่วนกลาง');
            const commonFee = commonFeeItem ? Number(commonFeeItem.amount) : 0;

            // Water
            let waterCurr = 0;
            let waterLast = 0;
            let waterUnit = 0;
            let waterCost = 0;
            let waterMaintain = 0;

            if (invoice) {
                waterCurr = invoice.water_meter_current || 0;
                waterLast = invoice.water_meter_last || 0;
                waterUnit = invoice.water_usage || 0;
                waterCost = invoice.water_cost || 0;
                const waterMaintainItem = invoice.additional_charges?.find((c: any) => c.name === 'ค่าบำรุงมิเตอร์น้ำ');
                waterMaintain = waterMaintainItem ? Number(waterMaintainItem.amount) : 0;
            } else {
                // Fetch from History if no invoice
                const currRecord = currentMeterMap.get(room.id);
                const prevRecord = prevMeterMap.get(room.id);

                waterCurr = currRecord?.water_meter || 0;
                waterLast = prevRecord?.water_meter || 0;
                // Calculate unit if we have readings
                if (currRecord) {
                    waterUnit = Math.max(0, waterCurr - waterLast);
                }
                // No cost for vacant rooms usually
            }
            const waterTotal = waterCost + waterMaintain;

            // Elec
            let elecCurr = 0;
            let elecLast = 0;
            let elecUnit = 0;
            let elecCost = 0;
            let elecService = 0;

            if (invoice) {
                elecCurr = invoice.electricity_meter_current || 0;
                elecLast = invoice.electricity_meter_last || 0;
                elecUnit = invoice.electricity_usage || 0;
                elecCost = invoice.electricity_cost || 0;
                // Check for service fee if any
            } else {
                // Fetch from History if no invoice
                const currRecord = currentMeterMap.get(room.id);
                const prevRecord = prevMeterMap.get(room.id);

                elecCurr = currRecord?.electricity_meter || 0;
                elecLast = prevRecord?.electricity_meter || 0;
                if (currRecord) {
                    elecUnit = Math.max(0, elecCurr - elecLast);
                }
            }
            const elecTotal = elecCost + elecService;

            const total = rent + commonFee + waterTotal + elecTotal;

            // Accumulate Totals (Include even if no invoice? Or only invoiced? 
            // Usually totals are for Revenue. Vacant rooms don't pay.
            // But Units might be interesting. Let's include units.)

            if (invoice) {
                totalRent += rent;
                totalCommon += commonFee;
                totalWaterCost += waterCost;
                totalWaterMaintain += waterMaintain;
                totalWaterTotal += waterTotal;
                totalElecCost += elecCost;
                totalElecService += elecService;
                totalElecTotal += elecTotal;
                grandTotalAll += total;
            }
            // Always sum units?
            totalWaterUnit += waterUnit;
            totalElecUnit += elecUnit;
            // If we sum units for vacant, it might skew "Sold" units vs "Consumed" units.
            // But for meter management, Total Consumption is useful.
            // Let's sum units for all.

            return [
                room.room_number, // Col A
                tenantName,       // Col B
                position,         // Col C
                level,            // Col D
                workplace,        // Col E
                invoice ? rent : '',       // Col F
                invoice ? commonFee : '',  // Col G

                // Water Section
                waterCurr || '',   // Col H
                waterLast || '',   // Col I
                waterUnit || '',   // Col J
                invoice ? waterCost : '',   // Col K
                invoice ? waterMaintain : '', // Col L
                invoice ? waterTotal : '',    // Col M

                // Elec Section
                elecCurr || '',    // Col N
                elecLast || '',    // Col O
                elecUnit || '',    // Col P
                invoice ? elecCost : '',    // Col Q
                invoice ? elecService : '',   // Col R
                invoice ? elecTotal : '',     // Col S

                invoice ? total : ''        // Col T
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
