import {
    collection,
    getAggregateFromServer,
    getCountFromServer,
    getDocs,
    limit,
    orderBy,
    query,
    sum,
    where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fetchByIds } from '../lib/firestoreUtils';

export interface RoomStatusStats {
    available: number;
    occupied: number;
    maintenance: number;
    reserved: number;
}

export interface RevenueStats {
    month: string;
    amount: number;
}

interface DashboardStats {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    maintenanceRooms: number;
    monthlyRevenue: number;
    overduePayments: number;
    activeTenants: number;
    openMaintenanceRequests: number;
}

const DASHBOARD_STATS_CACHE_MS = 30_000;
let dashboardStatsCache: { data: DashboardStats; expiresAt: number } | null = null;
let dashboardStatsPromise: Promise<DashboardStats> | null = null;

export const reportService = {
    getRoomStatusStats: async (): Promise<RoomStatusStats> => {
        const snap = await getDocs(collection(db, 'rooms'));
        const stats: RoomStatusStats = { available: 0, occupied: 0, maintenance: 0, reserved: 0 };
        snap.forEach((d) => {
            const status = d.data().status as keyof RoomStatusStats;
            if (stats[status] !== undefined) stats[status]++;
        });
        return stats;
    },

    getRevenueStats: async (): Promise<RevenueStats[]> => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const dateStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

        const snap = await getDocs(
            query(
                collection(db, 'invoices'),
                where('status', '==', 'paid'),
                where('billing_month', '>=', dateStr),
                orderBy('billing_month', 'asc')
            )
        );

        const revenueMap: Record<string, number> = {};
        snap.forEach((d) => {
            const data = d.data();
            const month = String(data.billing_month).substring(0, 7);
            revenueMap[month] = (revenueMap[month] || 0) + data.total_amount;
        });

        return Object.entries(revenueMap)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => a.month.localeCompare(b.month));
    },

    getFinancialReport: async (month: string, status?: string): Promise<any[]> => {
        const startDate = `${month}-01`;
        const [year, m] = month.split('-').map(Number);
        const endDate = new Date(year, m, 0).toISOString().split('T')[0];

        const constraints = [where('billing_month', '>=', startDate), where('billing_month', '<=', endDate)];
        if (status) constraints.push(where('status', '==', status));

        const snap = await getDocs(
            query(collection(db, 'invoices'), ...constraints, orderBy('billing_month', 'asc'))
        );
        const invoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);

        const roomIds = invoices.map((inv) => inv.room_id);
        const tenantIds = invoices.map((inv) => inv.tenant_id);
        const [roomById, tenantById] = await Promise.all([
            fetchByIds<any>('rooms', roomIds),
            fetchByIds<any>('tenants', tenantIds),
        ]);

        const withRelations = invoices.map((inv) => ({
            ...inv,
            room: roomById.get(inv.room_id),
            tenant: tenantById.get(inv.tenant_id),
        }));

        return withRelations.sort((a, b) =>
            (a.room?.room_number || '').localeCompare(b.room?.room_number || '', undefined, { numeric: true })
        );
    },

    getUtilityReport: async (month: string): Promise<any[]> => {
        const normalizedMonth = month.length >= 7 ? month.slice(0, 7) : month;

        const [roomsSnap, metersSnap, contractsSnap] = await Promise.all([
            getDocs(query(collection(db, 'rooms'), orderBy('room_number', 'asc'))),
            getDocs(query(collection(db, 'history_meter'), where('month', '==', normalizedMonth))),
            getDocs(query(collection(db, 'contracts'), where('status', '==', 'active'))),
        ]);

        const allRooms = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        const meterMap = new Map<string, any>(metersSnap.docs.map((d) => [d.data().room_id, d.data()]));

        const contracts = contractsSnap.docs.map((d) => d.data() as any);
        const tenantIds = contracts.map((c) => c.tenant_id);
        const tenantById = await fetchByIds<any>('tenants', tenantIds);
        const contractMap = new Map<string, string>(
            contracts.map((c) => [c.room_id, tenantById.get(c.tenant_id)?.full_name])
        );

        const [y, m] = normalizedMonth.split('-').map(Number);
        let prevY = y;
        let prevM = m - 1;
        if (prevM === 0) {
            prevM = 12;
            prevY -= 1;
        }
        const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
        const prevMetersSnap = await getDocs(query(collection(db, 'history_meter'), where('month', '==', prevMonthStr)));
        const prevMap = new Map<string, any>(prevMetersSnap.docs.map((d) => [d.data().room_id, d.data()]));

        const reportData = allRooms.map((room) => {
            const meter = meterMap.get(room.id);
            const prev = prevMap.get(room.id);

            let tenantName = '-';
            const activeContractName = contractMap.get(room.id);
            if (activeContractName) {
                tenantName = activeContractName;
            } else if (room.status === 'maintenance') {
                tenantName = 'ห้องชำรุด/ซ่อมบำรุง';
            } else if (room.status === 'available') {
                tenantName = 'ห้องว่าง';
            } else if (room.status === 'reserved') {
                tenantName = 'จองแล้ว';
            } else {
                tenantName = `สถานะ: ${room.status}`;
            }

            const waterCurr = meter?.water_meter || 0;
            const elecCurr = meter?.electricity_meter || 0;
            const waterPrev = prev?.water_meter || 0;
            const elecPrev = prev?.electricity_meter || 0;

            return {
                room_id: room.id,
                room: { room_number: room.room_number },
                tenant_name: tenantName,
                water_meter: waterCurr,
                electricity_meter: elecCurr,
                water_prev: waterPrev,
                elec_prev: elecPrev,
                water_usage: meter ? Math.max(0, waterCurr - waterPrev) : 0,
                elec_usage: meter ? Math.max(0, elecCurr - elecPrev) : 0,
            };
        });

        return reportData.sort((a, b) =>
            a.room.room_number.localeCompare(b.room.room_number, undefined, { numeric: true })
        );
    },

    getDashboardStats: async (options?: { forceRefresh?: boolean }): Promise<DashboardStats> => {
        if (!options?.forceRefresh && dashboardStatsCache && dashboardStatsCache.expiresAt > Date.now()) {
            return dashboardStatsCache.data;
        }
        if (!options?.forceRefresh && dashboardStatsPromise) {
            return dashboardStatsPromise;
        }

        const today = new Date();
        const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);
        const todayStr = today.toISOString().slice(0, 10);

        const roomsRef = collection(db, 'rooms');
        const invoicesRef = collection(db, 'invoices');

        dashboardStatsPromise = (async () => {
            const [
                totalRoomsSnap,
                availableRoomsSnap,
                occupiedRoomsSnap,
                maintenanceRoomsSnap,
                monthlyRevenueSnap,
                overduePaymentsSnap,
                activeTenantsSnap,
                openMaintenanceSnap,
            ] = await Promise.all([
                getCountFromServer(roomsRef),
                getCountFromServer(query(roomsRef, where('status', '==', 'available'))),
                getCountFromServer(query(roomsRef, where('status', '==', 'occupied'))),
                getCountFromServer(query(roomsRef, where('status', '==', 'maintenance'))),
                getAggregateFromServer(
                    query(
                        invoicesRef,
                        where('status', '==', 'paid'),
                        where('billing_month', '>=', currentMonthStart),
                        where('billing_month', '<', nextMonthStart)
                    ),
                    { total: sum('total_amount') }
                ),
                getCountFromServer(
                    query(invoicesRef, where('status', '==', 'pending'), where('due_date', '<', todayStr))
                ),
                getCountFromServer(query(collection(db, 'contracts'), where('status', '==', 'active'))),
                getCountFromServer(
                    query(collection(db, 'maintenance_requests'), where('status', '==', 'pending'))
                ),
            ]);

            const stats: DashboardStats = {
                totalRooms: totalRoomsSnap.data().count,
                availableRooms: availableRoomsSnap.data().count,
                occupiedRooms: occupiedRoomsSnap.data().count,
                maintenanceRooms: maintenanceRoomsSnap.data().count,
                monthlyRevenue: Number(monthlyRevenueSnap.data().total || 0),
                overduePayments: overduePaymentsSnap.data().count,
                activeTenants: activeTenantsSnap.data().count,
                openMaintenanceRequests: openMaintenanceSnap.data().count,
            };

            dashboardStatsCache = { data: stats, expiresAt: Date.now() + DASHBOARD_STATS_CACHE_MS };
            return stats;
        })();

        try {
            return await dashboardStatsPromise;
        } finally {
            dashboardStatsPromise = null;
        }
    },

    getRecentActivity: async () => {
        const [invoicesSnap, maintenanceSnap] = await Promise.all([
            getDocs(
                query(collection(db, 'invoices'), where('status', '==', 'paid'), orderBy('updated_at', 'desc'), limit(3))
            ),
            getDocs(query(collection(db, 'maintenance_requests'), orderBy('created_at', 'desc'), limit(3))),
        ]);

        const invoices = invoicesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        const maintenance = maintenanceSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);

        const [roomByInvoice, tenantByInvoice, roomByMaintenance] = await Promise.all([
            fetchByIds<any>('rooms', invoices.map((i) => i.room_id)),
            fetchByIds<any>('tenants', invoices.map((i) => i.tenant_id)),
            fetchByIds<any>('rooms', maintenance.map((m) => m.room_id)),
        ]);

        const activities = [
            ...invoices.map((i) => ({
                id: i.id,
                type: 'payment',
                title: `ชำระเงินห้อง ${roomByInvoice.get(i.room_id)?.room_number || '-'}`,
                description: `คุณ${tenantByInvoice.get(i.tenant_id)?.full_name || '-'} - ฿${Number(i.total_amount).toLocaleString()}`,
                timestamp: i.created_at,
            })),
            ...maintenance.map((m) => ({
                id: m.id,
                type: 'maintenance',
                title: 'แจ้งซ่อมใหม่',
                description: `ห้อง ${roomByMaintenance.get(m.room_id)?.room_number || '-'} - ${m.title}`,
                timestamp: m.created_at,
            })),
        ];

        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    },
};
