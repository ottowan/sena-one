import { pgliteClient } from '../lib/pgliteClient';

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
    // Get room status statistics
    getRoomStatusStats: async (): Promise<RoomStatusStats> => {
        // Fetch rooms directly to count statuses
        const { data: rooms, error: roomError } = await pgliteClient
            .from('rooms')
            .select('status');

        if (roomError) throw roomError;

        const stats = {
            available: 0,
            occupied: 0,
            maintenance: 0,
            reserved: 0
        };

        rooms?.forEach(room => {
            if (stats[room.status as keyof RoomStatusStats] !== undefined) {
                stats[room.status as keyof RoomStatusStats]++;
            }
        });

        return stats;
    },

    // Get revenue stats (last 6 months)
    getRevenueStats: async (): Promise<RevenueStats[]> => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const dateStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

        const { data: invoices, error } = await pgliteClient
            .from('invoices')
            .select('billing_month, total_amount')
            .eq('status', 'paid')
            .gte('billing_month', dateStr);

        if (error) throw error;

        // Group by month
        const revenueMap: Record<string, number> = {};
        invoices?.forEach(inv => {
            const month = inv.billing_month; // YYYY-MM
            revenueMap[month] = (revenueMap[month] || 0) + inv.total_amount;
        });

        // Format for chart
        const stats = Object.entries(revenueMap)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => a.month.localeCompare(b.month));

        return stats;
    },

    // Get detailed financial report
    getFinancialReport: async (month: string, status?: string): Promise<any[]> => {
        let query = pgliteClient
            .from('invoices')
            .select(`
                *,
                room:rooms(room_number),
                tenant:tenants(full_name)
            `)
            .order('room_id');

        // Filter by month using date range (safer for date columns)
        const startDate = `${month}-01`;
        const [year, m] = month.split('-').map(Number);
        const endDate = new Date(year, m, 0).toISOString().split('T')[0]; // Last day of month

        query = query.gte('billing_month', startDate).lte('billing_month', endDate);

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Sort by room number roughly
        const sortedData = data?.sort((a, b) =>
            (a.room?.room_number || '').localeCompare(b.room?.room_number || '', undefined, { numeric: true })
        );

        return sortedData || [];
    },

    // Get utility usage report
    getUtilityReport: async (month: string): Promise<any[]> => {
        // 1. Fetch ALL Rooms (to include Vacant, Maintenance)
        const { data: allRooms, error: roomError } = await pgliteClient
            .from('rooms')
            .select('*')
            .order('room_number');

        if (roomError) throw roomError;

        // 2. Fetch history_meter for SELECTED month
        // We use month string query since column is TEXT YYYY-MM
        const { data: meters, error: meterError } = await pgliteClient
            .from('history_meter')
            .select('*')
            .eq('month', month);

        if (meterError) throw meterError;

        const meterMap = new Map<string, any>(meters?.map(m => [m.room_id, m]));

        // 3. Fetch active contracts to get tenant names
        const { data: contracts } = await pgliteClient
            .from('contracts')
            .select('room_id, tenant:tenants(full_name)')
            .eq('status', 'active');

        const contractMap = new Map<string, string>(contracts?.map(c => [c.room_id, (c.tenant as any)?.full_name]));

        // 4. Fetch PREVIOUS month history (for calc)
        const [y, m] = month.split('-').map(Number);
        let prevY = y;
        let prevM = m - 1;
        if (prevM === 0) {
            prevM = 12;
            prevY -= 1;
        }
        const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
        // Flexible fetch for prev month
        const { data: prevMeters } = await pgliteClient
            .from('history_meter')
            .select('room_id, water_meter, electricity_meter')
            .ilike('month', `${prevMonthStr}%`);

        const prevMap = new Map<string, any>(prevMeters?.map(pm => [pm.room_id, pm]));

        // 5. Combine Data
        const reportData = allRooms.map(room => {
            const meter = meterMap.get(room.id);
            const prev = prevMap.get(room.id);

            // Determine Tenant Name
            let tenantName = '-';
            const activeContractName = contractMap.get(room.id);
            if (activeContractName) {
                tenantName = activeContractName;
            } else {
                if (room.status === 'maintenance') tenantName = 'ห้องชำรุด/ซ่อมบำรุง';
                else if (room.status === 'available') tenantName = 'ห้องว่าง';
                else if (room.status === 'reserved') tenantName = 'จองแล้ว';
                else tenantName = `สถานะ: ${room.status}`;
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

                // If no current meter entered, usage is 0? 
                // Or if we have ONLY prev meter, usage is ... 0?
                water_usage: meter ? Math.max(0, waterCurr - waterPrev) : 0,
                elec_usage: meter ? Math.max(0, elecCurr - elecPrev) : 0
            };
        });

        return reportData.sort((a, b) =>
            a.room.room_number.localeCompare(b.room.room_number, undefined, { numeric: true })
        );
    },


    // Get dashboard statistics
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

        dashboardStatsPromise = (async () => {
            const { data, error } = await pgliteClient.rpc('get_dashboard_stats', {
                current_month_start: currentMonthStart,
                next_month_start: nextMonthStart,
                today: todayStr,
            });

            if (error) throw error;

            const stats: DashboardStats = {
                totalRooms: Number(data?.totalRooms || 0),
                availableRooms: Number(data?.availableRooms || 0),
                occupiedRooms: Number(data?.occupiedRooms || 0),
                maintenanceRooms: Number(data?.maintenanceRooms || 0),
                monthlyRevenue: Number(data?.monthlyRevenue || 0),
                overduePayments: Number(data?.overduePayments || 0),
                activeTenants: Number(data?.activeTenants || 0),
                openMaintenanceRequests: Number(data?.openMaintenanceRequests || 0),
            };

            dashboardStatsCache = {
                data: stats,
                expiresAt: Date.now() + DASHBOARD_STATS_CACHE_MS,
            };

            return stats;
        })();

        try {
            return await dashboardStatsPromise;
        } finally {
            dashboardStatsPromise = null;
        }
    },

    // Get recent activity
    getRecentActivity: async () => {
        // Fetch last 3 paid invoices
        const { data: invoices } = await pgliteClient
            .from('invoices')
            .select(`
                id,
                created_at,
                total_amount,
                room:rooms(room_number),
                tenant:tenants(full_name)
            `)
            .eq('status', 'paid')
            .order('updated_at', { ascending: false }) // Use updated_at for payment time? or created_at
            .limit(3);

        // Fetch last 3 created maintenance requests
        const { data: maintenance } = await pgliteClient
            .from('maintenance_requests')
            .select(`
                id,
                created_at,
                title,
                room:rooms(room_number),
                tenant:tenants(full_name),
                status
            `)
            .order('created_at', { ascending: false })
            .limit(3);

        const activities = [
            ...(invoices?.map(i => {
                const roomNum = Array.isArray(i.room) ? i.room[0]?.room_number : (i.room as any)?.room_number;
                const tenantName = Array.isArray(i.tenant) ? i.tenant[0]?.full_name : (i.tenant as any)?.full_name;
                return {
                    id: i.id,
                    type: 'payment',
                    title: `ชำระเงินห้อง ${roomNum || '-'}`,
                    description: `คุณ${tenantName || '-'} - ฿${i.total_amount.toLocaleString()}`,
                    timestamp: i.created_at
                };
            }) || []),
            ...(maintenance?.map(m => {
                const roomNum = Array.isArray(m.room) ? m.room[0]?.room_number : (m.room as any)?.room_number;
                return {
                    id: m.id,
                    type: 'maintenance',
                    title: 'แจ้งซ่อมใหม่',
                    description: `ห้อง ${roomNum || '-'} - ${m.title}`,
                    timestamp: m.created_at
                };
            }) || [])
        ];

        // Sort combined and take top 5
        return activities
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 5);
    }
};
