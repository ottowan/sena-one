import { pgliteClient } from '../lib/pgliteClient';
import type { AppSettings, Contract, Invoice, InvoiceFormData, RentRate } from '../types';

type BulkInvoiceInput = InvoiceFormData & {
    contract: Contract;
};

function billingMonthDate(month: string) {
    return month.length === 7 ? `${month}-01` : month;
}

function monthKey(roomId: string, month: string) {
    return `${roomId}:${month.substring(0, 7)}`;
}

function buildInvoicePayload(
    invoice: InvoiceFormData,
    contract: Contract,
    appSettings: AppSettings | null,
    rentRateByPosition: Map<string, RentRate>
) {
    const rentConfig = contract.tenant?.position_level
        ? rentRateByPosition.get(contract.tenant.position_level)
        : null;

    let rentAmount = contract.monthly_rent || 0;
    if (rentConfig && rentConfig.rent_amount > 0) {
        rentAmount = Number(rentConfig.rent_amount);
    } else if (rentAmount === 0 && contract.room?.monthly_rent) {
        rentAmount = contract.room.monthly_rent;
    }

    const waterRate = appSettings?.water_rate || 18;
    const electricityRate = contract.room?.electricity_rate || appSettings?.electricity_rate || 8;
    const commonFee = rentConfig?.common_fee ?? appSettings?.common_fee ?? 0;
    const maintenanceFee = appSettings?.water_maintenance_fee || 0;
    const waterCost = invoice.water_usage * waterRate;
    const electricityCost = invoice.electricity_usage * electricityRate;
    const finalAdditionalCharges = [...(invoice.additional_charges || [])];

    if (commonFee > 0) {
        finalAdditionalCharges.push({ name: 'เธเนเธฒเธชเนเธงเธเธเธฅเธฒเธ', amount: commonFee });
    }
    if (maintenanceFee > 0) {
        finalAdditionalCharges.push({ name: 'เธเนเธฒเธเธณเธฃเธธเธเธกเธดเน€เธ•เธญเธฃเนเธเนเธณ', amount: maintenanceFee });
    }

    const additionalTotal = finalAdditionalCharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

    return {
        contract_id: invoice.contract_id,
        tenant_id: contract.tenant_id,
        room_id: contract.room_id,
        billing_month: billingMonthDate(invoice.billing_month),
        rent_amount: rentAmount,
        water_usage: invoice.water_usage,
        water_cost: waterCost,
        water_meter_last: invoice.water_meter_last,
        water_meter_current: invoice.water_meter_current,
        electricity_usage: invoice.electricity_usage,
        electricity_cost: electricityCost,
        electricity_meter_last: invoice.electricity_meter_last,
        electricity_meter_current: invoice.electricity_meter_current,
        additional_charges: finalAdditionalCharges,
        total_amount: rentAmount + waterCost + electricityCost + additionalTotal,
        due_date: invoice.due_date,
        status: 'pending'
    };
}

async function getInvoiceSettings() {
    const [settingsResult, ratesResult] = await Promise.all([
        pgliteClient.from('app_settings').select('*').single(),
        pgliteClient.from('position_rent_rates').select('*'),
    ]);

    if (settingsResult.error) throw settingsResult.error;
    if (ratesResult.error) throw ratesResult.error;

    const rentRateByPosition = new Map(
        ((ratesResult.data || []) as RentRate[]).map((rate) => [rate.position_level, rate])
    );

    return {
        appSettings: settingsResult.data as AppSettings | null,
        rentRateByPosition,
    };
}

export const invoiceService = {
    // Get all invoices
    getInvoices: async (
        searchTerm?: string,
        status?: string,
        month?: string
    ): Promise<Invoice[]> => {
        let query = pgliteClient
            .from('invoices')
            .select(`
                *,
                tenant:tenants(id, full_name, phone),
                room:rooms(id, room_number, room_type),
                contract:contracts(id, monthly_rent)
            `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        if (month) {
            // Assume month is YYYY-MM
            const startDate = `${month}-01`;
            // Calculate end date (next month)
            const [year, m] = month.split('-').map(Number);
            const endDate = new Date(year, m, 0).toISOString().split('T')[0]; // Last day of month

            query = query.gte('billing_month', startDate).lte('billing_month', endDate);
        }

        if (searchTerm) {
            // Search logic here if needed
        }

        const { data, error } = await query;

        if (error) throw error;

        // Client-side filtering for search term if needed
        let invoices = data as Invoice[];
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            invoices = invoices.filter(inv =>
                inv.tenant?.full_name.toLowerCase().includes(lowerTerm) ||
                inv.room?.room_number.toLowerCase().includes(lowerTerm)
            );
        }

        // Sort by Room Number (Numeric)
        invoices.sort((a, b) => {
            const roomA = a.room?.room_number || '';
            const roomB = b.room?.room_number || '';
            return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
        });

        return invoices;
    },

    // Get invoice by ID
    getInvoice: async (id: string): Promise<Invoice> => {
        const { data, error } = await pgliteClient
            .from('invoices')
            .select(`
                *,
                tenant:tenants(*),
                room:rooms(*),
                contract:contracts(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Invoice;
    },

    // Create invoice
    createInvoice: async (invoice: InvoiceFormData): Promise<Invoice> => {
        // Fetch contract with Room AND Tenant details
        const { data: contract, error: contractError } = await pgliteClient
            .from('contracts')
            .select('*, room:rooms(*), tenant:tenants(id, position_level)')
            .eq('id', invoice.contract_id)
            .single();

        if (contractError) throw contractError;
        if (!contract) throw new Error('Contract not found');

        // Fetch App Settings for rates
        const { data: appSettings } = await pgliteClient
            .from('app_settings')
            .select('*')
            .single();

        // Fetch Position Rent Rate if tenant has position
        let positionRentRate = null;
        let positionCommonFee = null;
        if (contract.tenant?.position_level) {
            const { data: rentConfig } = await pgliteClient
                .from('position_rent_rates')
                .select('rent_amount, common_fee')
                .eq('position_level', contract.tenant.position_level)
                .maybeSingle();
            if (rentConfig) {
                positionRentRate = rentConfig.rent_amount;
                positionCommonFee = rentConfig.common_fee;
            }
        }

        // Determine Rent Amount: Position > Contract > Room
        let rentAmount = contract.monthly_rent || 0;
        if (positionRentRate) {
            rentAmount = Number(positionRentRate);
        } else if (rentAmount === 0 && contract.room?.monthly_rent) {
            rentAmount = contract.room.monthly_rent;
        }

        // Calculate costs using App Settings
        const waterRate = appSettings?.water_rate || 18;
        const electricityRate = contract.room?.electricity_rate || appSettings?.electricity_rate || 8;

        // Determine Common Fee: Position > App Settings
        let commonFee = 0;
        if (positionCommonFee !== null && positionCommonFee !== undefined) {
            commonFee = positionCommonFee;
        } else {
            commonFee = appSettings?.common_fee || 0;
        }

        const maintenanceFee = appSettings?.water_maintenance_fee || 0; // Water Maintenance Fee

        const waterCost = invoice.water_usage * waterRate;
        const electricityCost = invoice.electricity_usage * electricityRate;

        // Merge additional charges from input with fixed fees
        const additionalChargesProp = invoice.additional_charges || [];
        const finalAdditionalCharges = [...additionalChargesProp];

        if (commonFee > 0) {
            finalAdditionalCharges.push({ name: 'ค่าส่วนกลาง', amount: commonFee });
        }
        if (maintenanceFee > 0) {
            finalAdditionalCharges.push({ name: 'ค่าบำรุงมิเตอร์น้ำ', amount: maintenanceFee });
        }

        const additionalTotal = finalAdditionalCharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

        const totalAmount = rentAmount + waterCost + electricityCost + additionalTotal;

        // Format billing_month to YYYY-MM-DD for date column compatibility
        const billingMonthDate = invoice.billing_month.length === 7 ? `${invoice.billing_month}-01` : invoice.billing_month;

        const newInvoice = {
            contract_id: invoice.contract_id,
            tenant_id: contract.tenant_id,
            room_id: contract.room_id,
            billing_month: billingMonthDate,
            rent_amount: rentAmount,
            water_usage: invoice.water_usage,
            water_cost: waterCost,
            water_meter_last: invoice.water_meter_last,
            water_meter_current: invoice.water_meter_current,
            electricity_usage: invoice.electricity_usage,
            electricity_cost: electricityCost,
            electricity_meter_last: invoice.electricity_meter_last,
            electricity_meter_current: invoice.electricity_meter_current,
            additional_charges: finalAdditionalCharges,
            total_amount: totalAmount,
            due_date: invoice.due_date,
            status: 'pending'
        };

        const { data, error } = await pgliteClient
            .from('invoices')
            .insert(newInvoice)
            .select()
            .single();

        if (error) throw error;

        // Save to history_meter
        // billing_month is likely YYYY-MM based on InvoiceFormDialog input
        const billingMonth = invoice.billing_month.substring(0, 7); // Ensure YYYY-MM
        await pgliteClient.from('history_meter').insert({
            room_id: contract.room_id,
            month: billingMonth,
            water_meter: invoice.water_meter_current,
            electricity_meter: invoice.electricity_meter_current
        });

        return data as Invoice;
    },

    getMeterReadingsByMonths: async (
        roomIds: string[],
        months: string[]
    ): Promise<Map<string, { water: number; electricity: number }>> => {
        if (roomIds.length === 0 || months.length === 0) {
            return new Map();
        }

        const monthValues = [...new Set(months.flatMap((month) => [month, `${month}-01`]))];
        const { data, error } = await pgliteClient
            .from('history_meter')
            .select('room_id, month, water_meter, electricity_meter')
            .in('room_id', roomIds)
            .in('month', monthValues);

        if (error) throw error;

        return new Map(
            (data || []).map((row: any) => [
                monthKey(row.room_id, row.month),
                {
                    water: row.water_meter || 0,
                    electricity: row.electricity_meter || 0,
                },
            ])
        );
    },

    createInvoicesBulk: async (invoices: BulkInvoiceInput[]): Promise<Invoice[]> => {
        if (invoices.length === 0) return [];

        const { appSettings, rentRateByPosition } = await getInvoiceSettings();
        const invoiceRows = invoices.map((invoice) =>
            buildInvoicePayload(invoice, invoice.contract, appSettings, rentRateByPosition)
        );

        const { data, error } = await pgliteClient
            .from('invoices')
            .insert(invoiceRows)
            .select();

        if (error) throw error;

        const historyRows = invoices.map((invoice) => ({
            room_id: invoice.contract.room_id,
            month: invoice.billing_month.substring(0, 7),
            water_meter: invoice.water_meter_current || 0,
            electricity_meter: invoice.electricity_meter_current || 0,
        }));

        const { error: historyError } = await pgliteClient
            .from('history_meter')
            .upsert(historyRows, { onConflict: 'room_id, month' });

        if (historyError) throw historyError;

        return (data || []) as Invoice[];
    },

    // Update invoice status
    updateInvoiceStatus: async (id: string, status: string): Promise<void> => {
        const { error } = await pgliteClient
            .from('invoices')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    },

    // Delete invoice
    deleteInvoice: async (id: string): Promise<void> => {
        // Also delete from history_meter? 
        // Typically deletion of invoice might imply deleting the history record if it was the source of truth.
        // However, we don't store relation id. Let's keep it simple: Invoice deletion doesn't auto-delete history_meter 
        // unless we query it by month/room.
        // For now, leave history_meter as a log.
        const { error } = await pgliteClient
            .from('invoices')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Delete multiple invoices
    deleteAllInvoices: async (ids: string[]): Promise<void> => {
        const { error } = await pgliteClient
            .from('invoices')
            .delete()
            .in('id', ids);

        if (error) throw error;
    },

    // Get last meter readings for a room
    getLastMeterReading: async (roomId: string): Promise<{ water: number; electricity: number }> => {
        // 1. Try to fetch from history_meter
        const { data: historyData, error: historyError } = await pgliteClient
            .from('history_meter')
            .select('water_meter, electricity_meter')
            .eq('room_id', roomId)
            .order('month', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (historyError) {
            console.error('Error fetching history_meter:', historyError);
            // Verify if table exists? If 404/400 (relation does not exist), maybe fallback?
            // But we should throw or handle it.
            // Let's assume if it fails, we fallback to invoices or rooms.
        }

        if (historyData) {
            return {
                water: historyData.water_meter || 0,
                electricity: historyData.electricity_meter || 0
            };
        }

        // 2. Fallback to Invoices (if history_meter is empty or missing data)
        const { data: lastInvoice } = await pgliteClient
            .from('invoices')
            .select('water_meter_current, electricity_meter_current')
            .eq('room_id', roomId)
            .neq('status', 'cancelled')
            .order('billing_month', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastInvoice) {
            return {
                water: lastInvoice.water_meter_current || 0,
                electricity: lastInvoice.electricity_meter_current || 0
            };
        }

        // 3. If no history, fetch initial meter from Room
        const { data: roomData, error: roomError } = await pgliteClient
            .from('rooms')
            .select('current_water_meter, current_electricity_meter')
            .eq('id', roomId)
            .single();

        if (roomError) {
            console.warn('Error fetching room initial meter:', roomError);
            return { water: 0, electricity: 0 };
        }

        return {
            water: roomData?.current_water_meter || 0,
            electricity: roomData?.current_electricity_meter || 0
        };
    },

    // Get meter reading for a specific month
    getMeterReadingByMonth: async (roomId: string, monthStr: string): Promise<{ water: number; electricity: number } | null> => {
        // history_meter.month is TEXT 'YYYY-MM' (based on CREATE TABLE)
        // So we should just search by equality.
        // However, if some records were inserted as YYYY-MM-DD, we should clearer handle that.
        // But the insert logic in createInvoice uses usage YYYY-MM.
        // Let's try flexible search: column like 'YYYY-MM%'

        const { data, error } = await pgliteClient
            .from('history_meter')
            .select('water_meter, electricity_meter')
            .eq('room_id', roomId)
            .ilike('month', `${monthStr}%`) // Matches '2025-12' or '2025-12-01'
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching history_meter by month:', error);
            return null;
        }

        if (data) {
            return {
                water: data.water_meter,
                electricity: data.electricity_meter
            };
        }
        return null;
    }
};
