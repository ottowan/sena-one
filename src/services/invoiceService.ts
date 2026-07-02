import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchByIds, nowIso, withId } from '../lib/firestoreUtils';
import type { AppSettings, Contract, Invoice, InvoiceFormData, RentRate } from '../types';

type BulkInvoiceInput = InvoiceFormData & {
    contract: Contract;
};

function billingMonthDate(month: string) {
    return month.length === 7 ? `${month}-01` : month;
}

function normalizeMonth(month: string): string {
    return month.length >= 7 ? month.slice(0, 7) : month;
}

function monthKey(roomId: string, month: string) {
    return `${roomId}:${month.substring(0, 7)}`;
}

function historyMeterDocId(roomId: string, month: string): string {
    return `${roomId}_${normalizeMonth(month)}`;
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
        finalAdditionalCharges.push({ name: 'ค่าส่วนกลาง', amount: commonFee });
    }
    if (maintenanceFee > 0) {
        finalAdditionalCharges.push({ name: 'ค่าบำรุงมิเตอร์น้ำ', amount: maintenanceFee });
    }

    const additionalTotal = finalAdditionalCharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

    return {
        contract_id: invoice.contract_id,
        tenant_id: contract.tenant_id,
        tenant_uid: (contract as any).tenant_uid ?? null,
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
        status: 'pending',
    };
}

async function getInvoiceSettings() {
    const [settingsSnap, ratesSnap] = await Promise.all([
        getDoc(doc(db, 'app_settings', 'singleton')),
        getDocs(collection(db, 'position_rent_rates')),
    ]);

    const rentRateByPosition = new Map(
        ratesSnap.docs.map((d) => [d.id, { position_level: d.id, ...d.data() } as RentRate])
    );

    return {
        appSettings: settingsSnap.exists() ? ({ id: 1, ...settingsSnap.data() } as AppSettings) : null,
        rentRateByPosition,
    };
}

async function attachInvoiceRelations(invoices: Invoice[]): Promise<Invoice[]> {
    const tenantIds = invoices.map((inv) => inv.tenant_id);
    const roomIds = invoices.map((inv) => inv.room_id);
    const contractIds = invoices.map((inv) => inv.contract_id);
    const [tenantById, roomById, contractById] = await Promise.all([
        fetchByIds<any>('tenants', tenantIds),
        fetchByIds<any>('rooms', roomIds),
        fetchByIds<any>('contracts', contractIds),
    ]);

    return invoices.map((invoice) => ({
        ...invoice,
        tenant: tenantById.get(invoice.tenant_id),
        room: roomById.get(invoice.room_id),
        contract: contractById.get(invoice.contract_id),
    }));
}

export const invoiceService = {
    getLatestInvoiceMonth: async (): Promise<string | null> => {
        const snap = await getDocs(
            query(collection(db, 'invoices'), orderBy('billing_month', 'desc'), limit(1))
        );
        const billingMonth = snap.docs[0]?.data().billing_month;
        return billingMonth ? String(billingMonth).substring(0, 7) : null;
    },

    getInvoices: async (searchTerm?: string, status?: string, month?: string): Promise<Invoice[]> => {
        const constraints = [];
        if (status) constraints.push(where('status', '==', status));

        // Firestore requires the first orderBy to match any range-filtered
        // field, so billing_month takes priority over created_at when a
        // month filter is active. Final display order is re-sorted by room
        // number below regardless, so this only affects fetch order.
        let orderConstraints;
        if (month) {
            const startDate = `${month}-01`;
            const [year, m] = month.split('-').map(Number);
            const endDate = new Date(year, m, 0).toISOString().split('T')[0];
            constraints.push(where('billing_month', '>=', startDate), where('billing_month', '<=', endDate));
            orderConstraints = [orderBy('billing_month', 'desc')];
        } else {
            orderConstraints = [orderBy('created_at', 'desc')];
        }

        const snap = await getDocs(query(collection(db, 'invoices'), ...constraints, ...orderConstraints));
        let invoices = await attachInvoiceRelations(snap.docs.map((d) => withId<Invoice>(d)));

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            invoices = invoices.filter(
                (inv) =>
                    inv.tenant?.full_name.toLowerCase().includes(lowerTerm) ||
                    inv.room?.room_number.toLowerCase().includes(lowerTerm)
            );
        }

        invoices.sort((a, b) => {
            const roomA = a.room?.room_number || '';
            const roomB = b.room?.room_number || '';
            return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
        });

        return invoices;
    },

    getInvoice: async (id: string): Promise<Invoice> => {
        const snap = await getDoc(doc(db, 'invoices', id));
        if (!snap.exists()) throw new Error('Invoice not found');
        const [invoice] = await attachInvoiceRelations([withId<Invoice>(snap as any)]);
        return invoice;
    },

    createInvoice: async (invoice: InvoiceFormData): Promise<Invoice> => {
        const contractSnap = await getDoc(doc(db, 'contracts', invoice.contract_id));
        if (!contractSnap.exists()) throw new Error('Contract not found');
        const contractData = withId<Contract>(contractSnap as any);

        const [room, tenant, { appSettings, rentRateByPosition }] = await Promise.all([
            fetchByIds<any>('rooms', [contractData.room_id]).then((m) => m.get(contractData.room_id)),
            fetchByIds<any>('tenants', [contractData.tenant_id]).then((m) => m.get(contractData.tenant_id)),
            getInvoiceSettings(),
        ]);

        const contract: Contract = { ...contractData, room, tenant };
        const payload = buildInvoicePayload(invoice, contract, appSettings, rentRateByPosition);

        const invoiceRef = doc(collection(db, 'invoices'));
        await setDoc(invoiceRef, { ...payload, created_at: nowIso() });

        // Mirrors the old SQLite UNIQUE(room_id, month) constraint on
        // history_meter, which silently rejected (but never surfaced an
        // error for) a duplicate room+month insert - skip instead of
        // overwriting an existing reading.
        const billingMonth = invoice.billing_month.substring(0, 7);
        const historyRef = doc(db, 'history_meter', historyMeterDocId(contractData.room_id, billingMonth));
        const historySnap = await getDoc(historyRef);
        if (!historySnap.exists()) {
            await setDoc(historyRef, {
                room_id: contractData.room_id,
                month: billingMonth,
                water_meter: invoice.water_meter_current,
                electricity_meter: invoice.electricity_meter_current,
                created_at: nowIso(),
            });
        }

        return { id: invoiceRef.id, ...payload } as unknown as Invoice;
    },

    getMeterReadingsByMonths: async (
        roomIds: string[],
        months: string[]
    ): Promise<Map<string, { water: number; electricity: number }>> => {
        if (roomIds.length === 0 || months.length === 0) return new Map();

        const normalizedMonths = [...new Set(months.map(normalizeMonth))];
        const candidateDocIds = roomIds.flatMap((roomId) =>
            normalizedMonths.map((month) => historyMeterDocId(roomId, month))
        );
        const rows = await fetchByIds<{ room_id: string; month: string; water_meter: number; electricity_meter: number }>(
            'history_meter',
            candidateDocIds
        );

        const result = new Map<string, { water: number; electricity: number }>();
        rows.forEach((row) => {
            result.set(monthKey(row.room_id, row.month), {
                water: row.water_meter || 0,
                electricity: row.electricity_meter || 0,
            });
        });
        return result;
    },

    createInvoicesBulk: async (invoices: BulkInvoiceInput[]): Promise<Invoice[]> => {
        if (invoices.length === 0) return [];

        const { appSettings, rentRateByPosition } = await getInvoiceSettings();
        const invoiceRows = invoices.map((invoice) => ({
            ...buildInvoicePayload(invoice, invoice.contract, appSettings, rentRateByPosition),
            created_at: nowIso(),
        }));

        const batch = writeBatch(db);
        const created: Invoice[] = [];
        invoiceRows.forEach((row) => {
            const ref = doc(collection(db, 'invoices'));
            batch.set(ref, row);
            created.push({ id: ref.id, ...row } as unknown as Invoice);
        });

        invoices.forEach((invoice) => {
            const month = invoice.billing_month.substring(0, 7);
            const ref = doc(db, 'history_meter', historyMeterDocId(invoice.contract.room_id, month));
            batch.set(
                ref,
                {
                    room_id: invoice.contract.room_id,
                    month,
                    water_meter: invoice.water_meter_current || 0,
                    electricity_meter: invoice.electricity_meter_current || 0,
                    updated_at: nowIso(),
                },
                { merge: true }
            );
        });

        await batch.commit();
        return created;
    },

    updateInvoiceStatus: async (id: string, status: string): Promise<void> => {
        await updateDoc(doc(db, 'invoices', id), { status });
    },

    deleteInvoice: async (id: string): Promise<void> => {
        await deleteDoc(doc(db, 'invoices', id));
    },

    deleteAllInvoices: async (ids: string[]): Promise<void> => {
        const chunks: string[][] = [];
        for (let i = 0; i < ids.length; i += 450) chunks.push(ids.slice(i, i + 450));
        for (const chunkIds of chunks) {
            const batch = writeBatch(db);
            chunkIds.forEach((id) => batch.delete(doc(db, 'invoices', id)));
            await batch.commit();
        }
    },

    getLastMeterReading: async (roomId: string): Promise<{ water: number; electricity: number }> => {
        const historySnap = await getDocs(
            query(collection(db, 'history_meter'), where('room_id', '==', roomId), orderBy('month', 'desc'), limit(1))
        );
        if (!historySnap.empty) {
            const data = historySnap.docs[0].data();
            return { water: data.water_meter || 0, electricity: data.electricity_meter || 0 };
        }

        const invoiceSnap = await getDocs(
            query(
                collection(db, 'invoices'),
                where('room_id', '==', roomId),
                orderBy('billing_month', 'desc'),
                limit(20)
            )
        );
        const lastInvoice = invoiceSnap.docs.map((d) => d.data()).find((inv) => inv.status !== 'cancelled');
        if (lastInvoice) {
            return {
                water: lastInvoice.water_meter_current || 0,
                electricity: lastInvoice.electricity_meter_current || 0,
            };
        }

        const roomSnap = await getDoc(doc(db, 'rooms', roomId));
        if (!roomSnap.exists()) return { water: 0, electricity: 0 };
        const room = roomSnap.data();
        return { water: room.current_water_meter || 0, electricity: room.current_electricity_meter || 0 };
    },

    getMeterReadingByMonth: async (roomId: string, monthStr: string): Promise<{ water: number; electricity: number } | null> => {
        const snap = await getDoc(doc(db, 'history_meter', historyMeterDocId(roomId, monthStr)));
        if (!snap.exists()) return null;
        const data = snap.data();
        return { water: data.water_meter, electricity: data.electricity_meter };
    },
};
