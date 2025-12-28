import { supabase } from '../lib/supabase';

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

export const reportService = {
    // Get room status statistics
    getRoomStatusStats: async (): Promise<RoomStatusStats> => {
        // Fetch rooms directly to count statuses
        const { data: rooms, error: roomError } = await supabase
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

        const { data: invoices, error } = await supabase
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
        let query = supabase
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
        // We can fetch from history_meter regarding the month
        // Join with room and tenant (via active contract?)
        // history_meter has room_id.
        // We need tenant info. Tenant info is in contracts.
        // Complex join. easier to fetch history_meter and then map rooms/tenants.

        // 1. Fetch history_meter for the month
        const { data: meters, error: meterError } = await supabase
            .from('history_meter')
            .select(`
                *,
                room:rooms(room_number)
            `)
            .eq('month', month);

        if (meterError) throw meterError;

        // 2. Fetch active contracts to get tenant names for these rooms
        // This might be imperfect if tenant moved out mid-month, but good enough for now.
        const { data: contracts } = await supabase
            .from('contracts')
            .select('room_id, tenant:tenants(full_name)')
            .eq('status', 'active');

        const contractMap = new Map(contracts?.map(c => [c.room_id, (c.tenant as any)?.full_name]));

        const reportData = meters?.map(m => ({
            ...m,
            tenant_name: contractMap.get(m.room_id) || '-',
            // Calculate usage? history_meter only stores current reading. 
            // We need previous reading to calc usage.
            // Or we just report the readings. 
            // Usually report wants usage.
            // We'd need to fetch PREVIOUS month's history too.
        }));

        // Fetch prev month
        const [y, m] = month.split('-').map(Number);
        const prevDate = new Date(y, m - 2, 1);
        const prevMonthStr = prevDate.toISOString().slice(0, 7);

        const { data: prevMeters } = await supabase
            .from('history_meter')
            .select('room_id, water_meter, electricity_meter')
            .eq('month', prevMonthStr);

        const prevMap = new Map(prevMeters?.map(pm => [pm.room_id, pm]));

        const finalData = reportData?.map(item => {
            const prev = prevMap.get(item.room_id);
            return {
                ...item,
                water_prev: prev?.water_meter || 0,
                elec_prev: prev?.electricity_meter || 0,
                water_usage: Math.max(0, item.water_meter - (prev?.water_meter || 0)),
                elec_usage: Math.max(0, item.electricity_meter - (prev?.electricity_meter || 0))
            };
        });

        return finalData?.sort((a, b) =>
            (a.room?.room_number || '').localeCompare(b.room?.room_number || '', undefined, { numeric: true })
        ) || [];
    },


    // Get dashboard statistics
    getDashboardStats: async () => {
        const today = new Date();
        const currentMonthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);

        // 1. Room Stats (Available vs Total)
        const { data: rooms } = await supabase.from('rooms').select('status');
        const totalRooms = rooms?.length || 0;
        const availableRooms = rooms?.filter(r => r.status === 'available').length || 0;
        const occupiedRooms = rooms?.filter(r => r.status === 'occupied').length || 0;

        // 2. Revenue (Paid Invoices in Current Month)
        const { data: paidInvoices } = await supabase
            .from('invoices')
            .select('total_amount')
            .eq('status', 'paid')
            .gte('billing_month', currentMonthStart)
            .lt('billing_month', nextMonthStart);

        const monthlyRevenue = paidInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;

        // 3. Overdue Payments (Pending and Due Date < Today)
        const todayStr = today.toISOString().slice(0, 10);
        const { count: overdueCount } = await supabase
            .from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .lt('due_date', todayStr);

        // 4. Active Tenants
        const { count: activeTenants } = await supabase
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // 5. Open Maintenance Requests
        const { count: openMaintenance } = await supabase
            .from('maintenance_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        return {
            totalRooms,
            availableRooms,
            occupiedRooms,
            monthlyRevenue,
            overduePayments: overdueCount || 0,
            activeTenants: activeTenants || 0,
            openMaintenanceRequests: openMaintenance || 0
        };
    },

    // Get recent activity
    getRecentActivity: async () => {
        // Fetch last 3 paid invoices
        const { data: invoices } = await supabase
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
        const { data: maintenance } = await supabase
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
